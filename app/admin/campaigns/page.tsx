'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  ArrowLeft,
  Activity,
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  Eye,
  Play,
  Pause,
  StopCircle,
  Calendar,
  Mail,
  TrendingUp,
  Users,
  BarChart3
} from 'lucide-react';

export default function AdminCampaignsPage() {
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const router = useRouter();

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
      setUser(user);
      await loadData();
    };

    checkAdminAccess();
  }, [router]);

  const loadData = async () => {
    try {
      // Load all users
      const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
      if (usersError) throw usersError;
      setUsers(usersData.users || []);

      // Load all campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('warmup_campaigns')
        .select(`
          *,
          connected_emails (
            email_address,
            provider
          )
        `)
        .order('created_at', { ascending: false });
      
      if (campaignsError) throw campaignsError;
      setCampaigns(campaignsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const user = users.find(u => u.id === campaign.user_id);
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         campaign.connected_emails?.email_address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'draft':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
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
        return <StopCircle className="h-3 w-3" />;
      case 'draft':
        return <Edit className="h-3 w-3" />;
      default:
        return <Activity className="h-3 w-3" />;
    }
  };

  const getCampaignStats = (campaignId: string) => {
    // This would be loaded from the database in a real implementation
    return {
      emailsSent: 0,
      emailsOpened: 0,
      emailsReplied: 0,
      openRate: 0,
      replyRate: 0
    };
  };

  const campaignStats = {
    total: campaigns.length,
    active: campaigns.filter(c => c.status === 'active').length,
    paused: campaigns.filter(c => c.status === 'paused').length,
    completed: campaigns.filter(c => c.status === 'completed').length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
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
                onClick={() => router.push('/admin')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Admin</span>
              </Button>
              <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg flex items-center justify-center">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Campaign Management</h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">Monitor and manage all user campaigns</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-md bg-white/60 backdrop-blur-sm dark:bg-gray-800/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Total Campaigns
              </CardTitle>
              <Activity className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {campaignStats.total}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                All campaigns
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-white/60 backdrop-blur-sm dark:bg-gray-800/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Active Campaigns
              </CardTitle>
              <Play className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {campaignStats.active}
              </div>
              <p className="text-xs text-green-600 mt-1">
                Currently running
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-white/60 backdrop-blur-sm dark:bg-gray-800/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Paused Campaigns
              </CardTitle>
              <Pause className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {campaignStats.paused}
              </div>
              <p className="text-xs text-yellow-600 mt-1">
                Temporarily stopped
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-white/60 backdrop-blur-sm dark:bg-gray-800/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Completed Campaigns
              </CardTitle>
              <StopCircle className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {campaignStats.completed}
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Finished campaigns
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Campaigns Table */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">All Campaigns</CardTitle>
                <CardDescription>Monitor campaign performance and manage settings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search and Filter */}
            <div className="flex items-center space-x-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search campaigns, users, or emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campaigns Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold">Campaign</th>
                    <th className="text-left py-3 px-4 font-semibold">User</th>
                    <th className="text-left py-3 px-4 font-semibold">Status</th>
                    <th className="text-left py-3 px-4 font-semibold">Performance</th>
                    <th className="text-left py-3 px-4 font-semibold">Volume</th>
                    <th className="text-left py-3 px-4 font-semibold">Created</th>
                    <th className="text-left py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCampaigns.map((campaign) => {
                    const user = users.find(u => u.id === campaign.user_id);
                    const stats = getCampaignStats(campaign.id);
                    return (
                      <tr key={campaign.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{campaign.name}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-300">{campaign.connected_emails?.email_address}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs font-medium">
                                {user?.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-gray-900 dark:text-white">{user?.name || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={`${getStatusColor(campaign.status)} border-0 capitalize`}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(campaign.status)}
                              <span>{campaign.status}</span>
                            </div>
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {stats.emailsSent} sent
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-300">
                              {stats.openRate}% open, {stats.replyRate}% reply
                            </p>
                          </div>
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
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedCampaign(campaign);
                                setDetailDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Campaign Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Campaign Details</DialogTitle>
              <DialogDescription>
                Detailed information about the selected campaign
              </DialogDescription>
            </DialogHeader>
            {selectedCampaign && (
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Campaign Info</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-600 dark:text-gray-300">Name:</span> {selectedCampaign.name}</p>
                      <p><span className="text-gray-600 dark:text-gray-300">Email:</span> {selectedCampaign.connected_emails?.email_address}</p>
                      <p><span className="text-gray-600 dark:text-gray-300">Status:</span> 
                        <Badge className={`ml-2 ${getStatusColor(selectedCampaign.status)} border-0 capitalize`}>
                          {selectedCampaign.status}
                        </Badge>
                      </p>
                      <p><span className="text-gray-600 dark:text-gray-300">Daily Volume:</span> {selectedCampaign.daily_volume} emails</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Performance</h4>
                    <div className="space-y-2 text-sm">
                      {(() => {
                        const stats = getCampaignStats(selectedCampaign.id);
                        return (
                          <>
                            <p><span className="text-gray-600 dark:text-gray-300">Emails Sent:</span> {stats.emailsSent}</p>
                            <p><span className="text-gray-600 dark:text-gray-300">Open Rate:</span> {stats.openRate}%</p>
                            <p><span className="text-gray-600 dark:text-gray-300">Reply Rate:</span> {stats.replyRate}%</p>
                            <p><span className="text-gray-600 dark:text-gray-300">Replies:</span> {stats.emailsReplied}</p>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Timeline</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-600 dark:text-gray-300">Start Date:</span> {new Date(selectedCampaign.start_date).toLocaleDateString()}</p>
                    <p><span className="text-gray-600 dark:text-gray-300">End Date:</span> {new Date(selectedCampaign.end_date).toLocaleDateString()}</p>
                    <p><span className="text-gray-600 dark:text-gray-300">Created:</span> {new Date(selectedCampaign.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
                Close
              </Button>
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                Edit Campaign
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}