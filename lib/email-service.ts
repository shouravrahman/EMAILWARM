import { supabase } from './supabase';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: 'introduction' | 'follow_up' | 'reply' | 'thank_you';
  variables: string[];
}

export interface EmailSendRequest {
  campaignId: string;
  emailId: string;
  recipient: string;
  template: EmailTemplate;
  variables?: Record<string, string>;
  scheduledFor?: Date;
}

export interface EmailLogEntry {
  id: string;
  campaign_id: string;
  email_id: string;
  message_id: string;
  subject: string;
  recipient: string;
  status: 'sent' | 'delivered' | 'opened' | 'replied' | 'bounced' | 'spam' | 'unsubscribed';
  open_count: number;
  reply_count: number;
  click_count: number;
  sent_at: string;
  opened_at?: string;
  replied_at?: string;
  bounced_at?: string;
  spam_at?: string;
  unsubscribed_at?: string;
  last_activity_at?: string;
  metadata: Record<string, any>;
  bounce_reason?: string;
  click_data: any[];
}

export class EmailService {
  // Default email templates
  private static templates: EmailTemplate[] = [
    {
      id: 'intro-1',
      name: 'Professional Introduction',
      subject: 'Quick introduction from {{sender_name}}',
      body: `Hi {{recipient_name}},

I hope this email finds you well. I came across your profile and was impressed by your work in {{industry}}.

I'd love to connect and potentially explore opportunities for collaboration or simply expand my professional network.

Looking forward to hearing from you.

Best regards,
{{sender_name}}
{{sender_title}}
{{sender_company}}`,
      type: 'introduction',
      variables: ['recipient_name', 'sender_name', 'industry', 'sender_title', 'sender_company']
    },
    {
      id: 'follow-1',
      name: 'Friendly Follow-up',
      subject: 'Following up on our conversation',
      body: `Hi {{recipient_name}},

I hope you're doing well. I wanted to follow up on our previous conversation and see how things are progressing on your end.

If there's anything I can help with or if you'd like to continue our discussion, please let me know.

Best regards,
{{sender_name}}`,
      type: 'follow_up',
      variables: ['recipient_name', 'sender_name']
    },
    {
      id: 'reply-1',
      name: 'Thank You Reply',
      subject: 'Thanks for reaching out!',
      body: `Hi {{recipient_name}},

Thank you for reaching out! I appreciate you taking the time to connect.

I'd be happy to discuss this further. What would be a good time for you to chat?

Looking forward to your response.

Best regards,
{{sender_name}}`,
      type: 'reply',
      variables: ['recipient_name', 'sender_name']
    }
  ];

  // Get available email templates
  static getTemplates(): EmailTemplate[] {
    return this.templates;
  }

  // Get template by ID
  static getTemplate(id: string): EmailTemplate | null {
    return this.templates.find(t => t.id === id) || null;
  }

