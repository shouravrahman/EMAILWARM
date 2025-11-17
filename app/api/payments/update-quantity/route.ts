import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { LemonSqueezyService } from '@/lib/lemonsqueezy';
import { calculateSubscriptionCost, PRICING_CONFIG } from '@/lib/pricing';
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

  // Get user's current subscription
  const { data: subscription, error: subError } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (subError || !subscription) {
    return createErrorResponse(
      'No active subscription found',
      'RESOURCE_NOT_FOUND',
      undefined,
      404
    );
  }

  if (subscription.status !== 'active') {
    return createErrorResponse(
      'Subscription is not active',
      'VALIDATION_ERROR',
      undefined,
      400
    );
  }

  // Update quantity in LemonSqueezy
  const success = await LemonSqueezyService.updateSubscriptionQuantity(
    subscription.lemonsqueezy_subscription_id,
    emailQuantity
  );

  if (!success) {
    throw new Error('Failed to update subscription quantity in payment provider');
  }

  // Calculate new cost
  const totalCost = calculateSubscriptionCost(emailQuantity);

  // Update in database
  const { error: updateError } = await supabase
    .from('user_subscriptions')
    .update({
      email_quantity: emailQuantity,
      price_per_email: PRICING_CONFIG.pricePerEmail,
      total_monthly_cost: totalCost,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', user.id);

  if (updateError) {
    console.error('Error updating subscription in database:', updateError);
    throw new Error('Failed to update subscription in database');
  }

  // Log the update
  await supabase
    .from('ai_generation_logs')
    .insert([{
      user_id: user.id,
      type: 'subscription_updated',
      context: { 
        old_quantity: subscription.email_quantity,
        new_quantity: emailQuantity,
        new_cost: totalCost
      },
      generated_subject: 'Subscription Quantity Updated',
      generated_body: `User updated subscription from ${subscription.email_quantity} to ${emailQuantity} email(s)`
    }]);

  return NextResponse.json({
    success: true,
    emailQuantity,
    pricePerEmail: PRICING_CONFIG.pricePerEmail,
    totalCost
  });
});
