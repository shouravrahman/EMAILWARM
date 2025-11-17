import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAurinkoClient } from '@/lib/aurinko';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const emailId = params.id;

    // Check if the user owns this email
    const { data: email, error: emailError } = await supabase
      .from('connected_emails')
      .select('id, provider')
      .eq('id', emailId)
      .eq('user_id', user.id)
      .single();

    if (emailError || !email) {
      return NextResponse.json({ error: 'Email account not found' }, { status: 404 });
    }

    // For OAuth accounts, re-trigger Aurinko sync
    if (email.provider !== 'smtp') {
      const aurinkoClient = await getAurinkoClient(emailId);
      await aurinkoClient.startSync(30, false);
    }

    // For SMTP accounts, we can't re-sync, but we can update the timestamp
    await supabase
      .from('connected_emails')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', emailId);

    return NextResponse.json({ success: true, message: 'Sync requested successfully' });

  } catch (error: any) {
    console.error('Error syncing email account:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
