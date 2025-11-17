import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function DELETE(
  request: NextRequest,
  context: any
) {
  try {
    const { id } = context.params;
    const supabase = await createClient();

    // Check if user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete the email from warmup pool
    const { error } = await supabase
      .from('warmup_email_pool')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting warmup pool email:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete email' },
      { status: 500 }
    );
  }
}