  // Process template variables
  static processTemplate(template: EmailTemplate, variables: Record<string, string>): { subject: string; body: string } {
    let subject = template.subject;
    let body = template.body;

    // Replace variables in subject and body
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder, 'g'), value);
      body = body.replace(new RegExp(placeholder, 'g'), value);
    });

    return { subject, body };
  }

  // Log email send
  static async logEmailSend(data: {
    campaignId: string;
    emailId: string;
    messageId: string;
    subject: string;
    recipient: string;
    metadata?: Record<string, any>;
  }): Promise<EmailLogEntry | null> {
    try {
      const { data: logEntry, error } = await supabase
        .from('email_logs')
        .insert([{
          campaign_id: data.campaignId,
          email_id: data.emailId,
          message_id: data.messageId,
          subject: data.subject,
          recipient: data.recipient,
          status: 'sent',
          sent_at: new Date().toISOString(),
          metadata: data.metadata || {}
        }])
        .select()
        .single();

      if (error) throw error;
      return logEntry;
    } catch (error) {
      console.error('Error logging email send:', error);
      return null;
    }
  }

  // Update email status
  static async updateEmailStatus(
    messageId: string,
    status: EmailLogEntry['status'],
    additionalData?: {
      openCount?: number;
      replyCount?: number;
      clickCount?: number;
      bounceReason?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<boolean> {
    try {
      const updateData: any = { status };

      // Set timestamp based on status
      const now = new Date().toISOString();
      switch (status) {
        case 'opened':
          updateData.opened_at = now;
          if (additionalData?.openCount !== undefined) {
            updateData.open_count = additionalData.openCount;
          }
          break;
        case 'replied':
          updateData.replied_at = now;
          if (additionalData?.replyCount !== undefined) {
            updateData.reply_count = additionalData.replyCount;
          }
          break;
        case 'bounced':
          updateData.bounced_at = now;
          if (additionalData?.bounceReason) {
            updateData.bounce_reason = additionalData.bounceReason;
          }
          break;
        case 'spam':
          updateData.spam_at = now;
          break;
        case 'unsubscribed':
          updateData.unsubscribed_at = now;
          break;
      }

      if (additionalData?.clickCount !== undefined) {
        updateData.click_count = additionalData.clickCount;
      }

      if (additionalData?.metadata) {
        updateData.metadata = additionalData.metadata;
      }

      const { error } = await supabase
        .from('email_logs')
        .update(updateData)
        .eq('message_id', messageId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating email status:', error);
      return false;
    }
  }

  // Get email logs for a campaign
  static async getCampaignLogs(campaignId: string, filters?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<EmailLogEntry[]> {
    try {
      let query = supabase
        .from('email_logs')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('sent_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching campaign logs:', error);
      return [];
    }
  }

  // Get campaign analytics
  static async getCampaignAnalytics(campaignId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .rpc('get_campaign_metrics', { p_campaign_id: campaignId });

      if (error) throw error;
      return data?.[0] || null;
    } catch (error) {
      console.error('Error fetching campaign analytics:', error);
      return null;
    }
  }

  // Generate mock email for warmup
  static generateWarmupEmail(type: 'introduction' | 'follow_up' | 'reply' = 'introduction'): {
    subject: string;
    body: string;
    recipient: string;
  } {
    const templates = this.templates.filter(t => t.type === type);
    const template = templates[Math.floor(Math.random() * templates.length)];

    const mockVariables = {
      recipient_name: this.generateRandomName(),
      sender_name: 'Alex Johnson',
      industry: this.generateRandomIndustry(),
      sender_title: 'Business Development Manager',
      sender_company: 'TechCorp Solutions'
    };

    const { subject, body } = this.processTemplate(template, mockVariables);

    return {
      subject,
      body,
      recipient: this.generateWarmupEmail()
    };
  }

  // Helper functions for mock data
  private static generateRandomName(): string {
    const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Lisa', 'Tom', 'Emma', 'Chris', 'Anna'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
    
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    return `${firstName} ${lastName}`;
  }

  private static generateRandomIndustry(): string {
    const industries = [
      'technology', 'healthcare', 'finance', 'education', 'manufacturing',
      'retail', 'consulting', 'marketing', 'real estate', 'logistics'
    ];
    
    return industries[Math.floor(Math.random() * industries.length)];
  }

  private static generateWarmupEmail(): string {
    const domains = ['warmup-pool.com', 'email-warmup.net', 'sender-rep.org', 'deliverability-test.com'];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    const username = `warmup-${Math.random().toString(36).substr(2, 8)}`;
    
    return `${username}@${domain}`;
  }

  // Simulate email sending for demo purposes
  static async simulateEmailSend(request: EmailSendRequest): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      // Generate a mock message ID
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Process template
      const { subject, body } = this.processTemplate(request.template, request.variables || {});

      // Log the email
      const logEntry = await this.logEmailSend({
        campaignId: request.campaignId,
        emailId: request.emailId,
        messageId,
        subject,
        recipient: request.recipient,
        metadata: {
          template_id: request.template.id,
          variables: request.variables,
          simulated: true
        }
      });

      if (!logEntry) {
        throw new Error('Failed to log email send');
      }

      // Simulate delivery and engagement after a delay
      setTimeout(() => {
        this.simulateEmailEngagement(messageId);
      }, Math.random() * 5000 + 1000); // 1-6 seconds delay

      return {
        success: true,
        messageId
      };
    } catch (error) {
      console.error('Error simulating email send:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Simulate email engagement for demo
  private static async simulateEmailEngagement(messageId: string): Promise<void> {
    try {
      // Simulate delivery
      await this.updateEmailStatus(messageId, 'delivered');

      // Random chance of opening (70%)
      if (Math.random() < 0.7) {
        setTimeout(async () => {
          await this.updateEmailStatus(messageId, 'opened', { openCount: 1 });

          // Random chance of multiple opens (30%)
          if (Math.random() < 0.3) {
            setTimeout(async () => {
              await this.updateEmailStatus(messageId, 'opened', { 
                openCount: Math.floor(Math.random() * 3) + 2 
              });
            }, Math.random() * 10000 + 5000);
          }

          // Random chance of reply (15%)
          if (Math.random() < 0.15) {
            setTimeout(async () => {
              await this.updateEmailStatus(messageId, 'replied', { replyCount: 1 });
            }, Math.random() * 20000 + 10000);
          }
        }, Math.random() * 10000 + 2000);
      }

      // Small chance of bounce (2%)
      if (Math.random() < 0.02) {
        setTimeout(async () => {
          await this.updateEmailStatus(messageId, 'bounced', {
            bounceReason: 'Mailbox full'
          });
        }, Math.random() * 5000 + 1000);
      }
    } catch (error) {
      console.error('Error simulating email engagement:', error);
    }
  }
}