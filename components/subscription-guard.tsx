'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { PRICING_PLANS, getUserPlanLimits } from '@/lib/pricing';
import { LemonSqueezyService } from '@/lib/lemonsqueezy';
import {
  Crown,
  AlertTriangle,
  Zap,
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard
} from 'lucide-react';

interface SubscriptionGuardProps {
  children: React.ReactNode;
  feature?: string;
  requiredPlan?: 'starter' | 'professional' | 'enterprise';
  fallback?: React.ReactNode;
}

interface UserLimits {
  emailAccounts: number;
  dailyVolume: number;
  features: string[];
  currentUsage: {
    emailAccounts: number;
    dailyEmailsSent: number;
  };
}

export default function SubscriptionGuard({ 
  children, 
  feature, 
  requiredPlan = 'starter',
  fallback 
}: SubscriptionGuardProps) {
  const [subscription, setSubscription] = useState<any>(null);
  const [limits, setLimits] = useState<UserLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get subscription status
      const { data: subData } = await supabase
        .rpc('get_user_subscription_status', { p_user_id: user.id });

      const subscriptionStatus = subData?.[0] || {
        has_active_subscription: false,
        plan_id: 'trial',
        status: 'trial'
      };

      setSubscription(subscriptionStatus);

      // Get usage limits
      const { data: limitsData } = await supabase
        .rpc('check_user_limits', { p_user_id: user.id });

      const userLimits = limitsData?.[0];
      
      if (userLimits) {
        setLimits({
          emailAccounts: userLimits.email_accounts_limit,
          dailyVolume: userLimits.daily_volume_limit,
          features: getUserPlanLimits(subscriptionStatus.status, subscriptionStatus.plan_id).features,
          currentUsage: {
            emailAccounts: userLimits.current_email_accounts,
            dailyEmailsSent: 0 // TODO: Calculate from today's logs
          }
        });
      }
    } catch (error) {
      console.error('Error loading subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    setUpgrading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const plan = PRICING_PLANS[planId as keyof typeof PRICING_PLANS];
      const checkoutData = {
        variantId: plan.lemonsqueezyVariantId!,
        userId: user.id,
        userEmail: user.email!,
        customData: { planId }
      };

      const { checkoutUrl } = await LemonSqueezyService.createCheckoutSession(checkoutData);
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Error creating checkout:', error);
    } finally {
      setUpgrading(false);
    }
  };

  const hasAccess = () => {
    if (!subscription) return false;
    
    // Trial users get basic access
    if (subscription.status === 'trial') {
      return requiredPlan === 'starter';
    }
    
    // Check if user has required plan or higher
    if (subscription.status === 'active') {
      const planHierarchy = ['starter', 'professional', 'enterprise'];
      const userPlanIndex = planHierarchy.indexOf(subscription.plan_id);
      const requiredPlanIndex = planHierarchy.indexOf(requiredPlan);
      return userPlanIndex >= requiredPlanIndex;
    }
    
    return false;
  };

  const isTrialExpired = () => {
    if (!subscription?.trial_ends_at) return false;
    return new Date(subscription.trial_ends_at) < new Date();
  };

  const getTrialDaysLeft = () => {
    if (!subscription?.trial_ends_at) return 0;
    const daysLeft = Math.ceil(
      (new Date(subscription.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(0, daysLeft);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Show upgrade prompt if access denied
  if (!hasAccess() || isTrialExpired()) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Crown className="h-8 w-8 text-white" />
          </div>
          
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {isTrialExpired() ? 'Trial Expired' : 'Upgrade Required'}
          </h3>
          
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {isTrialExpired() 
              ? 'Your free trial has ended. Upgrade to continue using WarmupPro.'
              : `This feature requires the ${requiredPlan} plan or higher.`
            }
          </p>

          {subscription?.status === 'trial' && !isTrialExpired() && (
            <Alert className="mb-6 border-orange-200 bg-orange-50 dark:bg-orange-900/20">
              <Clock className="h-4 w-4" />
              <AlertDescription>
                <strong>{getTrialDaysLeft()} days left</strong> in your free trial
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {Object.entries(PRICING_PLANS).map(([key, plan]) => (
              <Card key={key} className={`border-2 transition-all cursor-pointer hover:shadow-lg ${
                plan.popular 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
                  : 'border-gray-200 dark:border-gray-700'
              }`}>
                <CardContent className="p-4 text-center">
                  {plan.popular && (
                    <Badge className="bg-blue-600 text-white mb-2">Most Popular</Badge>
                  )}
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    {plan.name}
                  </h4>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    ${plan.price}
                    <span className="text-sm font-normal text-gray-600 dark:text-gray-300">/mo</span>
                  </div>
                  <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1 mb-4">
                    {plan.features.slice(0, 3).map((feature, index) => (
                      <li key={index} className="flex items-center space-x-2">
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    size="sm"
                    onClick={() => handleUpgrade(key)}
                    disabled={upgrading}
                    className={`w-full ${
                      plan.popular 
                        ? 'bg-blue-600 hover:bg-blue-700' 
                        : 'bg-gray-600 hover:bg-gray-700'
                    }`}
                  >
                    {upgrading ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Processing...</span>
                      </div>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Upgrade
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>No setup fees</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show usage limits for active users
  if (limits && subscription?.status === 'active') {
    const emailUsagePercent = (limits.currentUsage.emailAccounts / limits.emailAccounts) * 100;
    const volumeUsagePercent = (limits.currentUsage.dailyEmailsSent / limits.dailyVolume) * 100;

    return (
      <div className="space-y-4">
        {/* Usage Warning */}
        {(emailUsagePercent > 80 || volumeUsagePercent > 80) && (
          <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You're approaching your plan limits. Consider upgrading to avoid service interruption.
            </AlertDescription>
          </Alert>
        )}

        {/* Usage Stats */}
        <Card className="border-0 shadow-sm bg-white/60 backdrop-blur-sm dark:bg-gray-800/60">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Plan Usage
              </span>
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 capitalize">
                {subscription.plan_id}
              </Badge>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Email Accounts</span>
                  <span>{limits.currentUsage.emailAccounts}/{limits.emailAccounts}</span>
                </div>
                <Progress value={emailUsagePercent} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Daily Volume</span>
                  <span>{limits.currentUsage.dailyEmailsSent}/{limits.dailyVolume}</span>
                </div>
                <Progress value={volumeUsagePercent} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {children}
      </div>
    );
  }

  return <>{children}</>;
}

// Hook for checking subscription status
export function useSubscription() {
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .rpc('get_user_subscription_status', { p_user_id: user.id });

        setSubscription(data?.[0] || null);
      } catch (error) {
        console.error('Error loading subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSubscription();
  }, [supabase]);

  const hasFeature = (feature: string) => {
    if (!subscription) return false;
    if (subscription.status === 'trial') return true;
    if (subscription.status !== 'active') return false;
    
    const plan = PRICING_PLANS[subscription.plan_id as keyof typeof PRICING_PLANS];
    return plan?.features.some(f => f.toLowerCase().includes(feature.toLowerCase())) || false;
  };

  const canAddEmailAccount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { data } = await supabase
        .rpc('check_user_limits', { p_user_id: user.id });

      return data?.[0]?.can_add_email || false;
    } catch (error) {
      console.error('Error checking limits:', error);
      return false;
    }
  };

  return {
    subscription,
    loading,
    hasFeature,
    canAddEmailAccount,
    isActive: subscription?.status === 'active',
    isTrial: subscription?.status === 'trial',
    planId: subscription?.plan_id || 'trial'
  };
}