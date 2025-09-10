'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Navbar from '@/components/layout/navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  User,
  Mail,
  Calendar,
  Activity,
  BarChart3,
  TrendingUp,
  Edit,
  Save,
  Clock
} from 'lucide-react';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [userStats, setUserStats] = useState<any>({});
  const [userCampaigns, setUserCampaigns] = useState<any[]>([]);
  const [userEmails, setUserEmails] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }
      setUser(user);
      await loadUserData(user.id);
    };

    getUser();
  }, [router]);

  const loadUserData = async (userId: string) => {
    try {
      // Load user's campaigns
      const { data: campaigns, error: campaignsError } = await supabase
        .from('warmup_campaigns')
        .select(`
          *,
          connected_emails (
            email_address,
            provider
          )
        `)
        .eq('user_id', userId);

      if (campaignsError) throw campaignsError;
      setUserCampaigns(campaigns || []);

      // Load user's email logs
      const campaignIds = campaigns?.map(c => c.id) || [];
      let emailLogs = [];
      
      if (campaignIds.length > 0) {
        const { data: logs, error: logsError } = await supabase
          .from('email_logs')
          .select('*')
          .in('campaign_id', campaignIds);

        if (logsError) throw logsError;
        emailLogs = logs || [];
      }

      setUserEmails(emailLogs);

      // Calculate stats
      const stats = {
        totalCampaigns: campaigns?.length || 0,
        activeCampaigns: campaigns?.filter(c => c.status === 'active').length || 0,
        totalEmailsSent: emailLogs.length,
        emailsOpened: emailLogs.filter(log => log.open_count > 0).length,
        emailsReplied: emailLogs.filter(log => log.reply_count > 0).length,
        openRate: emailLogs.length > 0 ? Math.round((emailLogs.filter(log => log.open_count > 0).length / emailLogs.length) * 100) : 0,
        replyRate: emailLogs.length > 0 ? Math.round((emailLogs.filter(log => log.reply_count > 0).length / emailLogs.length) * 100) : 0
      };
      setUserStats(stats);

    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const { error } = await supabase.auth.updateUser({
        email: user.email,
        data: { name: user.user_metadata?.name }
      });
      
      if (error) throw error;
      setEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 mb-8">
          <CardContent className="p-8">
            <div className="flex items-center space-x-6">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-2xl font-bold">
                  {user?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {user?.user_metadata?.name || user?.email?.split('@')[0]}
                  </h1>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-4">{user?.email}</p>
                <div className="flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {new Date(user?.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4" />
                    <span>Last active {new Date(user?.last_sign_in_at || user?.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setEditing(!editing)}
              >
                <Edit className="h-4 w-4 mr-2" />
                {editing ? 'Cancel' : 'Edit Profile'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-md bg-white/60 backdrop-blur-sm dark:bg-gray-800/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Total Campaigns
              </CardTitle>
              <Activity className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {userStats.totalCampaigns}
              </div>
              <p className="text-xs text-green-600 mt-1">
                {userStats.activeCampaigns} active
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
                {userStats.totalEmailsSent}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Total sent
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
                {userStats.openRate}%
              </div>
              <p className="text-xs text-green-600 mt-1">
                {userStats.emailsOpened} opened
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-white/60 backdrop-blur-sm dark:bg-gray-800/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Reply Rate
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {userStats.replyRate}%
              </div>
              <p className="text-xs text-green-600 mt-1">
                {userStats.emailsReplied} replied
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Profile Details Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Profile Information</CardTitle>
                <CardDescription>Your account details and preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {editing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={user?.user_metadata?.name || ''}
                          onChange={(e) => setUser({ 
                            ...user, 
                            user_metadata: { ...user.user_metadata, name: e.target.value }
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={user?.email || ''}
                          disabled
                          className="bg-gray-100 dark:bg-gray-700"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end space-x-3">
                      <Button variant="outline" onClick={() => setEditing(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSaveProfile}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <span className="font-medium">Full Name</span>
                          <span className="text-gray-900 dark:text-white">
                            {user?.user_metadata?.name || user?.email?.split('@')[0]}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <span className="font-medium">Email Address</span>
                          <span className="text-gray-900 dark:text-white">{user?.email}</span>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <span className="font-medium">Member Since</span>
                          <span className="text-gray-900 dark:text-white">
                            {new Date(user?.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                          <span className="font-medium">Last Login</span>
                          <span className="text-gray-900 dark:text-white">
                            {new Date(user?.last_sign_in_at || user?.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-6">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">My Campaigns</CardTitle>
                <CardDescription>All campaigns you've created</CardDescription>
              </CardHeader>
              <CardContent>
                {userCampaigns.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No campaigns yet
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      Create your first campaign to start warming up your emails
                    </p>
                    <Button 
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                      onClick={() => router.push('/campaigns')}
                    >
                      Create Campaign
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userCampaigns.map((campaign) => (
                      <div key={campaign.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                            <Mail className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">{campaign.name}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{campaign.connected_emails?.email_address}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{campaign.daily_volume}/day</p>
                            <p className="text-xs text-gray-600 dark:text-gray-300">
                              {new Date(campaign.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className={`${getStatusColor(campaign.status)} border-0 capitalize`}>
                            {campaign.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-6">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
                <CardDescription>Your recent email activity and engagement</CardDescription>
              </CardHeader>
              <CardContent>
                {userEmails.length === 0 ? (
                  <div className="text-center py-8">
                    <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No activity yet
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Start a campaign to see your email activity here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userEmails.slice(0, 10).map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                            <Mail className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{log.subject}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">To: {log.recipient}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right text-sm">
                            <p className="text-gray-900 dark:text-white">{log.open_count} opens</p>
                            <p className="text-gray-600 dark:text-gray-300">{log.reply_count} replies</p>
                          </div>
                          <Badge className={`${getStatusColor(log.status)} border-0 capitalize`}>
                            {log.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}