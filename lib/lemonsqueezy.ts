import { lemonSqueezySetup, createCheckout, getSubscription, cancelSubscription, updateSubscription } from '@lemonsqueezy/lemonsqueezy.js';
import { supabase } from './supabase';

// Initialize LemonSqueezy
lemonSqueezySetup({
  apiKey: process.env.LEMONSQUEEZY_API_KEY!,
  onError: (error) => console.error('LemonSqueezy Error:', error),
});

export interface CheckoutData {
  variantId: string;
  userId: string;
  userEmail: string;
  customData?: Record<string, any>;
}

export interface SubscriptionData {
  id: string;
  status: string;
  planId: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  customerId: string;
}

export class LemonSqueezyService {
  static async createCheckoutSession(data: CheckoutData): Promise<{ checkoutUrl: string }> {
    try {
      const checkout = await createCheckout(process.env.LEMONSQUEEZY_STORE_ID!, data.variantId, {
        checkoutOptions: {
          embed: false,
          media: true,
          logo: true,
        },
        checkoutData: {
          email: data.userEmail,
          name: data.userEmail.split('@')[0],
          custom: {
            user_id: data.userId,
            ...data.customData
          }
        },
        productOptions: {
          enabledVariants: [data.variantId],
          redirectUrl: `${process.env.NEXTAUTH_URL}/dashboard?payment=success`,
          receiptButtonText: 'Go to Dashboard',
          receiptThankYouNote: 'Thank you for subscribing to WarmupPro!'
        }
      });

      if (!checkout.data?.attributes?.url) {
        throw new Error('Failed to create checkout session');
      }

      return {
        checkoutUrl: checkout.data.attributes.url
      };
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw new Error('Failed to create checkout session');
    }
  }

  static async getSubscriptionDetails(subscriptionId: string): Promise<SubscriptionData | null> {
    try {
      const subscription = await getSubscription(subscriptionId);
      
      if (!subscription.data) {
        return null;
      }

      const attrs = subscription.data.attributes;
      
      return {
        id: subscription.data.id,
        status: attrs.status,
        planId: attrs.variant_name?.toLowerCase() || 'starter',
        currentPeriodStart: attrs.renews_at,
        currentPeriodEnd: attrs.ends_at || attrs.renews_at,
        cancelAtPeriodEnd: attrs.cancelled,
        customerId: attrs.customer_id.toString()
      };
    } catch (error) {
      console.error('Error fetching subscription:', error);
      return null;
    }
  }

  static async cancelUserSubscription(subscriptionId: string): Promise<boolean> {
    try {
      await cancelSubscription(subscriptionId);
      return true;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      return false;
    }
  }

  static async updateUserSubscription(subscriptionId: string, variantId: string): Promise<boolean> {
    try {
      await updateSubscription(subscriptionId, {
        variantId: parseInt(variantId)
      });
      return true;
    } catch (error) {
      console.error('Error updating subscription:', error);
      return false;
    }
  }

  static async handleWebhookEvent(event: any): Promise<void> {
    try {
      const { meta, data } = event;
      const eventName = meta.event_name;
      const customData = data.attributes.first_subscription_item?.subscription?.custom_data;
      const userId = customData?.user_id;

      if (!userId) {
        console.error('No user_id found in webhook data');
        return;
      }

      switch (eventName) {
        case 'subscription_created':
        case 'subscription_updated':
          await this.updateUserSubscription(userId, data);
          break;
        
        case 'subscription_cancelled':
        case 'subscription_expired':
          await this.cancelUserSubscriptionInDB(userId);
          break;
        
        case 'subscription_resumed':
          await this.resumeUserSubscription(userId, data);
          break;
        
        default:
          console.log('Unhandled webhook event:', eventName);
      }
    } catch (error) {
      console.error('Error handling webhook event:', error);
      throw error;
    }
  }

  private static async updateUserSubscription(userId: string, subscriptionData: any): Promise<void> {
    const attrs = subscriptionData.attributes;
    
    // Determine plan based on variant
    let planId = 'starter';
    if (attrs.variant_name?.toLowerCase().includes('professional')) {
      planId = 'professional';
    } else if (attrs.variant_name?.toLowerCase().includes('enterprise')) {
      planId = 'enterprise';
    }

    const { error } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        lemonsqueezy_subscription_id: subscriptionData.id,
        lemonsqueezy_customer_id: attrs.customer_id.toString(),
        plan_id: planId,
        status: attrs.status,
        current_period_start: attrs.created_at,
        current_period_end: attrs.renews_at || attrs.ends_at,
        cancel_at_period_end: attrs.cancelled || false,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('Error updating user subscription:', error);
      throw error;
    }
  }

  private static async cancelUserSubscriptionInDB(userId: string): Promise<void> {
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'cancelled',
        cancel_at_period_end: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error canceling user subscription:', error);
      throw error;
    }
  }

  private static async resumeUserSubscription(userId: string, subscriptionData: any): Promise<void> {
    const attrs = subscriptionData.attributes;
    
    const { error } = await supabase
      .from('user_subscriptions')
      .update({
        status: 'active',
        cancel_at_period_end: false,
        current_period_end: attrs.renews_at || attrs.ends_at,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error resuming user subscription:', error);
      throw error;
    }
  }

  static verifyWebhookSignature(payload: string, signature: string): boolean {
    const crypto = require('crypto');
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET!;
    
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}