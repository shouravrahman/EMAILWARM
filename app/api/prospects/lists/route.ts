import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
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

    // Fetch prospect lists for the user
    const { data: lists, error: listsError } = await supabase
      .from('prospect_lists')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (listsError) {
      console.error('Error fetching prospect lists:', listsError);
      return NextResponse.json(
        { error: 'Failed to fetch prospect lists' },
        { status: 500 }
      );
    }

    // For each list, get prospect stats
    const listsWithStats = await Promise.all(
      (lists || []).map(async (list: any) => {
        const { count: totalCount } = await supabase
          .from('prospects')
          .select('*', { count: 'exact', head: true })
          .eq('list_id', list.id);

        const { count: activeCount } = await supabase
          .from('prospects')
          .select('*', { count: 'exact', head: true })
          .eq('list_id', list.id)
          .eq('status', 'active');

        const { count: contactedCount } = await supabase
          .from('prospects')
          .select('*', { count: 'exact', head: true })
          .eq('list_id', list.id)
          .in('status', ['contacted', 'engaged', 'replied']);

        const { count: repliedCount } = await supabase
          .from('prospects')
          .select('*', { count: 'exact', head: true })
          .eq('list_id', list.id)
          .eq('status', 'replied');

        return {
          ...list,
          stats: {
            total: totalCount || 0,
            active: activeCount || 0,
            contacted: contactedCount || 0,
            replied: repliedCount || 0,
          },
        };
      })
    );

    return NextResponse.json({
      lists: listsWithStats,
    });
  } catch (error) {
    console.error('Error in prospect lists fetch:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const listId = searchParams.get('listId');

    if (!listId) {
      return NextResponse.json(
        { error: 'List ID is required' },
        { status: 400 }
      );
    }

    // Delete the prospect list (cascades to prospects)
    const { error: deleteError } = await supabase
      .from('prospect_lists')
      .delete()
      .eq('id', listId)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting prospect list:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete prospect list' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Prospect list deleted successfully',
    });
  } catch (error) {
    console.error('Error in prospect list deletion:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
