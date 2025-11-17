import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Secret for signing unsubscribe tokens
const UNSUBSCRIBE_SECRET = process.env.UNSUBSCRIBE_SECRET || 'default-secret-change-in-production';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

interface UnsubscribeToken {
  prospectId: string;
  campaignId: string;
  email: string;
  timestamp: number;
}

export class UnsubscribeManager {
  /**
   * Generate a signed unsubscribe token
   */
  static generateToken(prospectId: string, campaignId: string, email: string): string {
    const payload: UnsubscribeToken = {
      prospectId,
      campaignId,
      email,
      timestamp: Date.now(),
    };

    const payloadStr = JSON.stringify(payload);
    const payloadBase64 = Buffer.from(payloadStr).toString('base64url');
    
    // Create HMAC signature
    const signature = crypto
      .createHmac('sha256', UNSUBSCRIBE_SECRET)
      .update(payloadBase64)
      .digest('base64url');

    return `${payloadBase64}.${signature}`;
  }

  /**
   * Verify and decode an unsubscribe token
   */
  static verifyToken(token: string): UnsubscribeToken | null {
    try {
      const [payloadBase64, signature] = token.split('.');
      
      if (!payloadBase64 || !signature) {
        return null;
      }

      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', UNSUBSCRIBE_SECRET)
        .update(payloadBase64)
        .digest('base64url');

      if (signature !== expectedSignature) {
        console.error('Invalid token signature');
        return null;
      }

      // Decode payload
      const payloadStr = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
      const payload: UnsubscribeToken = JSON.parse(payloadStr);

      // Check token age (30 days max)
      const tokenAge = Date.now() - payload.timestamp;
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

      if (tokenAge > maxAge) {
        console.error('Token expired');
        return null;
      }

      return payload;
    } catch (error) {
      console.error('Error verifying token:', error);
      return null;
    }
  }

  /**
   * Generate unsubscribe URL for email
   */
  static generateUnsubscribeUrl(prospectId: string, campaignId: string, email: string): string {
    const token = this.generateToken(prospectId, campaignId, email);
    return `${APP_URL}/unsubscribe?token=${token}`;
  }

  /**
   * Add email to suppression list
   */
  static async addToSuppressionList(
    email: string,
    reason: string = 'User requested unsubscribe',
    source: 'unsubscribe' | 'bounce' | 'spam_complaint' | 'manual' = 'unsubscribe',
    metadata: Record<string, any> = {}
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('suppression_list')
        .insert({
          email: email.toLowerCase(),
          reason,
          source,
          metadata,
        });

      if (error) {
        // If duplicate, it's already suppressed - that's fine
        if (error.code === '23505') {
          return { success: true };
        }
        console.error('Error adding to suppression list:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error adding to suppression list:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Check if email is suppressed
   */
  static async isSuppressed(email: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('suppression_list')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "not found" - that's fine
        console.error('Error checking suppression list:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking suppression list:', error);
      return false;
    }
  }

  /**
   * Process unsubscribe request
   */
  static async processUnsubscribe(token: string): Promise<{
    success: boolean;
    email?: string;
    error?: string;
  }> {
    // Verify token
    const payload = this.verifyToken(token);
    if (!payload) {
      return { success: false, error: 'Invalid or expired token' };
    }

    const { prospectId, campaignId, email } = payload;

    try {
      // Update prospect status
      const { error: prospectError } = await supabase
        .from('prospects')
        .update({ status: 'unsubscribed' })
        .eq('id', prospectId);

      if (prospectError) {
        console.error('Error updating prospect:', prospectError);
      }

      // Add to suppression list
      const result = await this.addToSuppressionList(
        email,
        'User clicked unsubscribe link',
        'unsubscribe',
        { prospectId, campaignId, timestamp: new Date().toISOString() }
      );

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true, email };
    } catch (error) {
      console.error('Error processing unsubscribe:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Add unsubscribe link to email HTML
   */
  static addUnsubscribeLink(html: string, prospectId: string, campaignId: string, email: string): string {
    const unsubscribeUrl = this.generateUnsubscribeUrl(prospectId, campaignId, email);
    
    const footer = `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; font-family: Arial, sans-serif;">
        <p style="margin: 5px 0;">You received this email because you're on our contact list.</p>
        <p style="margin: 5px 0;">
          <a href="${unsubscribeUrl}" style="color: #666; text-decoration: underline;">Unsubscribe</a>
        </p>
      </div>
    `;

    // Try to insert before closing body tag, otherwise append
    if (html.includes('</body>')) {
      return html.replace('</body>', `${footer}</body>`);
    } else {
      return html + footer;
    }
  }

  /**
   * Get suppression list stats
   */
  static async getStats(): Promise<{
    total: number;
    bySource: Record<string, number>;
  }> {
    try {
      const { data, error } = await supabase
        .from('suppression_list')
        .select('source');

      if (error) {
        console.error('Error getting suppression stats:', error);
        return { total: 0, bySource: {} };
      }

      const bySource: Record<string, number> = {};
      data.forEach((item) => {
        const source = item.source || 'unknown';
        bySource[source] = (bySource[source] || 0) + 1;
      });

      return {
        total: data.length,
        bySource,
      };
    } catch (error) {
      console.error('Error getting suppression stats:', error);
      return { total: 0, bySource: {} };
    }
  }
}
