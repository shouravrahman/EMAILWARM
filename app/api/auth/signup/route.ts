import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendUserWelcomeEmail } from '@/lib/email-notifications';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { email, password, name } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

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
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
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

  } catch (error) {
    console.error('Error in POST /api/auth/signup:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}