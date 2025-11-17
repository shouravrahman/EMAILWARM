import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateEmail } from '@/lib/email-validation';
import { validateRequestBody, withErrorHandling, createErrorResponse } from '@/lib/validate-request';
import { warmupPoolEmailSchema } from '@/lib/validation-schemas';

export async function GET() {
  try {
    const supabase = await createClient();

    // Check if user is authenticated and is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all warmup pool emails
    const { data: emails, error } = await supabase
      .from('warmup_email_pool')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ emails });
  } catch (error: any) {
    console.error('Error fetching warmup pool emails:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch emails' },
      { status: 500 }
    );
  }
}

export const POST = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createClient();

  // Check if user is authenticated and is admin
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return createErrorResponse('Unauthorized', 'AUTHENTICATION_REQUIRED', undefined, 401);
  }

  // Validate request body
  const result = await validateRequestBody(request, warmupPoolEmailSchema);
  
  if ('error' in result) {
    return result.error;
  }

  const { email, provider } = result.data as { email: string; provider: string };

  // Validate email format and MX records
  const validation = await validateEmail(email);
  
  if (!validation.valid) {
    return createErrorResponse(
      validation.reason || 'Invalid email',
      'VALIDATION_ERROR',
      undefined,
      400
    );
  }

  // Insert into database
  const { data, error } = await supabase
    .from('warmup_email_pool')
    .insert([{
      email_address: email.toLowerCase(),
      provider,
      status: 'active',
      mx_verified: validation.valid,
      mx_records: validation.mxRecords || []
    }])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') { // Unique constraint violation
      return createErrorResponse(
        'Email already exists in warmup pool',
        'VALIDATION_ERROR',
        undefined,
        409
      );
    }
    throw error;
  }

  return NextResponse.json({ email: data }, { status: 201 });
});
