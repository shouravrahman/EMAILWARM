import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const campaign_id = searchParams.get('campaign_id');
    const status = searchParams.get('status');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    // Get user's campaigns first
    const { data: campaigns, error: campaignsError } = await supabase
      .from('warmup_campaigns')
      .select('id')
      .eq('user_id', user.id);

    if (campaignsError) {
      return NextResponse.json(
        { error: 'Failed to fetch campaigns' },
        { status: 500 }
      );
    }

    const campaignIds = campaigns?.map(c => c.id) || [];

    if (campaignIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        total: 0
      });
    }

    // Build query
    let query = supabase
      .from('email_logs')
      .select('*', { count: 'exact' })
      .in('campaign_id', campaignIds)
      .order('sent_at', { ascending: false });

    // Apply filters
    if (campaign_id) {
      query = query.eq('campaign_id', campaign_id);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    if (offset) {
      query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit || '50') - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch email logs' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      total: count || 0
    });

  } catch (error) {
    console.error('Error in GET /api/emails/logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      campaign_id, 
      email_id, 
      message_id, 
      subject, 
      recipient, 
      status = 'sent',
      metadata = {}
    } = body;

    // Validate required fields
    if (!campaign_id || !email_id || !message_id || !subject || !recipient) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify user owns this campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('warmup_campaigns')
      .select('id')
      .eq('id', campaign_id)
      .eq('user_id', user.id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found or unauthorized' },
        { status: 404 }
      );
    }

    // Create email log entry
    const { data, error } = await supabase
      .from('email_logs')
      .insert([{
        campaign_id,
        email_id,
        message_id,
        subject,
        recipient,
        status,
        sent_at: new Date().toISOString(),
        metadata
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
    console.error('Error in POST /api/emails/logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}