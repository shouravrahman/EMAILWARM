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
  AlertTriangle
} from 'lucide-react';

export default function CampaignsPage() {
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();
  const [campaigns, setCampaigns] = useState([]);
  const [emailAccounts, setEmailAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    email_id: '',
    start_date: '',
    end_date: '',
    daily_volume: 5,
    settings: {}
  });
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
      // Load campaigns with email info
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('warmup_campaigns')
        .select(`
          *,
          connected_emails (
            email_address,
            provider,
            status
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

      setCampaigns(campaignsData || []);
      setEmailAccounts(emailsData || []);
    } catch (error) {
      console.error('Error loading campaigns:', error);
      setError('Failed to load campaigns. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async () => {
    if (!user || !newCampaign.name || !newCampaign.email_id || !newCampaign.start_date || !newCampaign.end_date) {
      setError('Please fill in all required fields');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('warmup_campaigns')
        .insert([{
          user_id: user.id,
          name: newCampaign.name,
          email_id: newCampaign.email_id,
          start_date: newCampaign.start_date,
          end_date: newCampaign.end_date,
          daily_volume: newCampaign.daily_volume,
          settings: newCampaign.settings,
          status: 'draft'
        }])
        .select()
        .single();

      if (error) throw error;

      setCreateDialogOpen(false);
      setNewCampaign({
        name: '',
        email_id: '',
        start_date: '',
        end_date: '',
        daily_volume: 5,
        settings: {}
      });
      await loadData(user.id);
    } catch (error) {
      console.error('Error creating campaign:', error);
      setError('Failed to create campaign. Please try again.');
    } finally {
      setCreating(false);
    }
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
    } catch (error) {
      console.error('Error updating campaign status:', error);
      setError('Failed to update campaign status');
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
    } catch (error) {
      console.error('Error deleting campaign:', error);
      setError('Failed to delete campaign');
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
              Warmup Campaigns
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Manage and monitor your email warmup campaigns
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                <Plus className="h-4 w-4 mr-2" />
                New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create Warmup Campaign</DialogTitle>
                <DialogDescription>
                  Set up a new email warmup campaign to improve your sender reputation
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="name">Campaign Name *</Label>
                  <Input
                    id="name"
                    placeholder="Enter campaign name"
                    value={newCampaign.name}
                    onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Account *</Label>
                  <Select value={newCampaign.email_id} onValueChange={(value) => setNewCampaign({ ...newCampaign, email_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select email account" />
                    </SelectTrigger>
                    <SelectContent>
                      {emailAccounts.length === 0 ? (
                        <SelectItem value="" disabled>No email accounts connected</SelectItem>
                      ) : (
                        emailAccounts.map((email: any) => (
                          <SelectItem key={email.id} value={email.id}>
                            {email.email_address} ({email.provider})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {emailAccounts.length === 0 && (
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      You need to connect an email account first. Go to the Emails page to connect one.
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={newCampaign.start_date}
                      onChange={(e) => setNewCampaign({ ...newCampaign, start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date *</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={newCampaign.end_date}
                      onChange={(e) => setNewCampaign({ ...newCampaign, end_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="daily_volume">Daily Volume</Label>
                  <Select
                    value={newCampaign.daily_volume.toString()}
                    onValueChange={(value) => setNewCampaign({ ...newCampaign, daily_volume: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 emails/day</SelectItem>
                      <SelectItem value="10">10 emails/day</SelectItem>
                      <SelectItem value="15">15 emails/day</SelectItem>
                      <SelectItem value="20">20 emails/day</SelectItem>
                      <SelectItem value="25">25 emails/day</SelectItem>
                      <SelectItem value="30">30 emails/day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={createCampaign} 
                  disabled={creating || emailAccounts.length === 0}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  {creating ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating...</span>
                    </div>
                  ) : (
                    'Create Campaign'
                  )}
                </Button>
              </DialogFooter>
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

        {/* Campaigns Grid */}
        {campaigns.length === 0 ? (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
            <CardContent className="p-12 text-center">
              <Activity className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No campaigns yet
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
                Create your first warmup campaign to improve your email deliverability and sender reputation
              </p>
              <Button 
                onClick={() => setCreateDialogOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Campaign
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign: any) => (
              <Card key={campaign.id} className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 hover:shadow-xl transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                        <Mail className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{campaign.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {campaign.connected_emails?.email_address}
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

                  {/* Date Range */}
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.end_date).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex space-x-2">
                      {campaign.status === 'active' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCampaignStatus(campaign.id, 'paused')}
                        >
                          <Pause className="h-3 w-3 mr-1" />
                          Pause
                        </Button>
                      ) : campaign.status === 'paused' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCampaignStatus(campaign.id, 'active')}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Resume
                        </Button>
                      ) : campaign.status === 'draft' ? (
                        <Button
                          size="sm"
                          onClick={() => updateCampaignStatus(campaign.id, 'active')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Start
                        </Button>
                      ) : null}
                    </div>
                    <div className="flex space-x-1">
                      <Button size="sm" variant="ghost" onClick={() => router.push('/analytics')}>
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => deleteCampaign(campaign.id)}
                        className="text-red-600 hover:text-red-700"
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
      </main>
    </div>
  );
}