import { supabase } from './supabase';
import { EmailSender, SMTPConfig } from './email-sender';

export interface QueueItem {
  id: string;
  campaign_id: string;
  email_account_id: string;
  recipient: string;
  subject: string;
  body: string;
  html_body?: string;
  priority: number;
  attempts: number;
  max_attempts: number;
  scheduled_for: string;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  error_message?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface ProcessResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

export interface QueueStats {
  pending: number;
  processing: number;
  sent: number;
  failed: number;
  total: number;
}

export class EmailQueue {
  /**
   * Add email to queue
   */
  static async enqueue(item: {
    campaignId: string;
    emailAccountId: string;
    recipient: string;
    subject: string;
    body: string;
    htmlBody?: string;
    priority?: number;
    scheduledFor?: Date;
    metadata?: Record<string, any>;
  }): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('email_queue')
        .insert([
          {
            campaign_id: item.campaignId,
            email_account_id: item.emailAccountId,
            recipient: item.recipient,
            subject: item.subject,
            body: item.body,
            html_body: item.htmlBody,
            priority: item.priority || 0,
            scheduled_for: item.scheduledFor?.toISOString() || new Date().toISOString(),
            metadata: item.metadata || {},
          },
        ])
        .select('id')
        .single();

      if (error) {
        console.error('Error enqueueing email:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Error enqueueing email:', error);
      return null;
    }
  }

  /**
   * Process next batch of emails (respects rate limits)
   */
  static async processBatch(batchSize: number = 50): Promise<ProcessResult> {
    const result: ProcessResult = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [],
    };

    try {
      // Fetch pending emails
      const { data: queueItems, error: fetchError } = await supabase
        .from('email_queue')
        .select('*')
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString())
        .order('priority', { ascending: false })
        .order('scheduled_for', { ascending: true })
        .limit(batchSize);

      if (fetchError) {
        console.error('Error fetching queue items:', fetchError);
        return result;
      }

      if (!queueItems || queueItems.length === 0) {
        return result;
      }

      // Group by email account to respect rate limits
      const itemsByAccount = this.groupByEmailAccount(queueItems);

      // Process each account's emails
      for (const [emailAccountId, items] of Object.entries(itemsByAccount)) {
        // Check rate limit for this account
        const canSend = await this.checkRateLimit(emailAccountId, items.length);
        
        if (!canSend.allowed) {
          console.log(`Rate limit reached for account ${emailAccountId}. Can send ${canSend.remaining} more today.`);
          // Only process what we can send
          const itemsToProcess = items.slice(0, canSend.remaining);
          
          for (const item of itemsToProcess) {
            await this.processQueueItem(item, result);
          }
        } else {
          // Process all items for this account
          for (const item of items) {
            await this.processQueueItem(item, result);
          }
        }
      }

