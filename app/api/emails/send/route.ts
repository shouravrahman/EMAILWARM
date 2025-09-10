import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAurinkoClient } from '@/lib/aurinko';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { campaign_id, email_id, recipient, subject, content, tracking_context } = body;

    // Validate required fields
    if (!campaign_id || !email_id || !recipient || !subject || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get email account details
    const { data: emailAccount, error: emailError } = await supabase
      .from('connected_emails')
      .select('*')
      .eq('id', email_id)
      .single();

    if (emailError || !emailAccount) {
      return NextResponse.json(
        { error: 'Email account not found' },
        { status: 404 }
      );
    }

    // Get Aurinko client with valid tokens
    const aurinkoClient = await getAurinkoClient(email_id);

    // Prepare email message
    const emailMessage = {
      subject,
      body: content,
      to: [{ address: recipient }],
      tracking: {
        opens: true,
        threadReplies: true,
        context: tracking_context || `campaign_${campaign_id}`
      }
    };

    // Send email via Aurinko API
    const sendResponse = await aurinkoClient.sendMessage(emailMessage);

    if (sendResponse.id) {
      // Log the email send
      const { error: logError } = await supabase
        .from('email_logs')
        .insert([{
          campaign_id,
          email_id,
          message_id: sendResponse.id,
          subject,
          recipient,
          status: 'sent',
          sent_at: new Date().toISOString()
        }]);

      if (logError) {
        console.error('Error logging email:', logError);
        return NextResponse.json(
          { error: 'Failed to log email send' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message_id: sendResponse.id,
        message: 'Email sent successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send email via Aurinko' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in POST /api/emails/send:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}