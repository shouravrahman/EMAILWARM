import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest, props: { params: Promise<{ listId: string }> }) {
  const params = await props.params;
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { listId } = params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    // Verify the list belongs to the user
    const { data: list, error: listError } = await supabase
      .from('prospect_lists')
      .select('*')
      .eq('id', listId)
      .eq('user_id', user.id)
      .single();

    if (listError || !list) {
      return NextResponse.json(
        { error: 'Prospect list not found' },
        { status: 404 }
      );
    }

    // Build query
    let query = supabase
      .from('prospects')
      .select('*', { count: 'exact' })
      .eq('list_id', listId)
      .eq('user_id', user.id);

    // Apply filters
    if (search) {
      query = query.or(
        `email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,company.ilike.%${search}%`
      );
    }

    if (status) {
      query = query.eq('status', status);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: prospects, error: prospectsError, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (prospectsError) {
      console.error('Error fetching prospects:', prospectsError);
      return NextResponse.json(
        { error: 'Failed to fetch prospects' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      list,
      prospects: prospects || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error in prospects fetch:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
