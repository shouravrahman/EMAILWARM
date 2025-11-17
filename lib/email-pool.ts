import { createClient } from '@/utils/supabase/server';
import { getAIService } from './ai-service';
import { EmailService } from './email-service';

export interface WarmupPool {
  id: string;
  name: string;
  emails: string[];
  domains: string[];
  reputation_score: number;
  last_activity: string;
  status: 'active' | 'inactive' | 'maintenance';
}

export interface WarmupConversation {
  id: string;
  sender_email: string;
  recipient_email: string;
  conversation_thread: Array<{
    message_id: string;
    subject: string;
    body: string;
    timestamp: string;
    direction: 'sent' | 'received';
    engagement_score: number;
  }>;
  relationship_strength: number;
  last_interaction: string;
  status: 'active' | 'completed' | 'paused';
}

export class WarmupPoolManager {
  private static instance: WarmupPoolManager;
  private pools: Map<string, WarmupPool> = new Map();
  private conversations: Map<string, WarmupConversation> = new Map();

  static getInstance(): WarmupPoolManager {
    if (!WarmupPoolManager.instance) {
      WarmupPoolManager.instance = new WarmupPoolManager();
    }
    return WarmupPoolManager.instance;
  }

  async initializePools(): Promise<void> {
    try {
      const supabase = await createClient();
      // Load existing warmup pools
      const { data: pools, error } = await supabase
        .from('warmup_pools')
        .select('*')
        .eq('status', 'active');

      if (error) throw error;

      // If no pools exist, create default ones using real emails from database
      if (!pools || pools.length === 0) {
        await this.createDefaultPools();
      } else {
        pools.forEach(pool => {
          this.pools.set(pool.id, pool);
        });
      }

      // Load active conversations
      await this.loadActiveConversations();
    } catch (error) {
      console.error('Error initializing warmup pools:', error);
      throw error;
    }
  }

  private async createDefaultPools(): Promise<void> {
    const supabase = await createClient();
    
    // Fetch real emails from warmup_email_pool
    const { data: poolEmails, error: emailError } = await supabase
      .from('warmup_email_pool')
      .select('email_address')
      .eq('status', 'active')
      .eq('mx_verified', true);

    if (emailError) throw emailError;

    const emails = poolEmails?.map(e => e.email_address) || [];
    
    // Extract unique domains from emails
    const domains = [...new Set(emails.map(email => email.split('@')[1]))];

    const defaultPools = [
      {
        name: 'Primary Warmup Pool',
        emails: emails,
        domains: domains,
        reputation_score: 85,
        status: 'active'
      }
    ];

    for (const poolData of defaultPools) {
      const { data, error } = await supabase
        .from('warmup_pools')
        .insert([poolData])
        .select()
        .single();

      if (error) throw error;
      this.pools.set(data.id, data);
    }
  }

  /**
   * Get available warmup emails from database with rotation logic
   */
  private async getAvailableWarmupEmails(): Promise<string[]> {
    const supabase = await createClient();
    
    // Fetch active, verified emails with low bounce rates
    const { data: emails, error } = await supabase
      .from('warmup_email_pool')
      .select('email_address, usage_count, last_used_at')
      .eq('status', 'active')
      .eq('mx_verified', true)
      .lt('bounce_rate', 10) // Only use emails with bounce rate < 10%
      .order('usage_count', { ascending: true }) // Prioritize less-used emails
      .order('last_used_at', { ascending: true, nullsFirst: true }); // Then by least recently used

    if (error) throw error;

    return emails?.map(e => e.email_address) || [];
  }

  async getOptimalRecipient(senderEmail: string, campaignType: string): Promise<string> {
    try {
      // Find recipient from appropriate pool
      const availablePools = Array.from(this.pools.values()).filter(pool =>
        pool.status === 'active' && pool.reputation_score > 80
      );

      if (availablePools.length === 0) {
        throw new Error('No active warmup pools available');
      }

      // Select pool based on campaign type
      const selectedPool = this.selectPoolByCampaignType(availablePools, campaignType);

      // Get recipient that hasn't been contacted recently
      const recipient = await this.selectOptimalRecipient(senderEmail, selectedPool);

      return recipient;
    } catch (error) {
      console.error('Error getting optimal recipient:', error);
      throw error;
    }
  }

