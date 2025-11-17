'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PRICING_CONFIG, calculateSubscriptionCost, getPricingForQuantity } from '@/lib/pricing';
import {
  CreditCard,
  TrendingUp,
  Calendar,
  DollarSign,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Loader2
} from 'lucide-react';

interface SubscriptionManagerProps {
  userId: string;
}

export default function SubscriptionManager({ userId }: SubscriptionManagerProps) {
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newQuantity, setNewQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadSubscription();
  }, [userId]);

  const loadSubscription = async () => {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setSubscription(data);
      if (data) {
        setNewQuantity(data.email_quantity || 1);
      }
    } catch (err) {
      console.error('Error loading subscription:', err);
      setError('Failed to load subscription details');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    setUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailQuantity: newQuantity })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to checkout
      window.location.href = data.checkoutUrl;
    } catch (err: any) {
      setError(err.message);
      setUpdating(false);
    }
  };

  const handleUpdateQuantity = async () => {
    setUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/payments/update-quantity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailQuantity: newQuantity })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update subscription');
      }

      setSuccess(`Subscription updated to ${newQuantity} email(s) at $${data.totalCost}/month`);
      await loadSubscription();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-0">Active</Badge>;
      case 'trialing':
      case 'trial':
        return <Badge className="bg-blue-100 text-blue-800 border-0">Trial</Badge>;
      case 'cancelled':
        return <Badge className="bg-yellow-100 text-yellow-800 border-0">Cancelled</Badge>;
      case 'expired':
        return <Badge className="bg-red-100 text-red-800 border-0">Expired</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 border-0">{status}</Badge>;
    }
  };

  const calculateNewCost = () => {
    return calculateSubscriptionCost(newQuantity);
  };

  const getPricingDetails = () => {
    return getPricingForQuantity(newQuantity);
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Subscription */}
      {subscription ? (
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <span>Current Subscription</span>
            </CardTitle>
            <CardDescription>
              Manage your subscription and billing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-gray-600 dark:text-gray-300">Status</Label>
                <div>{getStatusBadge(subscription.status)}</div>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-600 dark:text-gray-300">Email Accounts</Label>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    {subscription.email_quantity} email{subscription.email_quantity !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-600 dark:text-gray-300">Monthly Cost</Label>
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    ${subscription.total_monthly_cost}/month
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-600 dark:text-gray-300">Price per Email</Label>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    ${subscription.price_per_email}/email
                  </span>
                </div>
              </div>
            </div>

            {subscription.trial_ends_at && (subscription.status === 'trial' || subscription.status === 'trialing') && (
              <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Your trial ends on {new Date(subscription.trial_ends_at).toLocaleDateString()}
                </AlertDescription>
              </Alert>
            )}

            {subscription.cancel_at_period_end && (
              <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Your subscription will be cancelled on {new Date(subscription.current_period_end).toLocaleDateString()}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
          <CardContent className="p-8 text-center">
            <CreditCard className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Active Subscription
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Start your subscription to unlock all features
            </p>
          </CardContent>
        </Card>
      )}

      {/* Update Quantity */}
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Mail className="h-5 w-5" />
            <span>{subscription?.status === 'active' ? 'Update Email Quantity' : 'Start Subscription'}</span>
          </CardTitle>
          <CardDescription>
            {subscription?.status === 'active' 
              ? 'Adjust the number of email accounts you want to warm up'
              : 'Choose how many email accounts you want to warm up'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert className="border-red-200 bg-red-50 dark:bg-red-900/20">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50 dark:bg-green-900/20">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {/* Bundle Options */}
            <div className="space-y-3">
              <Label>Choose a Bundle (Recommended)</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PRICING_CONFIG.bundles.map((bundle) => (
                  <button
                    key={bundle.quantity}
                    type="button"
                    onClick={() => setNewQuantity(bundle.quantity)}
                    className={`relative p-4 rounded-lg border-2 transition-all ${
                      newQuantity === bundle.quantity
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                    }`}
                  >
                    {bundle.popular && (
                      <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 text-xs">
                        Popular
                      </Badge>
                    )}
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                        {bundle.quantity}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                        {bundle.name}
                      </div>
                      <div className="text-lg font-semibold text-blue-600">
                        ${bundle.totalPrice}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        ${bundle.pricePerEmail.toFixed(2)}/email
                      </div>
                      {bundle.discount > 0 && (
                        <Badge className="mt-2 bg-green-100 text-green-800 border-0 text-xs">
                          Save {bundle.discount}%
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-gray-800 px-2 text-gray-500">Or custom quantity</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Custom Number of Email Accounts</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={newQuantity}
                onChange={(e) => setNewQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="text-lg"
              />
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Base price: ${PRICING_CONFIG.pricePerEmail}/email/month (bundles offer discounts)
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2">
              {(() => {
                const pricing = getPricingDetails();
                return (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Email Accounts</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {pricing.quantity}
                        {pricing.bundleName && (
                          <span className="ml-2 text-sm text-blue-600">({pricing.bundleName})</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Price per Email</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        ${pricing.pricePerEmail.toFixed(2)}
                      </span>
                    </div>
                    {pricing.discount > 0 && (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-300">Regular Price</span>
                          <span className="line-through text-gray-500">
                            ${(pricing.quantity * PRICING_CONFIG.pricePerEmail).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-green-600 font-medium">You Save ({pricing.discount}% off)</span>
                          <span className="text-green-600 font-semibold">
                            ${pricing.savings.toFixed(2)}
                          </span>
                        </div>
                      </>
                    )}
                    <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold text-gray-900 dark:text-white">Total Monthly Cost</span>
                        <span className="text-2xl font-bold text-blue-600">
                          ${pricing.totalPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>All features included</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>Cancel anytime</span>
            </div>
            {!subscription && (
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>{PRICING_CONFIG.trialDays}-day free trial</span>
              </div>
            )}
          </div>

          <Button
            onClick={subscription?.status === 'active' ? handleUpdateQuantity : handleCheckout}
            disabled={updating || (subscription?.status === 'active' && newQuantity === subscription.email_quantity)}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {updating ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing...</span>
              </div>
            ) : subscription?.status === 'active' ? (
              <>Update Subscription</>
            ) : (
              <>Start {PRICING_CONFIG.trialDays}-Day Free Trial</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
