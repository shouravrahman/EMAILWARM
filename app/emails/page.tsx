'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Navbar from '@/components/layout/navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SmtpForm from '@/components/smtp-form';
import {
  Mail,
  Plus,
  Trash2,
  Settings,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Server,
} from 'lucide-react';

export default function EmailsPage() {
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();
  const [emailAccounts, setEmailAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }
      setUser(user);
      await loadEmailAccounts(user.id);
    };

    getUser();
  }, [supabase, router]);

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    
    if (success === 'connected') {
      // Consider showing a success toast instead of reloading
    } else if (error) {
      console.error('OAuth error:', error);
      setError(`Connection failed: ${error}`);
    }
  }, [searchParams]);

  const loadEmailAccounts = async (userId: string) => {
    try {
      // Load subscription info
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .rpc('check_user_limits', { p_user_id: userId });

      if (subscriptionError) throw subscriptionError;
      setSubscriptionInfo(subscriptionData?.[0] || null);

      const { data, error } = await supabase
        .from('connected_emails')
        .select(`
          *,
          warmup_campaigns (
            id,
            status
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setEmailAccounts(data || []);
    } catch (error: any) {
      console.error('Error loading email accounts:', error);
      setError(`Failed to load email accounts: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthConnect = async (provider: string) => {
    setCreating(true);
    setError('');
    try {
      const response = await fetch('/api/auth/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      const { authUrl, error } = await response.json();
      if (error) {
        throw new Error(error);
      }
      if (authUrl) {
        window.location.href = authUrl;
      } else {
        throw new Error('Could not get authorization URL.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const [syncing, setSyncing] = useState<string | null>(null);

  const handleSync = async (emailId: string) => {
    setSyncing(emailId);
    setError('');
    try {
      const response = await fetch(`/api/emails/${emailId}/sync`, {
        method: 'POST',
      });
      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error);
      }
      // Optionally, show a success toast
      if (user) await loadEmailAccounts(user.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncing(null);
    }
  };

  const disconnectEmail = async (emailId: string) => {
    if (!confirm('Are you sure you want to disconnect this email account?')) {
      return;
    }

    setDisconnecting(emailId);
    setError('');
    try {
      const { error } = await supabase
        .from('connected_emails')
        .delete()
        .eq('id', emailId);

      if (error) throw error;

      // Optionally, show a success toast
      if (user) await loadEmailAccounts(user.id);
    } catch (error: any) {
      console.error('Error disconnecting email:', error);
      setError(`Failed to disconnect email account: ${error.message}`);
    } finally {
      setDisconnecting(null);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'gmail':
        return <Mail className="h-5 w-5 text-red-500" />;
      case 'outlook':
        return <Mail className="h-5 w-5 text-blue-500" />;
      case 'yahoo':
        return <Mail className="h-5 w-5 text-purple-500" />;
      case 'smtp':
        return <Server className="h-5 w-5 text-gray-500" />;
      default:
        return <Mail className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const providers = [
    {
      id: 'gmail',
      name: 'Gmail',
      description: 'Connect your Gmail account',
      icon: <Mail className="h-8 w-8 text-red-500" />,
    },
    {
      id: 'outlook',
      name: 'Outlook',
      description: 'Connect your Outlook account',
      icon: <Mail className="h-8 w-8 text-blue-500" />,
    },
    {
      id: 'yahoo',
      name: 'Yahoo',
      description: 'Connect your Yahoo account',
      icon: <Mail className="h-8 w-8 text-purple-500" />,
    }
  ];

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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Email Management
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Manage your connected email accounts
            </p>
          </div>
          <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                disabled={emailAccounts.length >= (subscriptionInfo?.email_accounts_limit || 0)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Connect Email
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Connect Email Account</DialogTitle>
                <DialogDescription>
                  Choose your connection method
                </DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="oauth" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="oauth">OAuth</TabsTrigger>
                  <TabsTrigger value="smtp">SMTP</TabsTrigger>
                </TabsList>
                <TabsContent value="oauth">
                  <div className="space-y-4 py-4">
                    {providers.map((provider) => (
                      <Button
                        key={provider.id}
                        variant="outline"
                        className="w-full justify-start h-16"
                        onClick={() => handleOAuthConnect(provider.id)}
                        disabled={creating || emailAccounts.length >= (subscriptionInfo?.email_accounts_limit || 0)}
                      >
                        <div className="flex items-center space-x-4">
                          {provider.icon}
                          <div>
                            <p className="font-semibold">{provider.name}</p>
                            <p className="text-xs text-gray-500">{provider.description}</p>
                          </div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="smtp">
                  <SmtpForm onEmailConnected={() => {
                    setConnectDialogOpen(false);
                    if (user) loadEmailAccounts(user.id);
                  }} />
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>

        {subscriptionInfo && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                You have {emailAccounts.length} of {subscriptionInfo.email_accounts_limit} email accounts connected.
              </p>
              {emailAccounts.length >= subscriptionInfo.email_accounts_limit && (
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  Upgrade your plan to connect more email accounts.
                </p>
              )}
            </div>
            {emailAccounts.length >= subscriptionInfo.email_accounts_limit && (
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                Upgrade Plan
              </Button>
            )}
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {emailAccounts.length === 0 ? (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-gray-800/80">
            <CardContent className="p-12 text-center">
              <Mail className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No email accounts connected
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
                Connect your first email account to start managing your emails and creating warmup campaigns
              </p>
              <Button 
                onClick={() => setConnectDialogOpen(true)}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Connect Your First Email
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {emailAccounts.map((email: any) => (
              <Card key={email.id} className="border-0 shadow-lg bg-white/80 backdrop-blur-sm dark:bg-gray-800/80 hover:shadow-xl transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                        {getProviderIcon(email.provider)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-lg truncate">{email.email_address}</CardTitle>
                        <CardDescription className="text-xs capitalize">
                          {email.provider}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className={`${getStatusColor(email.status)} border-0`}>
                      {email.status === 'active' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {email.status === 'error' && <AlertTriangle className="h-3 w-3 mr-1" />}
                      {email.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-1">
                      <p className="text-gray-600 dark:text-gray-300">Connected</p>
                      <p className="font-semibold">
                        {new Date(email.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-gray-600 dark:text-gray-300">Last Sync</p>
                      <p className="font-semibold">
                        {new Date(email.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {email.warmup_campaigns && email.warmup_campaigns.length > 0 && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-600 dark:text-gray-300">Warmup Status</p>
                          <Badge className={`${getStatusColor(email.warmup_campaigns[0].status)} border-0`}>
                            {email.warmup_campaigns[0].status}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/campaigns`)}
                        >
                          Go to campaign
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleSync(email.id)}
                        disabled={syncing === email.id}
                        className="flex-1 sm:flex-none"
                      >
                        {syncing === email.id ? (
                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3 mr-1" />
                        )}
                        Sync
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedEmail(email);
                          setSettingsDialogOpen(true);
                        }}
                        className="flex-1 sm:flex-none"
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        Settings
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => disconnectEmail(email.id)}
                      disabled={disconnecting === email.id}
                      className="text-red-600 hover:text-red-700"
                    >
                      {disconnecting === email.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Email Settings</DialogTitle>
              <DialogDescription>
                {selectedEmail?.email_address}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p>Provider: {selectedEmail?.provider}</p>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}