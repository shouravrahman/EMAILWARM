'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Navbar from '@/components/layout/navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SkeletonCard, SkeletonCampaignCard, SkeletonEmailCard } from '@/components/ui/skeleton-card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Mail,
  Activity,
  TrendingUp,
  Plus,
  BarChart3,
  Users,
  Clock,
  CheckCircle2,
  Pause,
  Play
} from 'lucide-react';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();
  const [campaigns, setCampaigns] = useState([]);
  const [emailAccounts, setEmailAccounts] = useState([]);
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    activeCampaigns: 0,
    emailsSent: 0,
    avgOpenRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }
      setUser(user);
      await loadDashboardData(user.id);
    };

    getUser();
  }, [router]);

  const loadDashboardData = async (userId: string) => {
    try {
      // Load subscription info
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .rpc('check_user_limits', { p_user_id: userId });

      if (subscriptionError) throw subscriptionError;
      setSubscriptionInfo(subscriptionData?.[0] || null);

      // Load campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('warmup_campaigns')
        .select(`
          *,
          connected_emails (
            email_address,
            provider
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (campaignsError) throw campaignsError;

      // Load email accounts
      const { data: emailsData, error: emailsError } = await supabase
        .from('connected_emails')
        .select('*')
        .eq('user_id', userId);

      if (emailsError) throw emailsError;

      // Load email logs for stats
      const campaignIds = campaignsData?.map(c => c.id) || [];
      let logsData = [];
      
      if (campaignIds.length > 0) {
        const { data: logs, error: logsError } = await supabase
          .from('email_logs')
          .select('status, open_count')
          .in('campaign_id', campaignIds);

        if (logsError) throw logsError;
        logsData = logs || [];
      }

      setCampaigns(campaignsData || []);
      setEmailAccounts(emailsData || []);

      // Calculate stats
      const totalCampaigns = campaignsData?.length || 0;
      const activeCampaigns = campaignsData?.filter(c => c.status === 'active').length || 0;
      const emailsSent = logsData.length;
      const totalOpens = logsData.reduce((sum, log) => sum + log.open_count, 0);
      const avgOpenRate = emailsSent > 0 ? Math.round((totalOpens / emailsSent) * 100) : 0;

      setStats({
        totalCampaigns,
        activeCampaigns,
        emailsSent,
        avgOpenRate,
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Play className="h-3 w-3" />;
      case 'paused':
        return <Pause className="h-3 w-3" />;
      case 'completed':
        return <CheckCircle2 className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Section Skeleton */}
          <div className="mb-8 space-y-2 animate-pulse">
            <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>

          {/* Stats Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>

          {/* Content Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            <Card className="lg:col-span-2 border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
              <CardHeader>
                <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </CardHeader>
              <CardContent className="space-y-4">
                <SkeletonCampaignCard />
                <SkeletonCampaignCard />
                <SkeletonCampaignCard />
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
              <CardHeader>
                <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </CardHeader>
              <CardContent className="space-y-3">
                <SkeletonEmailCard />
                <SkeletonEmailCard />
                <SkeletonEmailCard />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.email?.split('@')[0]}!
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Here's what's happening with your email warmup campaigns
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <Card className="border-0 shadow-md bg-white/60 backdrop-blur-sm dark:bg-gray-800/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Total Campaigns
              </CardTitle>
              <Activity className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalCampaigns}
              </div>
              <p className="text-xs text-green-600 mt-1">
                {stats.activeCampaigns} active
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-white/60 backdrop-blur-sm dark:bg-gray-800/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Emails Sent
              </CardTitle>
              <Mail className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.emailsSent}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                This month
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-white/60 backdrop-blur-sm dark:bg-gray-800/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Open Rate
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.avgOpenRate}%
              </div>
              <p className="text-xs text-green-600 mt-1">
                Above average
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-white/60 backdrop-blur-sm dark:bg-gray-800/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Connected Emails
              </CardTitle>
              <Users className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {emailAccounts.length} / {subscriptionInfo?.email_accounts_limit || 0}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Active accounts
              </p>
            </CardContent>
          </Card>

          {/* Subscription Info Card */}
          {subscriptionInfo && (
            <Card className="border-0 shadow-md bg-white/60 backdrop-blur-sm dark:bg-gray-800/60">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Subscription Status
                </CardTitle>
                <Clock className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                  {subscriptionInfo.subscription_status}
                </div>
                {subscriptionInfo.subscription_status === 'trialing' && (
                  <p className="text-xs text-green-600 mt-1">
                    {subscriptionInfo.trial_days_left} days left
                  </p>
                )}
                {subscriptionInfo.subscription_status === 'inactive' && (
                  <p className="text-xs text-red-600 mt-1">
                    Trial ended. Upgrade to continue.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Recent Campaigns */}
          <Card className="lg:col-span-2 border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">Recent Campaigns</CardTitle>
                  <CardDescription>Your latest warmup campaigns</CardDescription>
                </div>
                <Button 
                  size="sm" 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 min-h-[44px] min-w-[44px]"
                  onClick={() => router.push('/campaigns')}
                >
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">New Campaign</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No campaigns yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Get started by creating your first warmup campaign
                  </p>
                  <Button 
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    onClick={() => router.push('/campaigns')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Campaign
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns.map((campaign: any) => (
                    <div
                      key={campaign.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer gap-3 sm:gap-0"
                      onClick={() => router.push('/campaigns')}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                            <Mail className="h-5 w-5 text-white" />
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {campaign.name}
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                            {campaign.connected_emails?.email_address}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end sm:space-x-3">
                        <Badge className={`${getStatusColor(campaign.status)} border-0 text-xs`}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(campaign.status)}
                            <span className="capitalize">{campaign.status}</span>
                          </div>
                        </Badge>
                        <div className="text-right">
                          <p className="text-xs text-gray-600 dark:text-gray-300">
                            {campaign.daily_volume}/day
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Connected Emails */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">Connected Emails</CardTitle>
                  <CardDescription>Manage your email accounts</CardDescription>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="min-h-[44px] min-w-[44px]"
                  onClick={() => router.push('/emails')}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {emailAccounts.length === 0 ? (
                <div className="text-center py-6">
                  <Mail className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    No emails connected
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mb-4">
                    Connect your first email account to start warming up
                  </p>
                  <Button 
                    size="sm" 
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    onClick={() => router.push('/emails')}
                  >
                    Connect Email
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {emailAccounts.map((email: any) => (
                    <div
                      key={email.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                          <Mail className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {email.email_address}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-300 capitalize">
                            {email.provider}
                          </p>
                        </div>
                      </div>
                      <Badge className={`${getStatusColor(email.status)} border-0`}>
                        {email.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 sm:mt-8">
          <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    Ready to get started?
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Set up your first warmup campaign in just a few minutes
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Button 
                    variant="outline" 
                    className="border-blue-200 hover:bg-blue-50 min-h-[44px] w-full sm:w-auto"
                    onClick={() => router.push('/analytics')}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Analytics
                  </Button>
                  <Button 
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 min-h-[44px] w-full sm:w-auto"
                    onClick={() => router.push('/campaigns')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Campaign
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}