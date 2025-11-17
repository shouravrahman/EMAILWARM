import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAurinkoClient, generateRandomDelay, getNextBusinessHour } from '@/lib/aurinko';
import { warmupPoolManager } from '@/lib/email-pool';

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;

  const supabase = await createClient();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user reputation
    const { data: reputation, error: reputationError } = await supabase
      .from('user_reputation')
      .select('reputation_score')
      .eq('user_id', user.id)
      .single();

    const userReputation = reputation?.reputation_score || 75;

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
    await scheduleInitialEmails(campaign, userReputation);

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
  } finally {}
}

async function scheduleInitialEmails(campaign: any, userReputation: number) {
  try {
    const dailyVolume = campaign.daily_volume || 5;
    let emailsToSchedule = Math.min(dailyVolume, 3); // Start with 3 emails max on first day

    // Adjust sending strategy based on reputation
    let minDelay = 30;
    let maxDelay = 120;
    let emailType = 'introduction';

    if (userReputation < 50) {
      minDelay = 60;
      maxDelay = 240;
      emailType = 'networking'; // Safer, more engaging
      emailsToSchedule = Math.min(emailsToSchedule, 2); // Send fewer emails
    } else if (userReputation < 75) {
      minDelay = 45;
      maxDelay = 180;
      emailType = 'introduction';
    }

    const senderEmail = campaign.connected_emails.email_address;
    const recipients = await generateWarmupRecipients(emailsToSchedule, senderEmail);

    for (let i = 0; i < emailsToSchedule; i++) {
      const delay = generateRandomDelay(minDelay, maxDelay);
      const sendTime = getNextBusinessHour(new Date(Date.now() + delay));

      // Schedule email sending
      await scheduleEmail({
        campaignId: campaign.id,
        emailId: campaign.email_id,
        recipient: recipients[i],
        sendTime: sendTime.toISOString(),
        emailType: emailType
      });
    }
  } catch (error) {
    console.error('Error scheduling initial emails:', error);
  }
}



async function generateWarmupRecipients(count: number, senderEmail: string): Promise<string[]> {
  const recipients: string[] = [];
  for (let i = 0; i < count; i++) {
    try {
      // Assuming 'introduction' as a default campaign type for initial emails
      const recipient = await warmupPoolManager.getOptimalRecipient(senderEmail, 'introduction');
      recipients.push(recipient);
    } catch (error) {
      console.error('Error getting optimal recipient:', error);
      // Fallback or handle error appropriately
      break;
    }
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
