import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { LemonSqueezyService } from '@/lib/lemonsqueezy';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-signature');

    // Verify webhook signature
    if (!signature || !LemonSqueezyService.verifyWebhookSignature(body, signature)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);
    const { meta, data } = event;
    const eventName = meta.event_name;

    console.log('Received LemonSqueezy webhook:', eventName, data.id);

    // Handle different webhook events
    switch (eventName) {
      case 'subscription_created':
        await handleSubscriptionCreated(data);
        break;
      
      case 'subscription_updated':
        await handleSubscriptionUpdated(data);
        break;
      
      case 'subscription_cancelled':
        await handleSubscriptionCancelled(data);
        break;
      
      case 'subscription_resumed':
        await handleSubscriptionResumed(data);
        break;
      
      case 'subscription_expired':
        await handleSubscriptionExpired(data);
        break;
      
      case 'subscription_paused':
        await handleSubscriptionPaused(data);
        break;
      
      case 'subscription_unpaused':
        await handleSubscriptionUnpaused(data);
        break;

      default:
        console.log('Unhandled webhook event:', eventName);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleSubscriptionCreated(data: any) {
  try {
    const supabase = await createClient();
    const attrs = data.attributes;
    const customData = attrs.custom_data;
    const userId = customData?.userId;

    if (!userId) {
      console.error('No userId found in subscription data');
      return;
    }

    // Determine plan based on variant
    let planId = 'starter';
    const variantName = attrs.variant_name?.toLowerCase() || '';
    
    if (variantName.includes('professional') || variantName.includes('pro')) {
      planId = 'professional';
    } else if (variantName.includes('enterprise')) {
      planId = 'enterprise';
    }

    // Create or update subscription
    const { error } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        lemonsqueezy_subscription_id: data.id,
        lemonsqueezy_customer_id: attrs.customer_id.toString(),
        plan_id: planId,
        status: attrs.status,
        current_period_start: attrs.created_at,
        current_period_end: attrs.renews_at || attrs.ends_at,
        cancel_at_period_end: false,
        trial_ends_at: attrs.trial_ends_at,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }

    console.log('Subscription created successfully:', data.id);
  } catch (error) {
    console.error('Error handling subscription_created:', error);
    throw error;
  }
}

async function handleSubscriptionUpdated(data: any) {
  try {
    const supabase = await createClient();
    const attrs = data.attributes;

    // Determine plan based on variant
    let planId = 'starter';
    const variantName = attrs.variant_name?.toLowerCase() || '';
    
    if (variantName.includes('professional') || variantName.includes('pro')) {
      planId = 'professional';
    } else if (variantName.includes('enterprise')) {
      planId = 'enterprise';
    }

    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        plan_id: planId,
        status: attrs.status,
        current_period_start: attrs.created_at,
        current_period_end: attrs.renews_at || attrs.ends_at,
        cancel_at_period_end: attrs.cancelled || false,
        trial_ends_at: attrs.trial_ends_at,
        updated_at: new Date().toISOString()
      })
      .eq('lemonsqueezy_subscription_id', data.id);

    if (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }

    console.log('Subscription updated successfully:', data.id);
  } catch (error) {
    console.error('Error handling subscription_updated:', error);
    throw error;
  }
}

async function handleSubscriptionCancelled(data: any) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'cancelled',
        cancel_at_period_end: true,
        updated_at: new Date().toISOString()
      })
      .eq('lemonsqueezy_subscription_id', data.id);

    if (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }

    console.log('Subscription cancelled successfully:', data.id);
  } catch (error) {
    console.error('Error handling subscription_cancelled:', error);
    throw error;
  }
}

async function handleSubscriptionResumed(data: any) {
  try {
    const supabase = await createClient();
    const attrs = data.attributes;

    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'active',
        cancel_at_period_end: false,
        current_period_end: attrs.renews_at || attrs.ends_at,
        updated_at: new Date().toISOString()
      })
      .eq('lemonsqueezy_subscription_id', data.id);

    if (error) {
      console.error('Error resuming subscription:', error);
      throw error;
    }

    console.log('Subscription resumed successfully:', data.id);
  } catch (error) {
    console.error('Error handling subscription_resumed:', error);
    throw error;
  }
}

async function handleSubscriptionExpired(data: any) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString()
      })
      .eq('lemonsqueezy_subscription_id', data.id);

    if (error) {
      console.error('Error expiring subscription:', error);
      throw error;
    }

    // Pause all active campaigns for this user
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('user_id')
      .eq('lemonsqueezy_subscription_id', data.id)
      .single();

    if (subscription) {
      await supabase
        .from('warmup_campaigns')
        .update({ status: 'paused' })
        .eq('user_id', subscription.user_id)
        .eq('status', 'active');
    }

    console.log('Subscription expired successfully:', data.id);
  } catch (error) {
    console.error('Error handling subscription_expired:', error);
    throw error;
  }
}

async function handleSubscriptionPaused(data: any) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'past_due',
        updated_at: new Date().toISOString()
      })
      .eq('lemonsqueezy_subscription_id', data.id);

    if (error) {
      console.error('Error pausing subscription:', error);
      throw error;
    }

    console.log('Subscription paused successfully:', data.id);
  } catch (error) {
    console.error('Error handling subscription_paused:', error);
    throw error;
  }
}

async function handleSubscriptionUnpaused(data: any) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('lemonsqueezy_subscription_id', data.id);

    if (error) {
      console.error('Error unpausing subscription:', error);
      throw error;
    }

    console.log('Subscription unpaused successfully:', data.id);
  } catch (error) {
    console.error('Error handling subscription_unpaused:', error);
    throw error;
  }
}