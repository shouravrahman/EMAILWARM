'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  Activity,
  BarChart3,
  Settings,
  Shield,
  Edit,
  Trash2,
  Ban,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Eye,
  Download
} from 'lucide-react';

export default function UserDetailPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [userCampaigns, setUserCampaigns] = useState<any[]>([]);
  const [userEmails, setUserEmails] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  useEffect(() => {
    const checkAdminAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }
      if (user.user_metadata?.role !== 'admin') {
        router.push('/dashboard');
        return;
      }
      setCurrentUser(user);
      await loadUserData();
    };

    checkAdminAccess();
  }, [router, userId]);

  const loadUserData = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
      if (userError) throw userError;
      
      if (!userData.user) {
        router.push('/admin/users');
        return;
      }

      setUser(userData.user);

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

  const handleUpdateUser = async (updates: any) => {
    try {
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        user_metadata: updates
      });
      if (error) throw error;
      await loadUserData();
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleDeleteUser = async () => {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        const { error } = await supabase.auth.admin.deleteUser(userId);
        if (error) throw error;
        router.push('/admin/users');
      } catch (error) {
        console.error('Error deleting user:', error);
      }
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
      case 'admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      case 'user':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">User Not Found</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">The requested user could not be found.</p>
          <Button onClick={() => router.push('/admin/users')}>
            Back to Users
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/admin/users')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Users</span>
              </Button>
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-lg">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{user.name}</h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">{user.email}</p>
              </div>
              <Badge className={`${getStatusColor(user.role)} border-0 capitalize`}>
                {user.role === 'admin' && <Shield className="h-3 w-3 mr-1" />}
                {user.role}
              </Badge>
            </div>
            <div className="flex items-center space-x-3">
              <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit User
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Edit User</DialogTitle>
                    <DialogDescription>
                      Update user information and permissions
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-name">Full Name</Label>
                      <Input
                        id="edit-name"
                        defaultValue={user.name}
                        onChange={(e) => setUser({ ...user, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-email">Email Address</Label>
                      <Input
                        id="edit-email"
                        type="email"
                        defaultValue={user.email}
                        onChange={(e) => setUser({ ...user, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-role">Role</Label>
                      <Select
                        value={user.role}
                        onValueChange={(value) => setUser({ ...user, role: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => handleUpdateUser(user)}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    >
                      Save Changes
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button
                variant="destructive"
                onClick={handleDeleteUser}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete User
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Stats */}
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

        {/* User Details Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="emails">Email Activity</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">User Information</CardTitle>
                  <CardDescription>Basic account details and status</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <User className="h-5 w-5 text-gray-600" />
                      <span className="font-medium">Full Name</span>
                    </div>
                    <span className="text-gray-900 dark:text-white">{user.name}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-gray-600" />
                      <span className="font-medium">Email Address</span>
                    </div>
                    <span className="text-gray-900 dark:text-white">{user.email}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Shield className="h-5 w-5 text-gray-600" />
                      <span className="font-medium">Role</span>
                    </div>
                    <Badge className={`${getStatusColor(user.role)} border-0 capitalize`}>
                      {user.role}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-gray-600" />
                      <span className="font-medium">Member Since</span>
                    </div>
                    <span className="text-gray-900 dark:text-white">
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Activity className="h-5 w-5 text-gray-600" />
                      <span className="font-medium">Last Login</span>
                    </div>
                    <span className="text-gray-900 dark:text-white">
                      {new Date(user.last_login).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">Account Activity</CardTitle>
                  <CardDescription>Recent user activity and engagement</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Account created</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <Activity className="h-4 w-4 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Last login</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        {new Date(user.last_login).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {userCampaigns.length > 0 && (
                    <div className="flex items-start space-x-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-purple-600 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Latest campaign</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300">
                          {userCampaigns[0].name}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="space-y-6">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">User Campaigns</CardTitle>
                <CardDescription>All campaigns created by this user</CardDescription>
              </CardHeader>
              <CardContent>
                {userCampaigns.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No campaigns yet
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      This user hasn't created any campaigns yet
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-3 px-4 font-semibold">Campaign</th>
                          <th className="text-left py-3 px-4 font-semibold">Status</th>
                          <th className="text-left py-3 px-4 font-semibold">Volume</th>
                          <th className="text-left py-3 px-4 font-semibold">Created</th>
                          <th className="text-left py-3 px-4 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userCampaigns.map((campaign) => (
                          <tr key={campaign.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="py-3 px-4">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">{campaign.name}</p>
                                <p className="text-xs text-gray-600 dark:text-gray-300">{campaign.connected_emails?.email_address}</p>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <Badge className={`${getStatusColor(campaign.status)} border-0 capitalize`}>
                                {campaign.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <p className="text-gray-900 dark:text-white">{campaign.daily_volume}/day</p>
                            </td>
                            <td className="py-3 px-4">
                              <p className="text-gray-900 dark:text-white">
                                {new Date(campaign.created_at).toLocaleDateString()}
                              </p>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex space-x-2">
                                <Button size="sm" variant="ghost">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="ghost">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Activity Tab */}
          <TabsContent value="emails" className="space-y-6">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Email Activity</CardTitle>
                <CardDescription>Recent email sending activity and performance</CardDescription>
              </CardHeader>
              <CardContent>
                {userEmails.length === 0 ? (
                  <div className="text-center py-8">
                    <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No email activity
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      No emails have been sent from this user's campaigns yet
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-3 px-4 font-semibold">Subject</th>
                          <th className="text-left py-3 px-4 font-semibold">Recipient</th>
                          <th className="text-left py-3 px-4 font-semibold">Status</th>
                          <th className="text-left py-3 px-4 font-semibold">Opens</th>
                          <th className="text-left py-3 px-4 font-semibold">Replies</th>
                          <th className="text-left py-3 px-4 font-semibold">Sent</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userEmails.map((log) => (
                          <tr key={log.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="py-3 px-4">
                              <p className="font-medium text-gray-900 dark:text-white">{log.subject}</p>
                            </td>
                            <td className="py-3 px-4">
                              <p className="text-gray-900 dark:text-white">{log.recipient}</p>
                            </td>
                            <td className="py-3 px-4">
                              <Badge className={`${getStatusColor(log.status)} border-0 capitalize`}>
                                {log.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <p className="text-gray-900 dark:text-white">{log.open_count}</p>
                            </td>
                            <td className="py-3 px-4">
                              <p className="text-gray-900 dark:text-white">{log.reply_count}</p>
                            </td>
                            <td className="py-3 px-4">
                              <p className="text-gray-900 dark:text-white">
                                {new Date(log.sent_at).toLocaleDateString()}
                              </p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Account Settings</CardTitle>
                <CardDescription>Manage user account settings and permissions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="user-name">Full Name</Label>
                    <Input
                      id="user-name"
                      defaultValue={user.name}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="user-email">Email Address</Label>
                    <Input
                      id="user-email"
                      type="email"
                      defaultValue={user.email}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="user-role">Role</Label>
                    <Select defaultValue={user.role}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Danger Zone</h4>
                  <div className="space-y-3">
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        These actions are permanent and cannot be undone.
                      </AlertDescription>
                    </Alert>
                    <div className="flex space-x-3">
                      <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
                        <Ban className="h-4 w-4 mr-2" />
                        Suspend Account
                      </Button>
                      <Button variant="destructive" onClick={handleDeleteUser}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button variant="outline">Cancel</Button>
                  <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}