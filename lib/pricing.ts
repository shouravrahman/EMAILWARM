// Unified per-email pricing model with bundle discounts
export const PRICING_CONFIG = {
  pricePerEmail: 5, // $5 per email address per month (base price)
  trialDays: 10, // 10-day free trial
  trialEmailLimit: 5, // Up to 5 emails during trial
  currency: 'USD',
  features: [
    'AI-Powered Email Warmup',
    'Real-time Analytics',
    'Advanced Reporting',
    'Multi-Provider Support (Gmail, Outlook, SMTP)',
    'API Access',
    'Priority Support',
    'Custom Templates',
    'Advanced Security',
    '99.9% Uptime SLA'
  ],
  // Bundle pricing tiers with discounts
  bundles: [
    {
      quantity: 1,
      pricePerEmail: 5,
      totalPrice: 5,
      discount: 0,
      popular: false,
      name: 'Starter'
    },
    {
      quantity: 3,
      pricePerEmail: 3.33, // $10 for 3 emails
      totalPrice: 10,
      discount: 33, // 33% off
      popular: true,
      name: 'Growth'
    },
    {
      quantity: 5,
      pricePerEmail: 3, // $15 for 5 emails
      totalPrice: 15,
      discount: 40, // 40% off
      popular: false,
      name: 'Professional'
    },
    {
      quantity: 10,
      pricePerEmail: 2.5, // $25 for 10 emails
      totalPrice: 25,
      discount: 50, // 50% off
      popular: false,
      name: 'Business'
    }
  ]
};

// Cost analysis (monthly)
export const COST_ANALYSIS = {
  // Gemini 1.5 Flash: $0.075 per 1M input tokens, $0.30 per 1M output tokens
  // Average email generation: ~500 input tokens, ~200 output tokens
  // Cost per email generation: ~$0.0001
  aiCostPerEmail: 0.0001,
  
  // Aurinko API: ~$0.001 per API call (send + track)
  aurinkoCostPerEmail: 0.001,
  
  // Infrastructure costs (servers, database, monitoring)
  infrastructureCostPerUser: 2,
  
  // Support and operational costs
  operationalCostPerUser: 1,
  
  // Total cost per email (excluding infrastructure)
  totalCostPerEmail: 0.0011
};

export interface UserSubscription {
  user_id: string;
  lemonsqueezy_subscription_id: string;
  lemonsqueezy_customer_id: string;
  status: 'trial' | 'trialing' | 'active' | 'cancelled' | 'expired';
  email_quantity: number;
  price_per_email: number;
  total_monthly_cost: number;
  trial_ends_at: string | null;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Calculate the total monthly subscription cost based on email quantity
 * Uses bundle pricing when available, otherwise calculates at base rate
 * @param emailCount Number of email addresses to warm up
 * @returns Total monthly cost in dollars
 */
export function calculateSubscriptionCost(emailCount: number): number {
  if (emailCount < 1) {
    throw new Error('Email count must be at least 1');
  }
  
  // Check if there's an exact bundle match
  const bundle = PRICING_CONFIG.bundles.find(b => b.quantity === emailCount);
  if (bundle) {
    return bundle.totalPrice;
  }
  
  // For quantities not in bundles, use base price
  return emailCount * PRICING_CONFIG.pricePerEmail;
}

/**
 * Get the best pricing information for a given email quantity
 * @param emailCount Number of email addresses
 * @returns Pricing details including per-email cost and any discounts
 */
export function getPricingForQuantity(emailCount: number): {
  quantity: number;
  totalPrice: number;
  pricePerEmail: number;
  discount: number;
  savings: number;
  bundleName?: string;
} {
  if (emailCount < 1) {
    throw new Error('Email count must be at least 1');
  }
  
  // Check for exact bundle match
  const bundle = PRICING_CONFIG.bundles.find(b => b.quantity === emailCount);
  if (bundle) {
    const regularPrice = emailCount * PRICING_CONFIG.pricePerEmail;
    return {
      quantity: bundle.quantity,
      totalPrice: bundle.totalPrice,
      pricePerEmail: bundle.pricePerEmail,
      discount: bundle.discount,
      savings: regularPrice - bundle.totalPrice,
      bundleName: bundle.name
    };
  }
  
  // No bundle, use base pricing
  const totalPrice = emailCount * PRICING_CONFIG.pricePerEmail;
  return {
    quantity: emailCount,
    totalPrice,
    pricePerEmail: PRICING_CONFIG.pricePerEmail,
    discount: 0,
    savings: 0
  };
}

/**
 * Check if a user is currently in their trial period
 * @param subscription User subscription object
 * @returns True if user is in trial period
 */
export function isInTrial(subscription: UserSubscription | null): boolean {
  if (!subscription) return false;
  if (!subscription.trial_ends_at) return false;
  if (subscription.status !== 'trial' && subscription.status !== 'trialing') return false;
  return new Date(subscription.trial_ends_at) > new Date();
}

/**
 * Get the email limit for a user based on their subscription status
 * @param subscription User subscription object
 * @returns Number of emails the user can connect
 */
export function getEmailLimit(subscription: UserSubscription | null): number {
  if (!subscription) {
    return PRICING_CONFIG.trialEmailLimit;
  }
  
  if (isInTrial(subscription)) {
    return PRICING_CONFIG.trialEmailLimit;
  }
  
  if (subscription.status === 'active') {
    return subscription.email_quantity;
  }
  
  // Expired or cancelled subscriptions get trial limit
  return PRICING_CONFIG.trialEmailLimit;
}

/**
 * Calculate profit margin for a given email quantity
 * @param emailCount Number of email addresses
 * @returns Profit analysis object
 */
export function calculateProfitMargin(emailCount: number) {
  const revenue = calculateSubscriptionCost(emailCount);
  const monthlyCost = 
    (emailCount * 30 * 50 * COST_ANALYSIS.totalCostPerEmail) + // Assuming 50 emails/day per account
    COST_ANALYSIS.infrastructureCostPerUser + 
    COST_ANALYSIS.operationalCostPerUser;
  
  const profit = revenue - monthlyCost;
  const margin = profit / revenue;
  
  return {
    revenue,
    costs: monthlyCost,
    profit,
    margin: Math.round(margin * 100)
  };
}