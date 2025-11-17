import { supabase } from './supabase';
import { EmailQueue } from './email-queue';
import { EmailService } from './email-service';

export interface CampaignProcessResult {
  campaignId: string;
  campaignName: string;
  campaignType: 'warmup' | 'outreach';
  emailsQueued: number;
  errors: string[];
  skipped: boolean;
  skipReason?: string;
}

export interface SchedulerResult {
  totalCampaigns: number;
  processed: number;
  skipped: number;
  totalEmailsQueued: number;
  results: CampaignProcessResult[];
  errors: string[];
}

export class CampaignScheduler {
  /**
   * Process all active campaigns
   * This is the main entry point called by the cron job
   */
  static async processActiveCampaigns(): Promise<SchedulerResult> {
    const result: SchedulerResult = {
      totalCampaigns: 0,
      processed: 0,
      skipped: 0,
      totalEmailsQueued: 0,
      results: [],
      errors: [],
    };

    try {
      // Fetch all active campaigns
      const { data: campaigns, error: fetchError } = await supabase
        .from('warmup_campaigns')
        .select(`
          *,
          connected_emails (
            id,
            email_address,
            provider,
            status
          )
        `)
        .eq('status', 'active')
        .lte('start_date', new Date().toISOString())
        .gte('end_date', new Date().toISOString());

      if (fetchError) {
        result.errors.push(`Failed to fetch campaigns: ${fetchError.message}`);
        return result;
      }

      if (!campaigns || campaigns.length === 0) {
        console.log('No active campaigns to process');
        return result;
      }

      result.totalCampaigns = campaigns.length;
      console.log(`Processing ${campaigns.length} active campaigns`);

      // Process each campaign
      for (const campaign of campaigns) {
        try {
          let campaignResult: CampaignProcessResult;

          if (campaign.campaign_type === 'warmup') {
            campaignResult = await this.processWarmupCampaign(campaign.id);
          } else if (campaign.campaign_type === 'outreach') {
            campaignResult = await this.processOutreachCampaign(campaign.id);
          } else {
            campaignResult = {
              campaignId: campaign.id,
              campaignName: campaign.name,
              campaignType: campaign.campaign_type,
              emailsQueued: 0,
              errors: [`Unknown campaign type: ${campaign.campaign_type}`],
              skipped: true,
              skipReason: 'Unknown campaign type',
            };
          }

          result.results.push(campaignResult);

          if (campaignResult.skipped) {
            result.skipped++;
          } else {
            result.processed++;
            result.totalEmailsQueued += campaignResult.emailsQueued;
          }
        } catch (error: any) {
          const errorMsg = `Error processing campaign ${campaign.id}: ${error.message}`;
          console.error(errorMsg);
          result.errors.push(errorMsg);
          result.results.push({
            campaignId: campaign.id,
            campaignName: campaign.name,
            campaignType: campaign.campaign_type,
            emailsQueued: 0,
            errors: [error.message],
            skipped: true,
            skipReason: 'Processing error',
          });
        }
      }

      // Check for completed campaigns
      await this.detectCompletedCampaigns();

      console.log(`Scheduler completed: ${result.processed} processed, ${result.skipped} skipped, ${result.totalEmailsQueued} emails queued`);
      return result;
    } catch (error: any) {
      console.error('Error in processActiveCampaigns:', error);
      result.errors.push(`Scheduler error: ${error.message}`);
      return result;
    }
  }

