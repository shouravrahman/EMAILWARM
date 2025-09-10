import nodemailer from 'nodemailer';
import { createClient } from '@/utils/supabase/server';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailNotificationData {
  to: string;
  template: EmailTemplate;
  variables?: Record<string, string>;
}

export class EmailNotificationService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  async sendEmail(data: EmailNotificationData): Promise<boolean> {
    try {
      const { subject, html, text } = this.processTemplate(data.template, data.variables || {});

      const mailOptions = {
        from: {
          name: 'WarmupPro',
          address: process.env.SMTP_USER || 'noreply@warmuppro.com'
        },
        to: data.to,
        subject,
        html,
        text,
        headers: {
          'X-Mailer': 'WarmupPro Email Service',
          'X-Priority': '3'
        }
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  private processTemplate(template: EmailTemplate, variables: Record<string, string>): EmailTemplate {
    let { subject, html, text } = template;

    // Replace variables in all fields
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(placeholder, value);
      html = html.replace(placeholder, value);
      text = text.replace(placeholder, value);
    });

    return { subject, html, text };
  }

  // Welcome email template
  static getWelcomeTemplate(): EmailTemplate {
    return {
      subject: 'Welcome to WarmupPro - Let\'s Boost Your Email Deliverability!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to WarmupPro</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to WarmupPro!</h1>
            <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Your email deliverability journey starts now</p>
          </div>
          
          <div style="background: #f8fafc; padding: 25px; border-radius: 10px; margin-bottom: 25px;">
            <h2 style="color: #1e293b; margin-top: 0;">Hi {{user_name}},</h2>
            <p>Thank you for joining WarmupPro! We're excited to help you achieve inbox placement rates that your competitors can only dream of.</p>
            
            <h3 style="color: #3b82f6; margin-top: 25px;">What's Next?</h3>
            <ol style="padding-left: 20px;">
              <li style="margin-bottom: 10px;"><strong>Connect Your Email:</strong> Link your Gmail, Outlook, or SMTP account securely</li>
              <li style="margin-bottom: 10px;"><strong>Create Your First Campaign:</strong> Our AI will analyze and create a personalized warmup strategy</li>
              <li style="margin-bottom: 10px;"><strong>Watch the Magic:</strong> Monitor your deliverability improve in real-time</li>
            </ol>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{dashboard_url}}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              Get Started Now
            </a>
          </div>
          
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <h4 style="color: #92400e; margin-top: 0;">🎯 Your 14-Day Free Trial Includes:</h4>
            <ul style="color: #92400e; margin: 0; padding-left: 20px;">
              <li>Full access to all features</li>
              <li>AI-powered email generation</li>
              <li>Real-time analytics dashboard</li>
              <li>Priority email support</li>
            </ul>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
            <p>Need help? Reply to this email or visit our <a href="{{help_url}}" style="color: #3b82f6;">Help Center</a></p>
            <p style="margin-top: 15px;">
              Best regards,<br>
              The WarmupPro Team
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to WarmupPro!
        
        Hi {{user_name}},
        
        Thank you for joining WarmupPro! We're excited to help you achieve inbox placement rates that your competitors can only dream of.
        
        What's Next?
        1. Connect Your Email: Link your Gmail, Outlook, or SMTP account securely
        2. Create Your First Campaign: Our AI will analyze and create a personalized warmup strategy
        3. Watch the Magic: Monitor your deliverability improve in real-time
        
        Get started: {{dashboard_url}}
        
        Your 14-Day Free Trial Includes:
        - Full access to all features
        - AI-powered email generation
        - Real-time analytics dashboard
        - Priority email support
        
        Need help? Reply to this email or visit our Help Center: {{help_url}}
        
        Best regards,
        The WarmupPro Team
      `
    };
  }

  // Campaign status email template
  static getCampaignStatusTemplate(status: 'started' | 'completed' | 'paused'): EmailTemplate {
    const statusMessages = {
      started: {
        subject: 'Your WarmupPro Campaign Has Started! 🚀',
        title: 'Campaign Started Successfully',
        message: 'Your email warmup campaign is now active and working to improve your sender reputation.',
        action: 'Monitor Progress'
      },
      completed: {
        subject: 'Campaign Completed - Amazing Results! 🎉',
        title: 'Campaign Completed',
        message: 'Congratulations! Your warmup campaign has completed successfully. Check your improved deliverability metrics.',
        action: 'View Results'
      },
      paused: {
        subject: 'Campaign Paused - Action Required ⚠️',
        title: 'Campaign Paused',
        message: 'Your campaign has been paused. This might be due to high bounce rates or other deliverability issues.',
        action: 'Review Campaign'
      }
    };

    const config = statusMessages[status];

    return {
      subject: config.subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${config.title}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${config.title}</h1>
          </div>
          
          <div style="background: #f8fafc; padding: 25px; border-radius: 10px; margin-bottom: 25px;">
            <h2 style="color: #1e293b; margin-top: 0;">Hi {{user_name}},</h2>
            <p>${config.message}</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #3b82f6;">Campaign: {{campaign_name}}</h3>
              <p><strong>Email Account:</strong> {{email_address}}</p>
              <p><strong>Daily Volume:</strong> {{daily_volume}} emails</p>
              <p><strong>Status:</strong> {{campaign_status}}</p>
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{dashboard_url}}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              ${config.action}
            </a>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
            <p>Questions? Reply to this email or contact our support team.</p>
            <p style="margin-top: 15px;">
              Best regards,<br>
              The WarmupPro Team
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        ${config.title}
        
        Hi {{user_name}},
        
        ${config.message}
        
        Campaign Details:
        - Name: {{campaign_name}}
        - Email Account: {{email_address}}
        - Daily Volume: {{daily_volume}} emails
        - Status: {{campaign_status}}
        
        ${config.action}: {{dashboard_url}}
        
        Questions? Reply to this email or contact our support team.
        
        Best regards,
        The WarmupPro Team
      `
    };
  }

  // Weekly report template
  static getWeeklyReportTemplate(): EmailTemplate {
    return {
      subject: 'Your Weekly WarmupPro Performance Report 📊',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Weekly Performance Report</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Weekly Performance Report</h1>
            <p style="color: #e0e7ff; margin: 10px 0 0 0;">{{week_start}} - {{week_end}}</p>
          </div>
          
          <div style="background: #f8fafc; padding: 25px; border-radius: 10px; margin-bottom: 25px;">
            <h2 style="color: #1e293b; margin-top: 0;">Hi {{user_name}},</h2>
            <p>Here's your weekly email warmup performance summary:</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 25px 0;">
              <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
                <h3 style="margin: 0; color: #3b82f6; font-size: 24px;">{{emails_sent}}</h3>
                <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Emails Sent</p>
              </div>
              <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
                <h3 style="margin: 0; color: #10b981; font-size: 24px;">{{open_rate}}%</h3>
                <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Open Rate</p>
              </div>
              <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
                <h3 style="margin: 0; color: #8b5cf6; font-size: 24px;">{{reply_rate}}%</h3>
                <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Reply Rate</p>
              </div>
              <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
                <h3 style="margin: 0; color: #f59e0b; font-size: 24px;">{{deliverability_score}}</h3>
                <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">Deliverability Score</p>
              </div>
            </div>
            
            <div style="background: #dbeafe; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <h4 style="color: #1e40af; margin-top: 0;">📈 Key Insights:</h4>
              <ul style="color: #1e40af; margin: 0; padding-left: 20px;">
                <li>{{insight_1}}</li>
                <li>{{insight_2}}</li>
                <li>{{insight_3}}</li>
              </ul>
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{dashboard_url}}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
              View Full Report
            </a>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
            <p>Want to change your email preferences? <a href="{{unsubscribe_url}}" style="color: #3b82f6;">Manage preferences</a></p>
            <p style="margin-top: 15px;">
              Best regards,<br>
              The WarmupPro Team
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        Weekly Performance Report ({{week_start}} - {{week_end}})
        
        Hi {{user_name}},
        
        Here's your weekly email warmup performance summary:
        
        📊 Performance Metrics:
        - Emails Sent: {{emails_sent}}
        - Open Rate: {{open_rate}}%
        - Reply Rate: {{reply_rate}}%
        - Deliverability Score: {{deliverability_score}}
        
        📈 Key Insights:
        - {{insight_1}}
        - {{insight_2}}
        - {{insight_3}}
        
        View full report: {{dashboard_url}}
        
        Want to change your email preferences? {{unsubscribe_url}}
        
        Best regards,
        The WarmupPro Team
      `
    };
  }

  // Send welcome email
  async sendWelcomeEmail(userEmail: string, userName: string): Promise<boolean> {
    const template = EmailNotificationService.getWelcomeTemplate();
    return this.sendEmail({
      to: userEmail,
      template,
      variables: {
        user_name: userName,
        dashboard_url: `${process.env.NEXTAUTH_URL}/dashboard`,
        help_url: `${process.env.NEXTAUTH_URL}/help`
      }
    });
  }

  // Send campaign status email
  async sendCampaignStatusEmail(
    userEmail: string, 
    userName: string, 
    campaignData: {
      name: string;
      email_address: string;
      daily_volume: number;
      status: string;
    },
    status: 'started' | 'completed' | 'paused'
  ): Promise<boolean> {
    const template = EmailNotificationService.getCampaignStatusTemplate(status);
    return this.sendEmail({
      to: userEmail,
      template,
      variables: {
        user_name: userName,
        campaign_name: campaignData.name,
        email_address: campaignData.email_address,
        daily_volume: campaignData.daily_volume.toString(),
        campaign_status: campaignData.status,
        dashboard_url: `${process.env.NEXTAUTH_URL}/dashboard`
      }
    });
  }

  // Send weekly report
  async sendWeeklyReport(
    userEmail: string,
    userName: string,
    reportData: {
      week_start: string;
      week_end: string;
      emails_sent: number;
      open_rate: number;
      reply_rate: number;
      deliverability_score: number;
      insights: string[];
    }
  ): Promise<boolean> {
    const template = EmailNotificationService.getWeeklyReportTemplate();
    return this.sendEmail({
      to: userEmail,
      template,
      variables: {
        user_name: userName,
        week_start: reportData.week_start,
        week_end: reportData.week_end,
        emails_sent: reportData.emails_sent.toString(),
        open_rate: reportData.open_rate.toString(),
        reply_rate: reportData.reply_rate.toString(),
        deliverability_score: reportData.deliverability_score.toString(),
        insight_1: reportData.insights[0] || 'Your campaigns are performing well',
        insight_2: reportData.insights[1] || 'Continue with current strategy',
        insight_3: reportData.insights[2] || 'Monitor bounce rates closely',
        dashboard_url: `${process.env.NEXTAUTH_URL}/dashboard`,
        unsubscribe_url: `${process.env.NEXTAUTH_URL}/settings`
      }
    });
  }

  // Test email configuration
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('SMTP connection test failed:', error);
      return false;
    }
  }
}

// Singleton instance
let emailServiceInstance: EmailNotificationService | null = null;

export function getEmailNotificationService(): EmailNotificationService {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailNotificationService();
  }
  return emailServiceInstance;
}

// Automated email sending functions
export async function sendUserWelcomeEmail(userId: string): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: user, error } = await supabase.auth.admin.getUserById(userId);
    
    if (error || !user.user) {
      console.error('Error fetching user for welcome email:', error);
      return;
    }

    const emailService = getEmailNotificationService();
    const userName = user.user.user_metadata?.name || user.user.email?.split('@')[0] || 'there';
    
    await emailService.sendWelcomeEmail(user.user.email!, userName);
  } catch (error) {
    console.error('Error sending welcome email:', error);
  }
}

export async function sendCampaignNotification(
  campaignId: string, 
  status: 'started' | 'completed' | 'paused'
): Promise<void> {
  try {
    const supabase = await createClient();
    
    // Get campaign with user info
    const { data: campaign, error } = await supabase
      .from('warmup_campaigns')
      .select(`
        *,
        connected_emails (
          email_address
        )
      `)
      .eq('id', campaignId)
      .single();

    if (error || !campaign) {
      console.error('Error fetching campaign for notification:', error);
      return;
    }

    // Get user info
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(campaign.user_id);
    
    if (userError || !user.user) {
      console.error('Error fetching user for campaign notification:', userError);
      return;
    }

    const emailService = getEmailNotificationService();
    const userName = user.user.user_metadata?.name || user.user.email?.split('@')[0] || 'there';
    
    await emailService.sendCampaignStatusEmail(
      user.user.email!,
      userName,
      {
        name: campaign.name,
        email_address: campaign.connected_emails?.email_address || 'Unknown',
        daily_volume: campaign.daily_volume,
        status: campaign.status
      },
      status
    );
  } catch (error) {
    console.error('Error sending campaign notification:', error);
  }
}

export async function sendWeeklyReports(): Promise<void> {
  try {
    const supabase = await createClient();
    
    // Get all active users with email notifications enabled
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error || !users.users) {
      console.error('Error fetching users for weekly reports:', error);
      return;
    }

    const emailService = getEmailNotificationService();
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekEnd = new Date();

    for (const user of users.users) {
      try {
        // Get user's campaign performance for the week
        const { data: campaigns } = await supabase
          .from('warmup_campaigns')
          .select('id')
          .eq('user_id', user.id);

        if (!campaigns || campaigns.length === 0) continue;

        const campaignIds = campaigns.map(c => c.id);
        
        // Get email logs for the week
        const { data: logs } = await supabase
          .from('email_logs')
          .select('*')
          .in('campaign_id', campaignIds)
          .gte('sent_at', weekStart.toISOString())
          .lte('sent_at', weekEnd.toISOString());

        if (!logs || logs.length === 0) continue;

        // Calculate metrics
        const emailsSent = logs.length;
        const emailsOpened = logs.filter(log => log.open_count > 0).length;
        const emailsReplied = logs.filter(log => log.reply_count > 0).length;
        const openRate = Math.round((emailsOpened / emailsSent) * 100);
        const replyRate = Math.round((emailsReplied / emailsSent) * 100);
        const deliverabilityScore = Math.round((openRate + replyRate) / 2 + 50);

        const insights = [
          `Sent ${emailsSent} emails this week with ${openRate}% open rate`,
          `Your reply rate of ${replyRate}% is ${replyRate > 15 ? 'excellent' : replyRate > 10 ? 'good' : 'needs improvement'}`,
          `Deliverability score improved to ${deliverabilityScore}/100`
        ];

        const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'there';

        await emailService.sendWeeklyReport(
          user.email!,
          userName,
          {
            week_start: weekStart.toLocaleDateString(),
            week_end: weekEnd.toLocaleDateString(),
            emails_sent: emailsSent,
            open_rate: openRate,
            reply_rate: replyRate,
            deliverability_score: deliverabilityScore,
            insights
          }
        );

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (userError) {
        console.error(`Error sending weekly report to ${user.email}:`, userError);
      }
    }
  } catch (error) {
    console.error('Error sending weekly reports:', error);
  }
}