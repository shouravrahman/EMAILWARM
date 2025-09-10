'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Navbar from '@/components/layout/navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Mail,
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Reply,
  ExternalLink,
  RefreshCw,
  BarChart3
} from 'lucide-react';

export default function EmailLogsPage() {
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();
  const [emailLogs, setEmailLogs] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [campaignFilter, setCampaignFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }
      setUser(user);
      await loadData(user.id);
    };

    getUser();
  }, [router]);

  const loadData = async (userId: string) => {
    try {
      // Load user's campaigns first
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
        .order('created_at', { ascending: false });

      if (campaignsError) throw campaignsError;

      setCampaigns(campaignsData || []);

      // Load email logs for user's campaigns
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

      setEmailLogs(logsData);
    } catch (error) {
      console.error('Error loading email logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = emailLogs.filter((log: any) => {
    const matchesSearch = log.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.recipient.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    const matchesCampaign = campaignFilter === 'all' || log.campaign_id === campaignFilter;
    return matchesSearch && matchesStatus && matchesCampaign;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'opened':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      case 'replied':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300';
      case 'bounced':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Mail className="h-3 w-3" />;
      case 'delivered':
        return <CheckCircle2 className="h-3 w-3" />;
      case 'opened':
        return <Eye className="h-3 w-3" />;
      case 'replied':
        return <Reply className="h-3 w-3" />;
      case 'bounced':
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  const getCampaignName = (campaignId: string) => {
    const campaign = campaigns.find((c: any) => c.id === campaignId);
    return campaign?.name || 'Unknown Campaign';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const exportLogs = () => {
    const csvContent = [
      ['Date', 'Campaign', 'Subject', 'Recipient', 'Status', 'Opens', 'Replies'].join(','),
      ...filteredLogs.map((log: any) => [
        formatDate(log.sent_at),
        getCampaignName(log.campaign_id),
        `"${log.subject}"`,
        log.recipient,
        log.status,
        log.open_count,
        log.reply_count
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `email-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const stats = {
    total: emailLogs.length,
    sent: emailLogs.filter((log: any) => log.status === 'sent').length,
    delivered: emailLogs.filter((log: any) => log.status === 'delivered').length,
    opened: emailLogs.filter((log: any) => log.status === 'opened').length,
    replied: emailLogs.filter((log: any) => log.status === 'replied').length,
    bounced: emailLogs.filter((log: any) => log.status === 'bounced').length,
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
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Email Logs
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Detailed tracking of all emails sent through your campaigns
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={exportLogs}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={() => loadData(user.id)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <Card className="border-0 shadow-md bg-white/60 backdrop-blur-sm dark:bg-gray-800/60">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
              <div className="text-xs text-gray-600 dark:text-gray-300">Total</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md bg-white/60 backdrop-blur-sm dark:bg-gray-800/60">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.sent}</div>
              <div className="text-xs text-gray-600 dark:text-gray-300">Sent</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md bg-white/60 backdrop-blur-sm dark:bg-gray-800/60">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
              <div className="text-xs text-gray-600 dark:text-gray-300">Delivered</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md bg-white/60 backdrop-blur-sm dark:bg-gray-800/60">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.opened}</div>
              <div className="text-xs text-gray-600 dark:text-gray-300">Opened</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md bg-white/60 backdrop-blur-sm dark:bg-gray-800/60">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-emerald-600">{stats.replied}</div>
              <div className="text-xs text-gray-600 dark:text-gray-300">Replied</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md bg-white/60 backdrop-blur-sm dark:bg-gray-800/60">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.bounced}</div>
              <div className="text-xs text-gray-600 dark:text-gray-300">Bounced</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by subject or recipient..."
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
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="opened">Opened</SelectItem>
                  <SelectItem value="replied">Replied</SelectItem>
                  <SelectItem value="bounced">Bounced</SelectItem>
                </SelectContent>
              </Select>
              <Select value={campaignFilter} onValueChange={setCampaignFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by campaign" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  {campaigns.map((campaign: any) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Email Logs Table */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Email Activity Log</CardTitle>
            <CardDescription>
              Showing {filteredLogs.length} of {emailLogs.length} email logs
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <Mail className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No email logs found
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {emailLogs.length === 0 
                    ? 'Start a campaign to see email activity here'
                    : 'Try adjusting your search or filter criteria'
                  }
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 font-semibold">Date/Time</th>
                      <th className="text-left py-3 px-4 font-semibold">Campaign</th>
                      <th className="text-left py-3 px-4 font-semibold">Subject</th>
                      <th className="text-left py-3 px-4 font-semibold">Recipient</th>
                      <th className="text-left py-3 px-4 font-semibold">Status</th>
                      <th className="text-left py-3 px-4 font-semibold">Engagement</th>
                      <th className="text-left py-3 px-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log: any) => (
                      <tr key={log.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {new Date(log.sent_at).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-300">
                                {new Date(log.sent_at).toLocaleTimeString()}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {getCampaignName(log.campaign_id)}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-gray-900 dark:text-white max-w-xs truncate">
                            {log.subject}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-gray-900 dark:text-white">{log.recipient}</p>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={`${getStatusColor(log.status)} border-0 capitalize`}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(log.status)}
                              <span>{log.status}</span>
                            </div>
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-4 text-xs">
                            <div className="flex items-center space-x-1">
                              <Eye className="h-3 w-3 text-purple-600" />
                              <span>{log.open_count}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Reply className="h-3 w-3 text-green-600" />
                              <span>{log.reply_count}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedLog(log);
                              setDetailDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Email Details</DialogTitle>
              <DialogDescription>
                Detailed information about this email
              </DialogDescription>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Email Information</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-600 dark:text-gray-300">Subject:</span> {selectedLog.subject}</p>
                      <p><span className="text-gray-600 dark:text-gray-300">Recipient:</span> {selectedLog.recipient}</p>
                      <p><span className="text-gray-600 dark:text-gray-300">Campaign:</span> {getCampaignName(selectedLog.campaign_id)}</p>
                      <p><span className="text-gray-600 dark:text-gray-300">Message ID:</span> {selectedLog.message_id}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Status & Engagement</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-600 dark:text-gray-300">Status:</span> 
                        <Badge className={`ml-2 ${getStatusColor(selectedLog.status)} border-0 capitalize`}>
                          {selectedLog.status}
                        </Badge>
                      </p>
                      <p><span className="text-gray-600 dark:text-gray-300">Opens:</span> {selectedLog.open_count}</p>
                      <p><span className="text-gray-600 dark:text-gray-300">Replies:</span> {selectedLog.reply_count}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Timeline</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-600 dark:text-gray-300">Sent:</span> {formatDate(selectedLog.sent_at)}</p>
                    {selectedLog.opened_at && (
                      <p><span className="text-gray-600 dark:text-gray-300">First Opened:</span> {formatDate(selectedLog.opened_at)}</p>
                    )}
                    {selectedLog.replied_at && (
                      <p><span className="text-gray-600 dark:text-gray-300">First Reply:</span> {formatDate(selectedLog.replied_at)}</p>
                    )}
                    {selectedLog.bounced_at && (
                      <p><span className="text-gray-600 dark:text-gray-300">Bounced:</span> {formatDate(selectedLog.bounced_at)}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}