  /**
   * Process a single warmup campaign
   */
  static async processWarmupCampaign(campaignId: string): Promise<CampaignProcessResult> {
    const result: CampaignProcessResult = {
      campaignId,
      campaignName: '',
      campaignType: 'warmup',
      emailsQueued: 0,
      errors: [],
      skipped: false,
    };

    try {
      // Fetch campaign details
      const { data: campaign, error: campaignError } = await supabase
        .from('warmup_campaigns')
        .select(`
          *,
          connected_emails (
            id,
            email_address,
            provider,
            status
          )
        `)
        .eq('id', campaignId)
        .single();

      if (campaignError || !campaign) {
        throw new Error('Campaign not found');
      }

      result.campaignName = campaign.name;

      // Check if email account is active
      if (campaign.connected_emails?.status !== 'active') {
        result.skipped = true;
        result.skipReason = 'Email account is not active';
        return result;
      }

      // Check if we can send today (daily volume limit)
      const canSend = await this.canSendToday(campaignId, campaign.daily_volume);
      if (!canSend.allowed) {
        result.skipped = true;
        result.skipReason = `Daily volume limit reached (${canSend.sentToday}/${campaign.daily_volume})`;
        return result;
      }

      const emailsToSend = canSend.remaining;

      // Get warmup pool emails
      const warmupRecipients = await this.getWarmupPoolEmails(emailsToSend);

      if (warmupRecipients.length === 0) {
        result.skipped = true;
        result.skipReason = 'No warmup pool emails available';
        return result;
      }

      // Generate and queue warmup emails
      for (const recipient of warmupRecipients) {
        try {
          const warmupEmail = EmailService.generateWarmupEmail();

          const queueId = await EmailQueue.enqueue({
            campaignId: campaign.id,
            emailAccountId: campaign.email_id,
            recipient: recipient.email_address,
            subject: warmupEmail.subject,
            body: warmupEmail.body,
            htmlBody: warmupEmail.body.replace(/\n/g, '<br>'),
            priority: 0, // Warmup emails have normal priority
            metadata: {
              warmup: true,
              pool_email_id: recipient.id,
            },
          });

          if (queueId) {
            result.emailsQueued++;

            // Update warmup pool usage
            await this.updateWarmupPoolUsage(recipient.id);
          }
        } catch (error: any) {
          result.errors.push(`Failed to queue email to ${recipient.email_address}: ${error.message}`);
        }
      }

      // Update campaign tracking
      await this.updateCampaignTracking(campaignId, result.emailsQueued);

      return result;
    } catch (error: any) {
      result.errors.push(error.message);
      result.skipped = true;
      result.skipReason = 'Processing error';
      return result;
    }
  }

  /**
   * Process a single outreach campaign
   */
  static async processOutreachCampaign(campaignId: string): Promise<CampaignProcessResult> {
    const result: CampaignProcessResult = {
      campaignId,
      campaignName: '',
      campaignType: 'outreach',
      emailsQueued: 0,
      errors: [],
      skipped: false,
    };

    try {
      // Fetch campaign details
      const { data: campaign, error: campaignError } = await supabase
        .from('warmup_campaigns')
        .select(`
          *,
          connected_emails (
            id,
            email_address,
            provider,
            status
          )
        `)
        .eq('id', campaignId)
        .single();

      if (campaignError || !campaign) {
        throw new Error('Campaign not found');
      }

      result.campaignName = campaign.name;

      // Only process automated outreach campaigns
      if (campaign.outreach_mode !== 'automated') {
        result.skipped = true;
        result.skipReason = 'Campaign is in manual mode';
        return result;
      }

      // Check if email account is active
      if (campaign.connected_emails?.status !== 'active') {
        result.skipped = true;
        result.skipReason = 'Email account is not active';
        return result;
      }

      // Check if we can send today (daily volume limit)
      const canSend = await this.canSendToday(campaignId, campaign.daily_volume);
      if (!canSend.allowed) {
        result.skipped = true;
        result.skipReason = `Daily volume limit reached (${canSend.sentToday}/${campaign.daily_volume})`;
        return result;
      }

      const emailsToSend = canSend.remaining;

      // Get next prospects to contact
      const prospects = await this.getNextProspects(campaignId, campaign.prospect_list_id, emailsToSend);

      if (prospects.length === 0) {
        result.skipped = true;
        result.skipReason = 'No prospects available to contact';
        return result;
      }

      // Send emails to prospects
      for (const prospect of prospects) {
        try {
          const sendResult = await EmailService.sendOutreachEmail({
            campaignId: campaign.id,
            prospectId: prospect.id,
            emailAccountId: campaign.email_id,
            personalizationTemplate: campaign.personalization_template || '',
            senderInfo: {
              name: campaign.settings?.sender_name || 'Team',
              company: campaign.settings?.sender_company || '',
              title: campaign.settings?.sender_title || '',
            },
          });

          if (sendResult.success) {
            result.emailsQueued++;
          } else {
            result.errors.push(`Failed to send to ${prospect.email}: ${sendResult.error}`);
          }
        } catch (error: any) {
          result.errors.push(`Failed to send to ${prospect.email}: ${error.message}`);
        }
      }

      // Update campaign tracking
      await this.updateCampaignTracking(campaignId, result.emailsQueued);

      return result;
    } catch (error: any) {
      result.errors.push(error.message);
      result.skipped = true;
      result.skipReason = 'Processing error';
      return result;
    }
  }

