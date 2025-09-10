import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { LemonSqueezyService } from '@/lib/lemonsqueezy';
import { PRICING_PLANS } from '@/lib/pricing';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { planId, billingCycle = 'monthly' } = body;

    // Validate plan
    if (!planId || !PRICING_PLANS[planId as keyof typeof PRICING_PLANS]) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    const plan = PRICING_PLANS[planId as keyof typeof PRICING_PLANS];
    
    // Get the correct variant ID based on billing cycle
    const variantId = billingCycle === 'yearly' 
      ? plan.yearlyVariantId 
      : plan.lemonsqueezyVariantId;

    if (!variantId) {
      return NextResponse.json(
        { error: 'Plan variant not configured' },
        { status: 500 }
      );
    }

    // Check if user already has an active subscription
    const { data: existingSubscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (existingSubscription) {
      return NextResponse.json(
        { error: 'User already has an active subscription' },
        { status: 400 }
      );
    }

    // Create checkout session
    const checkoutData = {
      variantId,
      userId: user.id,
      userEmail: user.email!,
      customData: {
        planId,
        billingCycle,
        userId: user.id
      }
    };

    const { checkoutUrl } = await LemonSqueezyService.createCheckoutSession(checkoutData);

    // Log checkout attempt
    await supabase
      .from('ai_generation_logs')
      .insert([{
        user_id: user.id,
        type: 'checkout_created',
        context: { planId, billingCycle },
        generated_subject: 'Checkout Session Created',
        generated_body: `User initiated checkout for ${planId} plan`
      }]);

    return NextResponse.json({
      success: true,
      checkoutUrl,
      planId,
      billingCycle
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
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

    // Get user's current subscription
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Get usage limits
    const { data: limits } = await supabase
      .rpc('check_user_limits', { p_user_id: user.id });

    return NextResponse.json({
      success: true,
      subscription: subscription || null,
      limits: limits?.[0] || null,
      availablePlans: PRICING_PLANS
    });

  } catch (error) {
    console.error('Error fetching checkout data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch checkout data' },
      { status: 500 }
    );
  }
}