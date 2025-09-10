import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAurinkoClient, generateRandomDelay, getNextBusinessHour } from '@/lib/aurinko';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('warmup_campaigns')
      .select(`
        *,
        connected_emails (
          id,
          email_address,
          provider,
          oauth_tokens
        )
      `)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (campaign.status === 'active') {
      return NextResponse.json(
        { error: 'Campaign is already active' },
        { status: 400 }
      );
    }

    // Update campaign status to active
    const { error: updateError } = await supabase
      .from('warmup_campaigns')
      .update({ 
        status: 'active',
        started_at: new Date().toISOString()
      })
      .eq('id', params.id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to start campaign' },
        { status: 500 }
      );
    }

    // Schedule initial emails
    await scheduleInitialEmails(campaign);

    return NextResponse.json({
      success: true,
      message: 'Campaign started successfully'
    });

  } catch (error) {
    console.error('Error starting campaign:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function scheduleInitialEmails(campaign: any) {
  try {
    const dailyVolume = campaign.daily_volume || 5;
    const emailsToSchedule = Math.min(dailyVolume, 3); // Start with 3 emails max on first day
    
    // Generate recipient list (in production, this would come from a database or API)
    const recipients = generateWarmupRecipients(emailsToSchedule);
    
    for (let i = 0; i < emailsToSchedule; i++) {
      const delay = generateRandomDelay(30, 120); // 30-120 minutes
      const sendTime = getNextBusinessHour(new Date(Date.now() + delay));
      
      // Schedule email sending
      await scheduleEmail({
        campaignId: campaign.id,
        emailId: campaign.email_id,
        recipient: recipients[i],
        sendTime: sendTime.toISOString(),
        emailType: 'introduction'
      });
    }
  } catch (error) {
    console.error('Error scheduling initial emails:', error);
  }
}

function generateWarmupRecipients(count: number): string[] {
  // In production, this would be a curated list of warmup email addresses
  // For demo purposes, we'll generate some example addresses
  const domains = ['warmup-pool.com', 'email-warmup.net', 'sender-rep.org'];
  const recipients = [];
  
  for (let i = 0; i < count; i++) {
    const domain = domains[i % domains.length];
    const username = `warmup-${Math.random().toString(36).substr(2, 8)}`;
    recipients.push(`${username}@${domain}`);
  }
  
  return recipients;
}

async function scheduleEmail(emailData: {
  campaignId: string;
  emailId: string;
  recipient: string;
  sendTime: string;
  emailType: string;
}) {
  // In production, this would use a proper job queue like Bull, Agenda, or cloud functions
  // For now, we'll use a simple setTimeout approach
  
  const delay = new Date(emailData.sendTime).getTime() - Date.now();
  
  if (delay > 0) {
    setTimeout(async () => {
      try {
        // Generate email content
        const contentResponse = await fetch('/api/emails/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email_type: emailData.emailType,
            context: { campaign_id: emailData.campaignId },
            recipient_info: { email: emailData.recipient }
          })
        });
        
        const contentData = await contentResponse.json();
        
        if (contentData.success) {
          // Send the email
          await fetch('/api/emails/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              campaign_id: emailData.campaignId,
              email_id: emailData.emailId,
              recipient: emailData.recipient,
              subject: contentData.data.subject,
              content: contentData.data.body,
              tracking_context: `campaign_${emailData.campaignId}`
            })
          });
        }
      } catch (error) {
        console.error('Error sending scheduled email:', error);
      }
    }, delay);
  }
}