  /**
   * Check if campaign can send emails today (respects daily volume limit)
   */
  static async canSendToday(
    campaignId: string,
    dailyVolume: number
  ): Promise<{ allowed: boolean; remaining: number; sentToday: number }> {
    try {
      // Get today's date at midnight
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Count emails sent today for this campaign
      const { count, error } = await supabase
        .from('email_logs')
        .select('*', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
        .gte('sent_at', today.toISOString());

      if (error) {
        console.error('Error checking daily volume:', error);
        return { allowed: false, remaining: 0, sentToday: 0 };
      }

      const sentToday = count || 0;
      const remaining = Math.max(0, dailyVolume - sentToday);

      return {
        allowed: remaining > 0,
        remaining,
        sentToday,
      };
    } catch (error) {
      console.error('Error in canSendToday:', error);
      return { allowed: false, remaining: 0, sentToday: 0 };
    }
  }

  /**
   * Get next prospects to contact for outreach campaign
   */
  static async getNextProspects(
    campaignId: string,
    prospectListId: string | null,
    limit: number
  ): Promise<any[]> {
    try {
      if (!prospectListId) {
        return [];
      }

      // Get prospects that haven't been contacted yet
      const { data: prospects, error } = await supabase
        .from('prospects')
        .select('*')
        .eq('list_id', prospectListId)
        .eq('status', 'active')
        .is('last_contacted_at', null)
        .limit(limit);

      if (error) {
        console.error('Error fetching prospects:', error);
        return [];
      }

      return prospects || [];
    } catch (error) {
      console.error('Error in getNextProspects:', error);
      return [];
    }
  }

  /**
   * Get warmup pool emails for sending
   */
  private static async getWarmupPoolEmails(limit: number): Promise<any[]> {
    try {
      // Get active warmup pool emails with low bounce rate
      const { data: poolEmails, error } = await supabase
        .from('warmup_email_pool')
        .select('*')
        .eq('status', 'active')
        .eq('mx_verified', true)
        .lt('bounce_rate', 0.05) // Less than 5% bounce rate
        .order('usage_count', { ascending: true }) // Prioritize less-used emails
        .limit(limit);

      if (error) {
        console.error('Error fetching warmup pool emails:', error);
        return [];
      }

      return poolEmails || [];
    } catch (error) {
      console.error('Error in getWarmupPoolEmails:', error);
      return [];
    }
  }

  /**
   * Update warmup pool email usage
   */
  private static async updateWarmupPoolUsage(poolEmailId: string): Promise<void> {
    try {
      await supabase
        .from('warmup_email_pool')
        .update({
          usage_count: supabase.raw('usage_count + 1'),
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', poolEmailId);
    } catch (error) {
      console.error('Error updating warmup pool usage:', error);
    }
  }

  /**
   * Update campaign tracking (daily volume, total sent)
   */
  private static async updateCampaignTracking(
    campaignId: string,
    emailsSent: number
  ): Promise<void> {
    try {
      // Get current campaign data
      const { data: campaign } = await supabase
        .from('warmup_campaigns')
        .select('settings')
        .eq('id', campaignId)
        .single();

      const settings = campaign?.settings || {};
      const today = new Date().toISOString().split('T')[0];

      // Update tracking data
      await supabase
        .from('warmup_campaigns')
        .update({
          settings: {
            ...settings,
            last_send_date: today,
            emails_sent_today: (settings.last_send_date === today ? (settings.emails_sent_today || 0) : 0) + emailsSent,
            total_emails_sent: (settings.total_emails_sent || 0) + emailsSent,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaignId);
    } catch (error) {
      console.error('Error updating campaign tracking:', error);
    }
  }

  /**
   * Detect and mark completed campaigns
   */
  static async detectCompletedCampaigns(): Promise<void> {
    try {
      const now = new Date().toISOString();

      // Find campaigns that have passed their end date
      const { data: expiredCampaigns, error: fetchError } = await supabase
        .from('warmup_campaigns')
        .select('id, name')
        .eq('status', 'active')
        .lt('end_date', now);

      if (fetchError) {
        console.error('Error fetching expired campaigns:', fetchError);
        return;
      }

      if (!expiredCampaigns || expiredCampaigns.length === 0) {
        return;
      }

      console.log(`Found ${expiredCampaigns.length} campaigns to complete`);

      // Mark campaigns as completed
      const { error: updateError } = await supabase
        .from('warmup_campaigns')
        .update({ status: 'completed', updated_at: now })
        .eq('status', 'active')
        .lt('end_date', now);

      if (updateError) {
        console.error('Error updating completed campaigns:', updateError);
        return;
      }

      console.log(`Marked ${expiredCampaigns.length} campaigns as completed`);
    } catch (error) {
      console.error('Error in detectCompletedCampaigns:', error);
    }
  }

  /**
   * Get rate limit for email provider
   */
  static getRateLimitForProvider(provider: string): number {
    const limits: Record<string, number> = {
      gmail: 500,
      outlook: 300,
      office365: 300,
      default: 100,
    };

    return limits[provider.toLowerCase()] || limits.default;
  }
}
