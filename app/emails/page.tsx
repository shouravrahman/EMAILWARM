'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import Navbar from '@/components/layout/navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Mail,
  Plus,
  Trash2,
  Settings,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Shield,
  Zap,
  Globe,
  Search,
  Eye,
  Archive,
  Star,
  Reply,
  Forward,
  MoreHorizontal
} from 'lucide-react';

export default function EmailsPage() {
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();
  const [emailAccounts, setEmailAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [newEmail, setNewEmail] = useState({
    email_address: '',
    provider: 'gmail'
  });
  const router = useRouter();
  const searchParams = useSearchParams();

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

    // Check for OAuth success/error
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    
    if (success === 'connected') {
      // Refresh the page to show new connection
      window.location.reload();
    } else if (error) {
      console.error('OAuth error:', error);
      setError(`Connection failed: ${error}`);
    }
  }, [router, searchParams]);

  const loadEmailAccounts = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('connected_emails')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setEmailAccounts(data || []);
    } catch (error) {
      console.error('Error loading email accounts:', error);
      setError('Failed to load email accounts');
    } finally {
      setLoading(false);
    }
  };

  const createEmailAccount = async () => {
    if (!user || !newEmail.email_address) {
      setError('Please enter an email address');
      return;
    }

    setCreating(true);
    setError('');

    try {
      // For demo purposes, create a mock email account
      const { data, error } = await supabase
        .from('connected_emails')
        .insert([{
          user_id: user.id,
          email_address: newEmail.email_address,
          provider: newEmail.provider,
          oauth_tokens: { mock: true }, // In real app, this would be OAuth tokens
          status: 'active'
        }])
        .select()
        .single();

      if (error) throw error;

      setConnectDialogOpen(false);
      setNewEmail({ email_address: '', provider: 'gmail' });
      await loadEmailAccounts(user.id);
    } catch (error) {
      console.error('Error creating email account:', error);
      setError('Failed to connect email account');
    } finally {
      setCreating(false);
    }
  };

  const disconnectEmail = async (emailId: string) => {
    if (!confirm('Are you sure you want to disconnect this email account?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('connected_emails')
        .delete()
        .eq('id', emailId);

      if (error) throw error;

      await loadEmailAccounts(user.id);
    } catch (error) {
      console.error('Error disconnecting email:', error);
      setError('Failed to disconnect email account');
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
      color: 'from-red-500 to-pink-500'
    },
    {
      id: 'outlook',
      name: 'Outlook',
      description: 'Connect your Outlook account',
      icon: <Mail className="h-8 w-8 text-blue-500" />,
      color: 'from-blue-500 to-indigo-500'
    },
    {
      id: 'yahoo',
      name: 'Yahoo',
      description: 'Connect your Yahoo account',
      icon: <Mail className="h-8 w-8 text-purple-500" />,
      color: 'from-purple-500 to-pink-500'
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
        {/* Header */}
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
              <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                <Plus className="h-4 w-4 mr-2" />
                Connect Email
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Connect Email Account</DialogTitle>
                <DialogDescription>
                  Add a new email account for warmup campaigns
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
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address"
                    value={newEmail.email_address}
                    onChange={(e) => setNewEmail({ ...newEmail, email_address: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="provider">Provider</Label>
                  <Select value={newEmail.provider} onValueChange={(value) => setNewEmail({ ...newEmail, provider: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gmail">Gmail</SelectItem>
                      <SelectItem value="outlook">Outlook</SelectItem>
                      <SelectItem value="yahoo">Yahoo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    This is a demo version. In production, OAuth authentication would be used for secure connection.
                  </AlertDescription>
                </Alert>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConnectDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={createEmailAccount}
                  disabled={creating}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                >
                  {creating ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Connecting...</span>
                    </div>
                  ) : (
                    'Connect Account'
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
                      <div>
                        <CardTitle className="text-lg">{email.email_address}</CardTitle>
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

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Sync
                      </Button>
                      <Button size="sm" variant="outline">
                        <Settings className="h-3 w-3 mr-1" />
                        Settings
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => disconnectEmail(email.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Info Section */}
        <div className="mt-8">
          <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
            <CardContent className="p-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Secure Email Integration
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Your email credentials are encrypted and stored securely. We only access what's necessary for warmup functionality.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span>End-to-end encryption</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span>OAuth 2.0 authentication</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span>Minimal permissions</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span>Revoke access anytime</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}