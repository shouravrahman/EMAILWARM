// Competitive pricing analysis and configuration
export const PRICING_PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 15, // $15/month - competitive with Warmup Inbox ($25), Lemwarm ($29)
    yearlyPrice: 150, // $150/year (2 months free)
    emailAccounts: 3,
    dailyVolume: 150, // 50 per account
    features: [
      '3 Email Accounts',
      '150 Emails/Day',
      'Basic AI Content',
      'Standard Analytics',
      'Email Support',
      'Gmail & Outlook Support'
    ],
    lemonsqueezyVariantId: process.env.LEMONSQUEEZY_STARTER_VARIANT_ID,
    yearlyVariantId: process.env.LEMONSQUEEZY_STARTER_YEARLY_VARIANT_ID,
    popular: false
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    price: 39, // $39/month - competitive with Mailwarm ($49), Warmup Inbox ($69)
    yearlyPrice: 390, // $390/year (2 months free)
    emailAccounts: 10,
    dailyVolume: 1000, // 100 per account
    features: [
      '10 Email Accounts',
      '1,000 Emails/Day',
      'Advanced AI Content',
      'Real-time Analytics',
      'Priority Support',
      'Custom Templates',
      'Advanced Reporting',
      'Multi-Provider Support',
      'API Access'
    ],
    lemonsqueezyVariantId: process.env.LEMONSQUEEZY_PRO_VARIANT_ID,
    yearlyVariantId: process.env.LEMONSQUEEZY_PRO_YEARLY_VARIANT_ID,
    popular: true
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99, // $99/month - competitive with enterprise plans
    yearlyPrice: 990, // $990/year (2 months free)
    emailAccounts: 50,
    dailyVolume: 5000, // 100 per account
    features: [
      '50 Email Accounts',
      '5,000 Emails/Day',
      'Premium AI Content',
      'Advanced Analytics',
      'White-label Option',
      'API Access',
      'Dedicated Support',
      'Custom Integrations',
      'SLA Guarantee',
      'Custom SMTP Support',
      'Advanced Security'
    ],
    lemonsqueezyVariantId: process.env.LEMONSQUEEZY_ENTERPRISE_VARIANT_ID,
    yearlyVariantId: process.env.LEMONSQUEEZY_ENTERPRISE_YEARLY_VARIANT_ID,
    popular: false
  }
};

// Cost analysis per plan (monthly)
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
  totalCostPerEmail: 0.0011,
  
  // Profit margins by plan
  margins: {
    starter: 0.85, // 85% margin
    professional: 0.88, // 88% margin  
    enterprise: 0.92 // 92% margin
  }
};

export function calculatePlanCosts(plan: keyof typeof PRICING_PLANS) {
  const planData = PRICING_PLANS[plan];
  const monthlyCost = 
    (planData.dailyVolume * 30 * COST_ANALYSIS.totalCostPerEmail) + 
    COST_ANALYSIS.infrastructureCostPerUser + 
    COST_ANALYSIS.operationalCostPerUser;
  
  const revenue = planData.price;
  const profit = revenue - monthlyCost;
  const margin = profit / revenue;
  
  return {
    revenue,
    costs: monthlyCost,
    profit,
    margin: Math.round(margin * 100)
  };
}

export function getUserPlanLimits(subscriptionStatus: string, planId?: string) {
  if (subscriptionStatus !== 'active') {
    return {
      emailAccounts: 1,
      dailyVolume: 10,
      features: ['1 Email Account', '10 Emails/Day', 'Basic Features']
    };
  }
  
  const plan = planId ? PRICING_PLANS[planId as keyof typeof PRICING_PLANS] : PRICING_PLANS.starter;
  return {
    emailAccounts: plan.emailAccounts,
    dailyVolume: plan.dailyVolume,
    features: plan.features
  };
}