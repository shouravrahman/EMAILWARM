import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/utils/supabase/server";
import crypto from 'crypto';
import { warmupPoolManager } from "@/lib/email-pool";
import { getAurinkoClient } from "@/lib/aurinko";

// Verify webhook signature
function verifyWebhookSignature(signature: string | null, body: string): boolean {
  if (!signature || !process.env.AURINKO_WEBHOOK_SECRET) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.AURINKO_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${expectedSignature}`)
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-aurinko-signature');

    // Verify webhook signature in production
    if (process.env.NODE_ENV === 'production' && !verifyWebhookSignature(signature, body)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const webhookData = JSON.parse(body);
    const { message_id, event_type, timestamp, data, account_id } = webhookData;

    console.log('Received Aurinko webhook:', { event_type, message_id, account_id });

    const supabase = await createClient();
	const { data: emailLog, error: findError } = await supabase
		.from("email_logs")
		.select("*")
		.eq("message_id", message_id)
		.single();

    if (findError || !emailLog) {
      console.error('Email log not found for message_id:', message_id);
      return NextResponse.json({ error: 'Email log not found' }, { status: 404 });
    }

    // Update based on event type
    let updateData: any = {};

    switch (event_type) {
      case 'email.delivered':
        updateData = {
          status: 'delivered',
          delivered_at: timestamp
        };
        break;

      case 'email.opened':
        updateData = {
          status: 'opened',
          open_count: emailLog.open_count + 1,
          opened_at: emailLog.opened_at || timestamp,
          last_opened_at: timestamp
        };
        break;

      case 'email.replied':
        updateData = {
          status: 'replied',
          reply_count: emailLog.reply_count + 1,
          replied_at: emailLog.replied_at || timestamp,
          last_replied_at: timestamp
        };

        // Store reply data if available
        if (data && data.reply_content) {
          updateData.reply_data = data;
        }

        // Continue the conversation
        await continueConversation(emailLog);
        break;

      case 'email.bounced':
        updateData = {
          status: 'bounced',
          bounced_at: timestamp,
          bounce_reason: data?.reason || 'Unknown'
        };
        break;

      case 'email.spam_complaint':
        updateData = {
          status: 'spam',
          spam_at: timestamp,
          spam_reason: data?.reason || 'Spam complaint'
        };
        break;

      case 'email.unsubscribed':
        updateData = {
          status: 'unsubscribed',
          unsubscribed_at: timestamp
        };
        break;

      case 'email.clicked':
        // Track link clicks
        updateData = {
          click_count: (emailLog.click_count || 0) + 1,
          last_clicked_at: timestamp
        };

        if (data && data.url) {
          // Store click data
          const clickData = emailLog.click_data || [];
          clickData.push({
            url: data.url,
            timestamp: timestamp,
            user_agent: data.user_agent,
            ip_address: data.ip_address
          });
          updateData.click_data = clickData;
        }
        break;

      default:
        console.warn('Unknown event type:', event_type);
        return NextResponse.json({ message: 'Event type not handled' });
    }

    // Update the email log
    const { error: updateError } = await supabase
      .from('email_logs')
      .update(updateData)
      .eq('id', emailLog.id);

    if (updateError) {
      console.error('Error updating email log:', updateError);
      return NextResponse.json(
        { error: 'Failed to update email log' },
        { status: 500 }
      );
    }

    // Check if this affects campaign health
    if (['bounced', 'spam'].includes(event_type.split('.')[1])) {
      await checkCampaignHealth(emailLog.campaign_id);
    }

    // Log the webhook event for debugging
    console.log(`Webhook processed: ${event_type} for message ${message_id}`);

    return NextResponse.json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function checkCampaignHealth(campaignId: string) {
  try {
    const supabase = await createClient();
	const oneDayAgo = new Date();
	oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: recentLogs, error } = await supabase
      .from('email_logs')
      .select('status')
      .eq('campaign_id', campaignId)
      .gte('sent_at', oneDayAgo);

    if (error || !recentLogs || recentLogs.length === 0) {
      return;
    }

    const totalEmails = recentLogs.length;
    const bouncedEmails = recentLogs.filter(log => log.status === 'bounced').length;
    const spamEmails = recentLogs.filter(log => log.status === 'spam').length;

    const bounceRate = (bouncedEmails / totalEmails) * 100;
    const spamRate = (spamEmails / totalEmails) * 100;

    // Pause campaign if bounce rate > 5% or spam rate > 1%
    if (bounceRate > 5 || spamRate > 1) {
      await supabase
			.from("warmup_campaigns")
			.update({
				status: "paused",
				pause_reason: `High ${
					bounceRate > 5 ? "bounce" : "spam"
				} rate detected`,
			})
			.eq("id", campaignId);

      console.log(`Campaign ${campaignId} paused due to high ${bounceRate > 5 ? 'bounce' : 'spam'} rate`);
    }
  } catch (error) {
    console.error('Error checking campaign health:', error);
  }
}

async function continueConversation(emailLog: any) {
	try {
		const supabase = await createClient();
		const { data: senderAccount, error: senderError } = await supabase
			.from("connected_emails")
			.select("email")
			.eq("id", emailLog.email_id)
			.single();

		if (senderError || !senderAccount) {
			console.error(
				"Could not find sender email account for emailLog:",
				emailLog.id
			);
			return;
		}
		const senderEmail = senderAccount.email;
		const recipientEmail = emailLog.recipient;

		// 2. Find the conversation
		const { data: conversation, error: convError } = await supabase
			.from("warmup_conversations")
			.select("*")
			.or(
				`and(sender_email.eq.${senderEmail},recipient_email.eq.${recipientEmail}),and(sender_email.eq.${recipientEmail},recipient_email.eq.${senderEmail})`
			)
			.single();

		if (convError || !conversation) {
			console.error("Conversation not found for emailLog:", emailLog.id);
			// Optionally, create a new conversation here if it's the first reply
			return;
		}

		// 3. Generate the reply
		// The original sender is now the recipient of the reply, and vice-versa.
		// We need to decide who sends the next email. Let's assume the user's connected email always replies.
		const reply = await warmupPoolManager.generateConversationEmail(
			conversation.id,
			"reply"
		);

		// 4. Send the reply from the user's connected account
		const aurinkoClient = await getAurinkoClient(emailLog.email_id);
		await aurinkoClient.sendMessage({
			subject: reply.subject,
			body: reply.body,
			to: [{ address: emailLog.recipient }], // The reply goes to the original recipient
		});

		console.log(`Sent reply for conversation ${conversation.id}`);
	} catch (error) {
		console.error("Error continuing conversation:", error);
	}
}
