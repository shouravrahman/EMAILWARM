import { supabase } from './supabase';
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
      // Load existing pools from database
      const { data: pools, error } = await supabase
        .from('warmup_pools')
        .select('*')
        .eq('status', 'active');

      if (error) throw error;

      // If no pools exist, create default ones
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
    const defaultPools = [
      {
        name: 'Business Network Pool',
        emails: this.generatePoolEmails('business', 50),
        domains: ['biznetwork.com', 'profconnect.net', 'businesshub.org'],
        reputation_score: 85,
        status: 'active'
      },
      {
        name: 'Tech Industry Pool',
        emails: this.generatePoolEmails('tech', 40),
        domains: ['techpool.io', 'devnetwork.com', 'innovators.tech'],
        reputation_score: 90,
        status: 'active'
      },
      {
        name: 'Marketing Pool',
        emails: this.generatePoolEmails('marketing', 30),
        domains: ['marketers.pro', 'adnetwork.com', 'brandpool.net'],
        reputation_score: 88,
        status: 'active'
      }
    ];

    for (const pool of defaultPools) {
      const { data, error } = await supabase
        .from('warmup_pools')
        .insert([pool])
        .select()
        .single();

      if (error) throw error;
      this.pools.set(data.id, data);
    }
  }

  private generatePoolEmails(category: string, count: number): string[] {
    const prefixes = {
      business: ['contact', 'info', 'hello', 'connect', 'network', 'partner'],
      tech: ['dev', 'tech', 'code', 'build', 'innovate', 'create'],
      marketing: ['market', 'brand', 'promo', 'campaign', 'growth', 'reach']
    };

    const emails = [];
    const categoryPrefixes = prefixes[category as keyof typeof prefixes] || prefixes.business;

    for (let i = 0; i < count; i++) {
      const prefix = categoryPrefixes[i % categoryPrefixes.length];
      const suffix = Math.random().toString(36).substr(2, 6);
      const domain = this.getRandomDomain(category);
      emails.push(`${prefix}${suffix}@${domain}`);
    }

    return emails;
  }

  private getRandomDomain(category: string): string {
    const domains = {
      business: ['biznetwork.com', 'profconnect.net', 'businesshub.org'],
      tech: ['techpool.io', 'devnetwork.com', 'innovators.tech'],
      marketing: ['marketers.pro', 'adnetwork.com', 'brandpool.net']
    };

    const categoryDomains = domains[category as keyof typeof domains] || domains.business;
    return categoryDomains[Math.floor(Math.random() * categoryDomains.length)];
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
    // Get recent conversations to avoid over-contacting
    const { data: recentLogs, error } = await supabase
      .from('email_logs')
      .select('recipient, sent_at')
      .eq('email_id', senderEmail)
      .gte('sent_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (error) throw error;

    const recentRecipients = new Set(recentLogs?.map(log => log.recipient) || []);
    
    // Filter out recently contacted emails
    const availableEmails = pool.emails.filter(email => !recentRecipients.has(email));
    
    if (availableEmails.length === 0) {
      // If all emails were contacted recently, use the oldest one
      const oldestLog = recentLogs?.sort((a, b) => 
        new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
      )[0];
      return oldestLog?.recipient || pool.emails[0];
    }

    // Return random available email
    return availableEmails[Math.floor(Math.random() * availableEmails.length)];
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
    await supabase
      .from('warmup_conversations')
      .insert([{
        id: conversation.id,
        sender_email: senderEmail,
        recipient_email: recipientEmail,
        conversation_data: conversation,
        status: 'active'
      }]);

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
    await supabase
      .from('warmup_conversations')
      .update({
        conversation_data: conversation,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

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

  async getPoolStatistics(): Promise<{
    totalPools: number;
    totalEmails: number;
    averageReputation: number;
    activeConversations: number;
  }> {
    const pools = Array.from(this.pools.values());
    const totalEmails = pools.reduce((sum, pool) => sum + pool.emails.length, 0);
    const averageReputation = pools.length > 0 
      ? pools.reduce((sum, pool) => sum + pool.reputation_score, 0) / pools.length 
      : 0;

    return {
      totalPools: pools.length,
      totalEmails,
      averageReputation: Math.round(averageReputation),
      activeConversations: this.conversations.size
    };
  }
}

// Initialize pool manager
export const warmupPoolManager = WarmupPoolManager.getInstance();