  private selectPoolByCampaignType(pools: WarmupPool[], campaignType: string): WarmupPool {
    // Prefer pools based on campaign type
    const poolPreferences = {
      'business': ['Business Network Pool'],
      'tech': ['Tech Industry Pool'],
      'marketing': ['Marketing Pool']
    };

    const preferredNames = poolPreferences[campaignType as keyof typeof poolPreferences] || [];

    for (const name of preferredNames) {
      const pool = pools.find(p => p.name === name);
      if (pool) return pool;
    }

    // Fallback to highest reputation pool
    return pools.reduce((best, current) =>
      current.reputation_score > best.reputation_score ? current : best
    );
  }

  private async selectOptimalRecipient(senderEmail: string, pool: WarmupPool): Promise<string> {
    const supabase = await createClient();
    
    // Get available warmup emails from database with rotation logic
    const availableEmails = await this.getAvailableWarmupEmails();
    
    if (availableEmails.length === 0) {
      throw new Error('No available warmup emails in pool');
    }

    // Get recent conversations to avoid over-contacting
    const { data: recentLogs, error } = await supabase
      .from('email_logs')
      .select('recipient, sent_at')
      .eq('email_id', senderEmail)
      .gte('sent_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    const recentRecipients = new Set(recentLogs?.map(log => log.recipient) || []);

    // Filter out recently contacted emails
    const filteredEmails = availableEmails.filter(email => !recentRecipients.has(email));

    // Select email (prefer filtered, fallback to least recently used)
    const selectedEmail = filteredEmails.length > 0 
      ? filteredEmails[0] // Already sorted by usage_count and last_used_at
      : availableEmails[0];

    // Update usage tracking
    await this.updateEmailUsage(selectedEmail);

    return selectedEmail;
  }

  /**
   * Update email usage count and last used timestamp
   */
  private async updateEmailUsage(email: string): Promise<void> {
    const supabase = await createClient();
    
    // Get current usage count
    const { data: currentData, error: fetchError } = await supabase
      .from('warmup_email_pool')
      .select('usage_count')
      .eq('email_address', email)
      .single();

    if (fetchError) {
      console.error('Error fetching email usage:', fetchError);
      return;
    }

    // Increment usage count
    const { error } = await supabase
      .from('warmup_email_pool')
      .update({
        usage_count: (currentData?.usage_count || 0) + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('email_address', email);

    if (error) {
      console.error('Error updating email usage:', error);
    }
  }

  async createConversation(senderEmail: string, recipientEmail: string): Promise<WarmupConversation> {
    const conversation: WarmupConversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sender_email: senderEmail,
      recipient_email: recipientEmail,
      conversation_thread: [],
      relationship_strength: 0,
      last_interaction: new Date().toISOString(),
      status: 'active'
    };

    this.conversations.set(conversation.id, conversation);

    // Store in database
    const supabase = await createClient();
    const { error } = await supabase
      .from('warmup_conversations')
      .insert([{
        id: conversation.id,
        sender_email: senderEmail,
        recipient_email: recipientEmail,
        conversation_data: conversation,
        status: 'active'
      }]);

    if (error) throw error;

    return conversation;
  }

  async generateConversationEmail(
    conversationId: string,
    emailType: string = 'follow_up'
  ): Promise<{ subject: string; body: string; confidence: number }> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const aiService = getAIService();

    const emailRequest = {
      type: emailType as any,
      context: {
        senderName: conversation.sender_email.split('@')[0],
        senderEmail: conversation.sender_email,
        recipientName: conversation.recipient_email.split('@')[0],
        recipientEmail: conversation.recipient_email,
        previousEmails: conversation.conversation_thread,
        relationship: this.getRelationshipLevel(conversation.relationship_strength),
        tone: 'professional' as const
      }
    };

    const response = await aiService.generateContextualEmail(emailRequest);

    // Add to conversation thread
    conversation.conversation_thread.push({
      message_id: `msg_${Date.now()}`,
      subject: response.subject,
      body: response.body,
      timestamp: new Date().toISOString(),
      direction: 'sent',
      engagement_score: response.confidence * 100
    });

    // Update relationship strength
    conversation.relationship_strength = Math.min(100, conversation.relationship_strength + 10);
    conversation.last_interaction = new Date().toISOString();

    // Update in database
    const supabase = await createClient();
    const { error: updateError } = await supabase
      .from('warmup_conversations')
      .update({
        conversation_data: conversation,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    if (updateError) throw updateError;

    return {
      subject: response.subject,
      body: response.body,
      confidence: response.confidence
    };
  }

  private getRelationshipLevel(strength: number): 'cold' | 'warm' | 'existing' {
    if (strength < 30) return 'cold';
    if (strength < 70) return 'warm';
    return 'existing';
  }

  private async loadActiveConversations(): Promise<void> {
    try {
      const supabase = await createClient();
      const { data: conversations, error } = await supabase
        .from('warmup_conversations')
        .select('*')
        .eq('status', 'active')
        .limit(100);

      if (error) throw error;

      conversations?.forEach(conv => {
        this.conversations.set(conv.id, conv.conversation_data);
      });
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  }

  /**
   * Track bounce for a warmup email and auto-disable if bounce rate is too high
   */
  async trackBounce(email: string, bounceReason?: string): Promise<void> {
    const supabase = await createClient();
    
    try {
      // Get current email stats
      const { data: emailData, error: fetchError } = await supabase
        .from('warmup_email_pool')
        .select('usage_count, bounce_count')
        .eq('email_address', email)
        .single();

      if (fetchError || !emailData) {
        console.error('Email not found in warmup pool:', email);
        return;
      }

      const newBounceCount = emailData.bounce_count + 1;
      const usageCount = emailData.usage_count || 1;
      const newBounceRate = (newBounceCount / usageCount) * 100;

      // Update bounce tracking
      const updateData: any = {
        bounce_count: newBounceCount,
        bounce_rate: newBounceRate
      };

      // Auto-disable if bounce rate exceeds 10%
      if (newBounceRate > 10) {
        updateData.status = 'inactive';
        console.warn(`Auto-disabling warmup email ${email} due to high bounce rate: ${newBounceRate.toFixed(1)}%`);
      }

      const { error: updateError } = await supabase
        .from('warmup_email_pool')
        .update(updateData)
        .eq('email_address', email);

      if (updateError) throw updateError;

    } catch (error) {
      console.error('Error tracking bounce for warmup email:', error);
    }
  }

  /**
   * Get statistics about warmup pool emails
   */
  async getPoolStatistics(): Promise<{
    totalPools: number;
    totalEmails: number;
    averageReputation: number;
    activeConversations: number;
    verifiedEmails: number;
    activeEmails: number;
  }> {
    const supabase = await createClient();
    
    // Get email pool stats
    const { data: emailStats, error } = await supabase
      .from('warmup_email_pool')
      .select('status, mx_verified');

    const pools = Array.from(this.pools.values());
    const totalEmails = emailStats?.length || 0;
    const verifiedEmails = emailStats?.filter(e => e.mx_verified).length || 0;
    const activeEmails = emailStats?.filter(e => e.status === 'active').length || 0;
    const averageReputation = pools.length > 0
      ? pools.reduce((sum, pool) => sum + pool.reputation_score, 0) / pools.length
      : 0;

    return {
      totalPools: pools.length,
      totalEmails,
      averageReputation: Math.round(averageReputation),
      activeConversations: this.conversations.size,
      verifiedEmails,
      activeEmails
    };
  }
}

// Initialize pool manager
export const warmupPoolManager = WarmupPoolManager.getInstance();
