import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateEmailMXRecords } from '@/lib/email-validation';

export async function POST(
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

    // Get the email from database
    const { data: emailRecord, error: fetchError } = await supabase
      .from('warmup_email_pool')
      .select('email_address')
      .eq('id', id)
      .single();

    if (fetchError || !emailRecord) {
      return NextResponse.json({ error: 'Email not found' }, { status: 404 });
    }

    // Validate MX records
    const validation = await validateEmailMXRecords(emailRecord.email_address);

    // Update the record with verification results
    const { error: updateError } = await supabase
      .from('warmup_email_pool')
      .update({
        mx_verified: validation.valid,
        mx_records: validation.mxRecords || [],
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) throw updateError;

    return NextResponse.json({
      verified: validation.valid,
      reason: validation.reason,
      mxRecords: validation.mxRecords
    });
  } catch (error: any) {
    console.error('Error verifying warmup pool email:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify email' },
      { status: 500 }
    );
  }
}
