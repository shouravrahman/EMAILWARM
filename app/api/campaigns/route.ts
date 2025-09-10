import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, email_id, start_date, end_date, daily_volume, settings } = body;

    // Validate required fields
    if (!name || !email_id || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check user subscription limits
    const { data: limits } = await supabase
      .rpc('check_user_limits', { p_user_id: user.id });
    
    if (!limits?.[0]?.can_create_campaign) {
      return NextResponse.json(
        { error: 'Campaign limit reached. Please upgrade your plan.' },
        { status: 403 }
      );
    }

    // Create campaign
    const { data, error } = await supabase
      .from('warmup_campaigns')
      .insert([{
        user_id: user.id,
        name,
        email_id,
        start_date,
        end_date,
        daily_volume: daily_volume || 5,
        settings: settings || {},
        status: 'draft'
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating campaign:', error);
      return NextResponse.json(
        { error: 'Failed to create campaign' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/campaigns:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const { data, error } = await supabase
      .from('warmup_campaigns')
      .select(`
        *,
        connected_emails (
          email_address,
          provider,
          status
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching campaigns:', error);
      return NextResponse.json(
        { error: 'Failed to fetch campaigns' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in GET /api/campaigns:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}