      return result;
    } catch (error) {
      console.error('Error processing batch:', error);
      return result;
    }
  }

  /**
   * Process a single queue item
   */
  private static async processQueueItem(item: QueueItem, result: ProcessResult): Promise<void> {
    result.processed++;

    try {
      // Mark as processing
      await supabase
        .from('email_queue')
        .update({ status: 'processing' })
        .eq('id', item.id);

      // Get SMTP config
      const smtpConfig = await EmailSender.getSMTPConfig(item.email_account_id);
      
      if (!smtpConfig) {
        throw new Error('SMTP configuration not found');
      }

      // Get sender email address
      const { data: emailAccount } = await supabase
        .from('connected_emails')
        .select('email_address')
        .eq('id', item.email_account_id)
        .single();

      if (!emailAccount) {
        throw new Error('Email account not found');
      }

      // Send email
      const sendResult = await EmailSender.sendEmail({
        to: item.recipient,
        from: emailAccount.email_address,
        subject: item.subject,
        html: item.html_body || item.body,
        text: item.body,
        smtpConfig,
        campaignId: item.campaign_id,
        emailAccountId: item.email_account_id,
        prospectId: item.metadata?.prospect_id,
      });

      if (sendResult.success) {
        // Mark as sent
        await supabase
          .from('email_queue')
          .update({ 
            status: 'sent',
            metadata: {
              ...item.metadata,
              message_id: sendResult.messageId,
              sent_at: new Date().toISOString(),
            }
          })
          .eq('id', item.id);

        // Log email send
        await this.logEmailSend(item, sendResult.messageId!);

        result.succeeded++;
      } else {
        // Handle failure
        const shouldRetry = sendResult.error?.isTemporary && item.attempts < item.max_attempts;

        if (shouldRetry) {
          // Schedule retry with exponential backoff
          const retryDelay = this.calculateRetryDelay(item.attempts);
          const nextAttempt = new Date(Date.now() + retryDelay);

          await supabase
            .from('email_queue')
            .update({
              status: 'pending',
              attempts: item.attempts + 1,
              scheduled_for: nextAttempt.toISOString(),
              error_message: sendResult.error?.message,
            })
            .eq('id', item.id);
        } else {
          // Mark as failed
          await supabase
            .from('email_queue')
            .update({
              status: 'failed',
              attempts: item.attempts + 1,
              error_message: sendResult.error?.message,
            })
            .eq('id', item.id);

          result.failed++;
          result.errors.push({
            id: item.id,
            error: sendResult.error?.message || 'Unknown error',
          });
        }
      }
    } catch (error: any) {
      console.error(`Error processing queue item ${item.id}:`, error);

      // Mark as failed
      await supabase
        .from('email_queue')
        .update({
          status: 'failed',
          attempts: item.attempts + 1,
          error_message: error.message || 'Unknown error',
        })
        .eq('id', item.id);

      result.failed++;
      result.errors.push({
        id: item.id,
        error: error.message || 'Unknown error',
      });
    }
  }

  /**
   * Log email send to email_logs table
   */
  private static async logEmailSend(item: QueueItem, messageId: string): Promise<void> {
    try {
      await supabase.from('email_logs').insert([
        {
          campaign_id: item.campaign_id,
          email_id: item.email_account_id,
          message_id: messageId,
          subject: item.subject,
          recipient: item.recipient,
          status: 'sent',
          sent_at: new Date().toISOString(),
          metadata: item.metadata,
          prospect_id: item.metadata?.prospect_id,
        },
      ]);
    } catch (error) {
      console.error('Error logging email send:', error);
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   * Attempt 1: 1 minute
   * Attempt 2: 5 minutes
   * Attempt 3: 15 minutes
   */
  private static calculateRetryDelay(attempts: number): number {
    const delays = [
      1 * 60 * 1000,      // 1 minute
      5 * 60 * 1000,      // 5 minutes
      15 * 60 * 1000,     // 15 minutes
    ];

    return delays[Math.min(attempts, delays.length - 1)];
  }

  /**
   * Group queue items by email account
   */
  private static groupByEmailAccount(items: QueueItem[]): Record<string, QueueItem[]> {
    return items.reduce((acc, item) => {
      if (!acc[item.email_account_id]) {
        acc[item.email_account_id] = [];
      }
      acc[item.email_account_id].push(item);
      return acc;
    }, {} as Record<string, QueueItem[]>);
  }

  /**
   * Check rate limit for email account
   */
  private static async checkRateLimit(
    emailAccountId: string,
    requestedCount: number
  ): Promise<{ allowed: boolean; remaining: number }> {
    try {
      // Get email account provider
      const { data: emailAccount } = await supabase
        .from('connected_emails')
        .select('provider')
        .eq('id', emailAccountId)
        .single();

      if (!emailAccount) {
        return { allowed: false, remaining: 0 };
      }

      // Get provider limits
      const limits: Record<string, number> = {
        gmail: 500,
        outlook: 300,
        office365: 300,
        default: 100,
      };

      const dailyLimit = limits[emailAccount.provider.toLowerCase()] || limits.default;

      // Count emails sent today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('email_logs')
        .select('*', { count: 'exact', head: true })
        .eq('email_id', emailAccountId)
        .gte('sent_at', today.toISOString());

      const sentToday = count || 0;
      const remaining = Math.max(0, dailyLimit - sentToday);

      return {
        allowed: remaining >= requestedCount,
        remaining,
      };
    } catch (error) {
      console.error('Error checking rate limit:', error);
      return { allowed: false, remaining: 0 };
    }
  }

  /**
   * Retry failed emails
   */
  static async retryFailed(): Promise<void> {
    try {
      // Reset failed items that haven't exceeded max attempts
      const { error } = await supabase
        .from('email_queue')
        .update({
          status: 'pending',
          scheduled_for: new Date().toISOString(),
        })
        .eq('status', 'failed')
        .lt('attempts', 3);

      if (error) {
        console.error('Error retrying failed emails:', error);
      }
    } catch (error) {
      console.error('Error retrying failed emails:', error);
    }
  }

  /**
   * Get queue stats
   */
  static async getStats(): Promise<QueueStats> {
    try {
      const { data, error } = await supabase
        .from('email_queue')
        .select('status');

      if (error) {
        console.error('Error fetching queue stats:', error);
        return { pending: 0, processing: 0, sent: 0, failed: 0, total: 0 };
      }

      const stats = data.reduce(
        (acc, item) => {
          acc[item.status]++;
          acc.total++;
          return acc;
        },
        { pending: 0, processing: 0, sent: 0, failed: 0, total: 0 }
      );

      return stats;
    } catch (error) {
      console.error('Error fetching queue stats:', error);
      return { pending: 0, processing: 0, sent: 0, failed: 0, total: 0 };
    }
  }

  /**
   * Clean up old queue items (older than 7 days)
   */
  static async cleanup(): Promise<void> {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      await supabase
        .from('email_queue')
        .delete()
        .in('status', ['sent', 'failed'])
        .lt('created_at', sevenDaysAgo.toISOString());
    } catch (error) {
      console.error('Error cleaning up queue:', error);
    }
  }
}
