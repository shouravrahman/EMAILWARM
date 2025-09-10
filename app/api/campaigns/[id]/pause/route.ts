import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update campaign status to paused
    const { error: updateError } = await supabase
      .from('warmup_campaigns')
      .update({ 
        status: 'paused',
        paused_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to pause campaign' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Campaign paused successfully'
    });

  } catch (error) {
    console.error('Error pausing campaign:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}