import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user owns this campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('warmup_campaigns')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Get email logs for this campaign
    const { data: emailLogs, error: logsError } = await supabase
      .from('email_logs')
      .select('*')
      .eq('campaign_id', params.id)
      .order('sent_at', { ascending: false });

    if (logsError) {
      return NextResponse.json(
        { error: 'Failed to fetch email logs' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: emailLogs || []
    });

  } catch (error) {
    console.error('Error in GET /api/campaigns/[id]/emails:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { subject, recipient, message_id, status = 'sent' } = body;

    // Validate required fields
    if (!subject || !recipient || !message_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify user owns this campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('warmup_campaigns')
      .select('email_id')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Create email log entry
    const { data, error } = await supabase
      .from('email_logs')
      .insert([{
        campaign_id: params.id,
        email_id: campaign.email_id,
        message_id,
        subject,
        recipient,
        status,
        sent_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create email log' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error in POST /api/campaigns/[id]/emails:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}