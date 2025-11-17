'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Navbar from '@/components/layout/navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Play,
  Pause,
  StopCircle,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Mail,
  TrendingUp,
  Activity,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  Send,
  Eye,
  Reply
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CampaignForm } from '@/components/forms/campaign-form';
import { OutreachCampaignForm } from '@/components/forms/outreach-campaign-form';

export default function CampaignsPage() {
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();
  const [campaigns, setCampaigns] = useState([]);
  const [emailAccounts, setEmailAccounts] = useState([]);
  const [prospectLists, setProspectLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [campaignTypeDialogOpen, setCampaignTypeDialogOpen] = useState(false);
  const [selectedCampaignType, setSelectedCampaignType] = useState<'warmup' | 'outreach' | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [outreachMetrics, setOutreachMetrics] = useState<Record<string, any>>({});
  const [manualSendDialogOpen, setManualSendDialogOpen] = useState(false);
  const [selectedCampaignForSend, setSelectedCampaignForSend] = useState<any>(null);
  const [sendingBatch, setSendingBatch] = useState(false);
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
      // Load campaigns with email info and prospect lists
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('warmup_campaigns')
        .select(`
          *,
          connected_emails (
            email_address,
            provider,
            status
          ),
          prospect_lists (
            id,
            name,
            total_prospects,
            active_prospects
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (campaignsError) throw campaignsError;

      // Load email accounts
      const { data: emailsData, error: emailsError } = await supabase
        .from('connected_emails')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (emailsError) throw emailsError;

      // Load prospect lists
      const { data: listsData, error: listsError } = await supabase
        .from('prospect_lists')
        .select('id, name, total_prospects, active_prospects')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (listsError) throw listsError;

      setCampaigns(campaignsData || []);
      setEmailAccounts(emailsData || []);
      setProspectLists(listsData || []);

      // Load outreach metrics for outreach campaigns
      await loadOutreachMetrics(campaignsData || []);
    } catch (error: any) {
      console.error('Error loading campaigns:', error);
      setError(`Failed to load campaigns. Please try again. ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadOutreachMetrics = async (campaignsData: any[]) => {
    try {
      const outreachCampaigns = campaignsData.filter(c => c.campaign_type === 'outreach');
      const metrics: Record<string, any> = {};

      for (const campaign of outreachCampaigns) {
        // Get prospect counts by status
        const { data: prospects, error: prospectsError } = await supabase
          .from('prospects')
          .select('status')
          .eq('list_id', campaign.prospect_list_id);

        if (!prospectsError && prospects) {
          const statusCounts = prospects.reduce((acc: any, p: any) => {
            acc[p.status] = (acc[p.status] || 0) + 1;
            return acc;
          }, {});

          // Get email logs for this campaign
          const { data: logs, error: logsError } = await supabase
            .from('email_logs')
            .select('status, open_count, reply_count, prospect_id')
            .eq('campaign_id', campaign.id)
            .not('prospect_id', 'is', null);

          if (!logsError && logs) {
            const totalSent = logs.length;
            const totalOpened = logs.filter(l => l.open_count > 0).length;
            const totalReplied = logs.filter(l => l.reply_count > 0).length;

            metrics[campaign.id] = {
              contacted: statusCounts.contacted || 0,
              engaged: statusCounts.engaged || 0,
              replied: statusCounts.replied || 0,
              bounced: statusCounts.bounced || 0,
              totalSent,
              openRate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0,
              replyRate: totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0,
              engagementRate: totalSent > 0 ? Math.round(((totalOpened + totalReplied) / totalSent) * 100) : 0,
            };
          }
        }
      }

      setOutreachMetrics(metrics);
    } catch (error) {
      console.error('Error loading outreach metrics:', error);
    }
  };

  const createCampaign = async (data: any) => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create campaign');
      }

      setCreateDialogOpen(false);
      setCampaignTypeDialogOpen(false);
      setSelectedCampaignType(null);
      await loadData(user.id);
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      setError(error.message || 'Failed to create campaign');
    } finally {
      setCreating(false);
    }
  };

  const handleNewCampaignClick = () => {
    setError('');
    setCampaignTypeDialogOpen(true);
  };

  const handleCampaignTypeSelect = (type: 'warmup' | 'outreach') => {
    setSelectedCampaignType(type);
    setCampaignTypeDialogOpen(false);
    setCreateDialogOpen(true);
  };

  const updateCampaignStatus = async (campaignId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('warmup_campaigns')
        .update({ 
          status,
          ...(status === 'active' ? { started_at: new Date().toISOString() } : {}),
          ...(status === 'paused' ? { paused_at: new Date().toISOString() } : {})
        })
        .eq('id', campaignId);

      if (error) throw error;

      await loadData(user.id);
    } catch (error: any) {
      console.error('Error updating campaign status:', error);
      setError(`Failed to update campaign status: ${error.message}`);
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('warmup_campaigns')
        .delete()
        .eq('id', campaignId);

      if (error) throw error;

      await loadData(user.id);
    } catch (error: any) {
      console.error('Error deleting campaign:', error);
      setError(`Failed to delete campaign: ${error.message}`);
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
        return <CheckCircle2 className="h-3 w-3" />;
      case 'draft':
        return <Clock className="h-3 w-3" />;
      default:
        return <Activity className="h-3 w-3" />;
    }
  };

  const calculateProgress = (campaign: any) => {
    const startDate = new Date(campaign.start_date);
    const endDate = new Date(campaign.end_date);
    const currentDate = new Date();
    
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysPassed = Math.ceil((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return Math.min(Math.max((daysPassed / totalDays) * 100, 0), 100);
  };

  const handleManualSend = async (campaign: any) => {
    setSelectedCampaignForSend(campaign);
    setManualSendDialogOpen(true);
  };

  const sendManualBatch = async () => {
    if (!selectedCampaignForSend) return;

    setSendingBatch(true);
    setError('');

    try {
      const response = await fetch(`/api/campaigns/${selectedCampaignForSend.id}/send-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send batch');
      }

      setManualSendDialogOpen(false);
      setSelectedCampaignForSend(null);
      await loadData(user.id);
    } catch (error: any) {
      console.error('Error sending batch:', error);
      setError(error.message || 'Failed to send batch');
    } finally {
      setSendingBatch(false);
    }
  };

  const getFilteredCampaigns = () => {
    if (activeTab === 'all') return campaigns;
    if (activeTab === 'warmup') return campaigns.filter((c: any) => c.campaign_type === 'warmup' || !c.campaign_type);
    if (activeTab === 'outreach') return campaigns.filter((c: any) => c.campaign_type === 'outreach');
    return campaigns;
  };

  const filteredCampaigns = getFilteredCampaigns();

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
              Campaigns
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Manage and monitor your warmup and outreach campaigns
            </p>
          </div>
          {/* Campaign Type Selection Dialog */}
          <Dialog open={campaignTypeDialogOpen} onOpenChange={setCampaignTypeDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={handleNewCampaignClick}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Choose Campaign Type</DialogTitle>
                <DialogDescription>
                  Select the type of campaign you want to create
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-blue-500"
                  onClick={() => handleCampaignTypeSelect('warmup')}
                >
                  <CardHeader>
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center mb-2">
                      <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-lg">Warmup Campaign</CardTitle>
                    <CardDescription className="text-sm">
                      Build sender reputation by gradually increasing email volume
                    </CardDescription>
                  </CardHeader>
                </Card>
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-purple-500"
                  onClick={() => handleCampaignTypeSelect('outreach')}
                >
                  <CardHeader>
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-2">
                      <Mail className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-lg">Outreach Campaign</CardTitle>
                    <CardDescription className="text-sm">
                      Send personalized emails to your prospect lists
                    </CardDescription>
                  </CardHeader>
                </Card>
              </div>
            </DialogContent>
          </Dialog>

          {/* Campaign Creation Dialog */}
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {selectedCampaignType === 'outreach' ? 'Create Outreach Campaign' : 'Create Warmup Campaign'}
                </DialogTitle>
                <DialogDescription>
                  {selectedCampaignType === 'outreach'
                    ? 'Set up a new outreach campaign to send personalized emails to prospects'
                    : 'Set up a new email warmup campaign to improve your sender reputation'}
                </DialogDescription>
              </DialogHeader>
              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {selectedCampaignType === 'outreach' ? (
                <OutreachCampaignForm
                  emailAccounts={emailAccounts}
                  prospectLists={prospectLists}
                  onSubmit={createCampaign}
                  onCancel={() => {
                    setCreateDialogOpen(false);
                    setSelectedCampaignType(null);
                  }}
                  isSubmitting={creating}
                />
              ) : (
                <CampaignForm
                  emailAccounts={emailAccounts}
                  onSubmit={createCampaign}
                  onCancel={() => {
                    setCreateDialogOpen(false);
                    setSelectedCampaignType(null);
                  }}
                  isSubmitting={creating}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Campaigns Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3 mb-6">
            <TabsTrigger value="all">
              All Campaigns
            </TabsTrigger>
            <TabsTrigger value="warmup">
              <TrendingUp className="h-4 w-4 mr-2" />
              Warmup
            </TabsTrigger>
            <TabsTrigger value="outreach">
              <Users className="h-4 w-4 mr-2" />
              Outreach
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            {/* Campaigns Grid */}
            {filteredCampaigns.length === 0 ? (
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
                <CardContent className="p-12 text-center">
                  <Activity className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {activeTab === 'warmup' ? 'No warmup campaigns yet' : activeTab === 'outreach' ? 'No outreach campaigns yet' : 'No campaigns yet'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
                    {activeTab === 'warmup' 
                      ? 'Create a warmup campaign to improve your email deliverability and sender reputation'
                      : activeTab === 'outreach'
                      ? 'Create an outreach campaign to send personalized emails to your prospects'
                      : 'Create your first campaign to get started with email warmup or outreach'}
                  </p>
                  <Button 
                    onClick={handleNewCampaignClick}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Campaign
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCampaigns.map((campaign: any) => (
              <Card key={campaign.id} className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 hover:shadow-xl transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-8 h-8 ${campaign.campaign_type === 'outreach' ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'} rounded-lg flex items-center justify-center`}>
                        <Mail className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg truncate">{campaign.name}</CardTitle>
                          {campaign.campaign_type === 'outreach' && (
                            <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300 border-0 text-xs">
                              Outreach
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="text-xs truncate">
                          {campaign.connected_emails?.email_address}
                          {campaign.campaign_type === 'outreach' && campaign.prospect_lists && (
                            <span className="ml-2">• {campaign.prospect_lists.name}</span>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className={`${getStatusColor(campaign.status)} border-0`}>
                      <div className="flex items-center space-x-1">
                        {getStatusIcon(campaign.status)}
                        <span className="capitalize">{campaign.status}</span>
                      </div>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">Progress</span>
                      <span className="font-medium">{Math.round(calculateProgress(campaign))}%</span>
                    </div>
                    <Progress value={calculateProgress(campaign)} className="h-2" />
                  </div>

                  {/* Stats */}
                  {campaign.campaign_type === 'outreach' && outreachMetrics[campaign.id] ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="space-y-1">
                          <div className="flex items-center text-gray-600 dark:text-gray-300">
                            <Send className="h-3 w-3 mr-1" />
                            <span className="text-xs">Contacted</span>
                          </div>
                          <p className="font-semibold text-blue-600">{outreachMetrics[campaign.id].contacted}</p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center text-gray-600 dark:text-gray-300">
                            <Eye className="h-3 w-3 mr-1" />
                            <span className="text-xs">Engaged</span>
                          </div>
                          <p className="font-semibold text-green-600">{outreachMetrics[campaign.id].engaged}</p>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center text-gray-600 dark:text-gray-300">
                            <Reply className="h-3 w-3 mr-1" />
                            <span className="text-xs">Replied</span>
                          </div>
                          <p className="font-semibold text-purple-600">{outreachMetrics[campaign.id].replied}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="space-y-1">
                          <p className="text-gray-600 dark:text-gray-300 text-xs">Open Rate</p>
                          <p className="font-semibold">{outreachMetrics[campaign.id].openRate}%</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-gray-600 dark:text-gray-300 text-xs">Reply Rate</p>
                          <p className="font-semibold">{outreachMetrics[campaign.id].replyRate}%</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <p className="text-gray-600 dark:text-gray-300">Daily Volume</p>
                        <p className="font-semibold">{campaign.daily_volume} emails</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-gray-600 dark:text-gray-300">Duration</p>
                        <p className="font-semibold">
                          {Math.ceil((new Date(campaign.end_date).getTime() - new Date(campaign.start_date).getTime()) / (1000 * 60 * 60 * 24))} days
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Date Range */}
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.end_date).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex space-x-2">
                      {campaign.campaign_type === 'outreach' && campaign.outreach_mode === 'manual' && campaign.status === 'active' ? (
                        <Button
                          size="sm"
                          onClick={() => handleManualSend(campaign)}
                          className="bg-purple-600 hover:bg-purple-700 flex-1 sm:flex-none"
                        >
                          <Send className="h-3 w-3 mr-1" />
                          Send Batch
                        </Button>
                      ) : campaign.status === 'active' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCampaignStatus(campaign.id, 'paused')}
                          className="flex-1 sm:flex-none"
                        >
                          <Pause className="h-3 w-3 mr-1" />
                          Pause
                        </Button>
                      ) : campaign.status === 'paused' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCampaignStatus(campaign.id, 'active')}
                          className="flex-1 sm:flex-none"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Resume
                        </Button>
                      ) : campaign.status === 'draft' ? (
                        <Button
                          size="sm"
                          onClick={() => updateCampaignStatus(campaign.id, 'active')}
                          className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Start
                        </Button>
                      ) : null}
                    </div>
                    <div className="flex space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => router.push('/analytics')} className="flex-1 sm:flex-none">
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => deleteCampaign(campaign.id)}
                        className="text-red-600 hover:text-red-700 flex-1 sm:flex-none"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>

    {/* Manual Send Approval Dialog */}
    <Dialog open={manualSendDialogOpen} onOpenChange={setManualSendDialogOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Send Manual Batch</DialogTitle>
          <DialogDescription>
            Review and approve sending the next batch of emails for this campaign
          </DialogDescription>
        </DialogHeader>
        {selectedCampaignForSend && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-gray-900 dark:text-white">Campaign Details</h4>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Campaign:</span>
                  <span className="font-medium">{selectedCampaignForSend.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Prospect List:</span>
                  <span className="font-medium">{selectedCampaignForSend.prospect_lists?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Daily Volume:</span>
                  <span className="font-medium">{selectedCampaignForSend.daily_volume} emails</span>
                </div>
              </div>
            </div>
            <Alert>
              <Send className="h-4 w-4" />
              <AlertDescription>
                This will send up to {selectedCampaignForSend.daily_volume} personalized emails to prospects who haven't been contacted yet.
              </AlertDescription>
            </Alert>
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}
        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={() => {
              setManualSendDialogOpen(false);
              setSelectedCampaignForSend(null);
            }}
            disabled={sendingBatch}
          >
            Cancel
          </Button>
          <Button
            onClick={sendManualBatch}
            disabled={sendingBatch}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {sendingBatch ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Batch
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
      </main>
    </div>
  );
}