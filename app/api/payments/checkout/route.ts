import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { LemonSqueezyService } from '@/lib/lemonsqueezy';
import { PRICING_CONFIG, calculateSubscriptionCost } from '@/lib/pricing';
import { validateRequestBody, withErrorHandling, createErrorResponse } from '@/lib/validate-request';
import { subscriptionQuantitySchema } from '@/lib/validation-schemas';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return createErrorResponse('Unauthorized', 'AUTHENTICATION_REQUIRED', undefined, 401);
  }

  // Validate request body
  const result = await validateRequestBody(request, subscriptionQuantitySchema);
  
  if ('error' in result) {
    return result.error;
  }

  const { quantity: emailQuantity } = result.data as { quantity: number };

  // Get the variant ID from environment
  const variantId = process.env.LEMONSQUEEZY_VARIANT_ID;

  if (!variantId) {
    return createErrorResponse(
      'Payment system not configured',
      'INTERNAL_ERROR',
      undefined,
      500
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
    return createErrorResponse(
      'User already has an active subscription. Use the update endpoint to change quantity.',
      'VALIDATION_ERROR',
      undefined,
      400
    );
  }

  // Calculate total cost
  const totalCost = calculateSubscriptionCost(emailQuantity);

  // Create checkout session
  const checkoutData = {
    variantId,
    userId: user.id,
    userEmail: user.email!,
    emailQuantity,
    customData: {
      email_quantity: emailQuantity,
      price_per_email: PRICING_CONFIG.pricePerEmail,
      total_cost: totalCost
    }
  };

  const { checkoutUrl } = await LemonSqueezyService.createCheckoutSession(checkoutData);

  // Log checkout attempt
  await supabase
    .from('ai_generation_logs')
    .insert([{
      user_id: user.id,
      type: 'checkout_created',
      context: { emailQuantity, totalCost },
      generated_subject: 'Checkout Session Created',
      generated_body: `User initiated checkout for ${emailQuantity} email(s) at ${totalCost}/month`
    }]);

  return NextResponse.json({
    success: true,
    checkoutUrl,
    emailQuantity,
    pricePerEmail: PRICING_CONFIG.pricePerEmail,
    totalCost
  });
});

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
      pricing: PRICING_CONFIG
    });

  } catch (error) {
    console.error('Error fetching checkout data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch checkout data' },
      { status: 500 }
    );
  }
}
