'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Navbar from '@/components/layout/navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import {
  Mail,
  TrendingUp,
  Eye,
  Reply,
  AlertTriangle,
  Calendar,
  Filter,
  Download,
  Activity,
  BarChart3
} from 'lucide-react';

export default function AnalyticsPage() {
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();
  const [campaigns, setCampaigns] = useState([]);
  const [emailLogs, setEmailLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [timeRange, setTimeRange] = useState('30');
  const [activeTab, setActiveTab] = useState('all');
  const [outreachFunnelData, setOutreachFunnelData] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }
      setUser(user);
      await loadAnalyticsData(user.id);
    };

    getUser();
  }, [router]);

  const loadAnalyticsData = async (userId: string) => {
    try {
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
        .eq('user_id', userId);

      if (campaignsError) throw campaignsError;

      // Load email logs
      const campaignIds = campaignsData?.map(c => c.id) || [];
      let logsData = [];
      
      if (campaignIds.length > 0) {
        const { data: logs, error: logsError } = await supabase
          .from('email_logs')
          .select('*')
          .in('campaign_id', campaignIds)
          .order('sent_at', { ascending: false });

        if (logsError) throw logsError;
        logsData = logs || [];
      }

      setCampaigns(campaignsData || []);
      setEmailLogs(logsData);

      // Load outreach funnel data
      await loadOutreachFunnelData(campaignsData || []);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOutreachFunnelData = async (campaignsData: any[]) => {
    try {
      const outreachCampaigns = campaignsData.filter(c => c.campaign_type === 'outreach');
      
      if (outreachCampaigns.length === 0) {
        setOutreachFunnelData(null);
        return;
      }

      const campaignIds = outreachCampaigns.map(c => c.id);

      // Get all prospects for outreach campaigns
      const prospectListIds = outreachCampaigns
        .map(c => c.prospect_list_id)
        .filter(Boolean);

      if (prospectListIds.length === 0) {
        setOutreachFunnelData(null);
        return;
      }

      const { data: prospects, error: prospectsError } = await supabase
        .from('prospects')
        .select('status')
        .in('list_id', prospectListIds);

      if (prospectsError) throw prospectsError;

      // Get email logs for outreach campaigns
      const { data: logs, error: logsError } = await supabase
        .from('email_logs')
        .select('status, open_count, reply_count, prospect_id')
        .in('campaign_id', campaignIds)
        .not('prospect_id', 'is', null);

      if (logsError) throw logsError;

      // Calculate funnel metrics
      const totalProspects = prospects?.length || 0;
      const contacted = prospects?.filter(p => ['contacted', 'engaged', 'replied'].includes(p.status)).length || 0;
      const opened = logs?.filter(l => l.open_count > 0).length || 0;
      const replied = logs?.filter(l => l.reply_count > 0).length || 0;

      setOutreachFunnelData({
        totalProspects,
        contacted,
        opened,
        replied,
        contactedRate: totalProspects > 0 ? Math.round((contacted / totalProspects) * 100) : 0,
        openRate: contacted > 0 ? Math.round((opened / contacted) * 100) : 0,
        replyRate: opened > 0 ? Math.round((replied / opened) * 100) : 0,
      });
    } catch (error) {
      console.error('Error loading outreach funnel data:', error);
      setOutreachFunnelData(null);
    }
  };

  // Calculate metrics
  const calculateMetrics = () => {
    // Filter by campaign type based on active tab
    let filteredCampaigns = campaigns;
    if (activeTab === 'warmup') {
      filteredCampaigns = campaigns.filter((c: any) => c.campaign_type === 'warmup' || !c.campaign_type);
    } else if (activeTab === 'outreach') {
      filteredCampaigns = campaigns.filter((c: any) => c.campaign_type === 'outreach');
    }

    const campaignIds = filteredCampaigns.map((c: any) => c.id);
    
    const filteredLogs = selectedCampaign === 'all' 
      ? emailLogs.filter((log: any) => campaignIds.includes(log.campaign_id))
      : emailLogs.filter((log: any) => log.campaign_id === selectedCampaign);

    const totalSent = filteredLogs.length;
    const totalOpened = filteredLogs.filter((log: any) => log.open_count > 0).length;
    const totalReplied = filteredLogs.filter((log: any) => log.reply_count > 0).length;
    const totalBounced = filteredLogs.filter((log: any) => log.status === 'bounced').length;

    return {
      totalSent,
      openRate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0,
      replyRate: totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0,
      bounceRate: totalSent > 0 ? Math.round((totalBounced / totalSent) * 100) : 0,
    };
  };

  // Generate chart data
  const generateChartData = () => {
    const filteredLogs = selectedCampaign === 'all' 
      ? emailLogs 
      : emailLogs.filter((log: any) => log.campaign_id === selectedCampaign);

    // Group by date
    const dateGroups = filteredLogs.reduce((acc: any, log: any) => {
      const date = new Date(log.sent_at).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, sent: 0, opened: 0, replied: 0, bounced: 0 };
      }
      acc[date].sent += 1;
      if (log.open_count > 0) acc[date].opened += 1;
      if (log.reply_count > 0) acc[date].replied += 1;
      if (log.status === 'bounced') acc[date].bounced += 1;
      return acc;
    }, {});

    return Object.values(dateGroups).sort((a: any, b: any) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  // Status distribution for pie chart
  const getStatusDistribution = () => {
    const filteredLogs = selectedCampaign === 'all' 
      ? emailLogs 
      : emailLogs.filter((log: any) => log.campaign_id === selectedCampaign);

    const statusCounts = filteredLogs.reduce((acc: any, log: any) => {
      acc[log.status] = (acc[log.status] || 0) + 1;
      return acc;
    }, {});

    const colors = {
      sent: '#3B82F6',
      delivered: '#10B981',
      opened: '#F59E0B',
      replied: '#8B5CF6',
      bounced: '#EF4444'
    };

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: colors[status as keyof typeof colors] || '#6B7280'
    }));
  };

  const metrics = calculateMetrics();
  const chartData = generateChartData();
  const statusDistribution = getStatusDistribution();

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
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Analytics
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Track your email warmup and outreach performance
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select campaign" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                {campaigns
                  .filter((c: any) => {
                    if (activeTab === 'warmup') return c.campaign_type === 'warmup' || !c.campaign_type;
                    if (activeTab === 'outreach') return c.campaign_type === 'outreach';
                    return true;
                  })
                  .map((campaign: any) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Campaign Type Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-8">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="all">All Campaigns</TabsTrigger>
            <TabsTrigger value="warmup">Warmup</TabsTrigger>
            <TabsTrigger value="outreach">Outreach</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-md bg-white/60 backdrop-blur-sm dark:bg-gray-800/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Emails Sent
              </CardTitle>
              <Mail className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics.totalSent}
              </div>
              <p className="text-xs text-green-600 mt-1">
                +12% from last month
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-white/60 backdrop-blur-sm dark:bg-gray-800/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Open Rate
              </CardTitle>
              <Eye className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics.openRate}%
              </div>
              <p className="text-xs text-green-600 mt-1">
                Above industry avg
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-white/60 backdrop-blur-sm dark:bg-gray-800/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Reply Rate
              </CardTitle>
              <Reply className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics.replyRate}%
              </div>
              <p className="text-xs text-green-600 mt-1">
                Excellent engagement
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-white/60 backdrop-blur-sm dark:bg-gray-800/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Bounce Rate
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics.bounceRate}%
              </div>
              <p className="text-xs text-green-600 mt-1">
                Well within limits
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Outreach Funnel - Only show for outreach tab */}
        {(activeTab === 'outreach' || activeTab === 'all') && outreachFunnelData && (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 mb-8">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Outreach Funnel</CardTitle>
              <CardDescription>Track prospect engagement from contact to reply</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Funnel Visualization */}
                <div className="space-y-4">
                  {/* Total Prospects */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium">Total Prospects</span>
                      </div>
                      <span className="text-lg font-bold">{outreachFunnelData.totalProspects}</span>
                    </div>
                    <div className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-400 rounded-lg flex items-center justify-center text-white font-semibold">
                      100%
                    </div>
                  </div>

                  {/* Contacted */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium">Contacted</span>
                      </div>
                      <span className="text-lg font-bold">{outreachFunnelData.contacted}</span>
                    </div>
                    <div 
                      className="h-12 bg-gradient-to-r from-green-500 to-green-400 rounded-lg flex items-center justify-center text-white font-semibold transition-all"
                      style={{ width: `${outreachFunnelData.contactedRate}%` }}
                    >
                      {outreachFunnelData.contactedRate}%
                    </div>
                  </div>

                  {/* Opened */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-sm font-medium">Opened</span>
                      </div>
                      <span className="text-lg font-bold">{outreachFunnelData.opened}</span>
                    </div>
                    <div 
                      className="h-12 bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-lg flex items-center justify-center text-white font-semibold transition-all"
                      style={{ width: `${outreachFunnelData.openRate}%` }}
                    >
                      {outreachFunnelData.openRate}%
                    </div>
                  </div>

                  {/* Replied */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <span className="text-sm font-medium">Replied</span>
                      </div>
                      <span className="text-lg font-bold">{outreachFunnelData.replied}</span>
                    </div>
                    <div 
                      className="h-12 bg-gradient-to-r from-purple-500 to-purple-400 rounded-lg flex items-center justify-center text-white font-semibold transition-all"
                      style={{ width: `${outreachFunnelData.replyRate}%` }}
                    >
                      {outreachFunnelData.replyRate}%
                    </div>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{outreachFunnelData.contactedRate}%</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">Contact Rate</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600">{outreachFunnelData.openRate}%</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">Open Rate</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{outreachFunnelData.replyRate}%</p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">Reply Rate</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Email Performance Over Time */}
          <Card className="lg:col-span-2 border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Email Performance Over Time</CardTitle>
              <CardDescription>Daily email metrics and engagement rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorOpened" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: 'none',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="sent"
                      stroke="#3B82F6"
                      fillOpacity={1}
                      fill="url(#colorSent)"
                      name="Sent"
                    />
                    <Area
                      type="monotone"
                      dataKey="opened"
                      stroke="#10B981"
                      fillOpacity={1}
                      fill="url(#colorOpened)"
                      name="Opened"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Email Status Distribution</CardTitle>
              <CardDescription>Breakdown of email delivery status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: 'none',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics Table */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Campaign Performance</CardTitle>
            <CardDescription>Detailed metrics for each campaign</CardDescription>
          </CardHeader>
          <CardContent>
            {campaigns.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No data to analyze
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  Create and run some campaigns to see detailed analytics
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-semibold">Campaign</th>
                      <th className="text-left py-3 px-4 font-semibold">Type</th>
                      <th className="text-left py-3 px-4 font-semibold">Email</th>
                      <th className="text-left py-3 px-4 font-semibold">Sent</th>
                      <th className="text-left py-3 px-4 font-semibold">Open Rate</th>
                      <th className="text-left py-3 px-4 font-semibold">Reply Rate</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns
                      .filter((c: any) => {
                        if (activeTab === 'warmup') return c.campaign_type === 'warmup' || !c.campaign_type;
                        if (activeTab === 'outreach') return c.campaign_type === 'outreach';
                        return true;
                      })
                      .map((campaign: any) => {
                      const campaignLogs = emailLogs.filter((log: any) => log.campaign_id === campaign.id);
                      const sent = campaignLogs.length;
                      const opened = campaignLogs.filter((log: any) => log.open_count > 0).length;
                      const replied = campaignLogs.filter((log: any) => log.reply_count > 0).length;
                      const openRate = sent > 0 ? Math.round((opened / sent) * 100) : 0;
                      const replyRate = sent > 0 ? Math.round((replied / sent) * 100) : 0;

                      return (
                        <tr key={campaign.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{campaign.name}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-300">
                                {new Date(campaign.start_date).toLocaleDateString()}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={`${
                              campaign.campaign_type === 'outreach'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                            } border-0 capitalize`}>
                              {campaign.campaign_type || 'warmup'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <p className="text-gray-900 dark:text-white">{campaign.connected_emails?.email_address}</p>
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-medium text-gray-900 dark:text-white">{sent}</p>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900 dark:text-white">{openRate}%</span>
                              <div className="w-12 h-2 bg-gray-200 rounded-full">
                                <div 
                                  className="h-2 bg-green-600 rounded-full" 
                                  style={{ width: `${openRate}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-gray-900 dark:text-white">{replyRate}%</span>
                              <div className="w-12 h-2 bg-gray-200 rounded-full">
                                <div 
                                  className="h-2 bg-purple-600 rounded-full" 
                                  style={{ width: `${replyRate}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={`${
                              campaign.status === 'active' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' 
                                : campaign.status === 'paused'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
                            } border-0 capitalize`}>
                              {campaign.status}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}