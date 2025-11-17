import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendUserWelcomeEmail } from '@/lib/email-notifications';
import { validateRequestBody, withErrorHandling, createErrorResponse } from '@/lib/validate-request';
import { userSignupSchema } from '@/lib/validation-schemas';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createClient();
  
  // Validate request body
  const result = await validateRequestBody(request, userSignupSchema);
  
  if ('error' in result) {
    return result.error;
  }

  const { email, password, name } = result.data;

  // Create user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name || email.split('@')[0],
        role: 'user'
      }
    }
  });

  if (error) {
    return createErrorResponse(
      error.message,
      'VALIDATION_ERROR',
      undefined,
      400
    );
  }

  if (data.user) {
    // Create initial subscription record (14-day trial)
    const { error: subError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: data.user.id,
        plan_id: 'trial',
        status: 'trialing',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        current_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      });

    if (subError) {
      console.error('Error creating subscription record:', subError);
    }

    // Send welcome email
    try {
      await sendUserWelcomeEmail(data.user.id);
    } catch (emailError) {
      console.error('Error sending welcome email:', emailError);
      // Don't fail signup if email fails
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Account created successfully',
    user: data.user
  });
});