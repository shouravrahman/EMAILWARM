'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface WarmupPoolEmail {
  id: string;
  email_address: string;
  provider: string | null;
  status: string;
  mx_verified: boolean;
  mx_records: any;
  usage_count: number;
  bounce_count: number;
  bounce_rate: number;
  last_used_at: string | null;
  created_at: string;
}

export function WarmupPoolManager() {
  const [emails, setEmails] = useState<WarmupPoolEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);

  useEffect(() => {
    loadEmails();
  }, []);

  const loadEmails = async () => {
    try {
      const response = await fetch('/api/admin/warmup-pool');
      if (!response.ok) throw new Error('Failed to load emails');
      const data = await response.json();
      setEmails(data.emails || []);
    } catch (error) {
      toast.error('Failed to load warmup pool emails');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const addEmail = async () => {
    if (!newEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setAdding(true);
    try {
      const response = await fetch('/api/admin/warmup-pool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail.trim() })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add email');
      }

      const data = await response.json();
      toast.success('Email added successfully');
      setNewEmail('');
      await loadEmails();
    } catch (error: any) {
      toast.error(error.message || 'Failed to add email');
    } finally {
      setAdding(false);
    }
  };

  const verifyEmail = async (emailId: string) => {
    setVerifying(emailId);
    try {
      const response = await fetch(`/api/admin/warmup-pool/${emailId}/verify`, {
        method: 'POST'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to verify email');
      }

      toast.success('Email verified successfully');
      await loadEmails();
    } catch (error: any) {
      toast.error(error.message || 'Failed to verify email');
    } finally {
      setVerifying(null);
    }
  };

  const removeEmail = async (emailId: string) => {
    if (!confirm('Are you sure you want to remove this email from the warmup pool?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/warmup-pool/${emailId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to remove email');

      toast.success('Email removed successfully');
      await loadEmails();
    } catch (error) {
      toast.error('Failed to remove email');
      console.error(error);
    }
  };

  const getStatusBadge = (email: WarmupPoolEmail) => {
    if (email.status === 'inactive') {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    if (email.bounce_rate > 10) {
      return <Badge variant="destructive">High Bounce Rate</Badge>;
    }
    if (!email.mx_verified) {
      return <Badge variant="outline">Not Verified</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Warmup Pool Email Management</CardTitle>
        <CardDescription>
          Manage email addresses used for warmup campaigns. Emails with valid MX records will be used for sending warmup messages.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Add Email Form */}
          <div className="flex gap-2">
            <Input
              placeholder="email@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addEmail()}
              disabled={adding}
            />
            <Button onClick={addEmail} disabled={adding}>
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              <span className="ml-2">Add Email</span>
            </Button>
          </div>

          {/* Email List */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>MX Verified</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Bounce Rate</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emails.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No emails in warmup pool. Add some to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  emails.map((email) => (
                    <TableRow key={email.id}>
                      <TableCell className="font-medium">{email.email_address}</TableCell>
                      <TableCell>{getStatusBadge(email)}</TableCell>
                      <TableCell>
                        {email.mx_verified ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-gray-400" />
                        )}
                      </TableCell>
                      <TableCell>{email.usage_count}</TableCell>
                      <TableCell>
                        {email.bounce_rate > 0 ? (
                          <span className={email.bounce_rate > 10 ? 'text-red-600 font-semibold' : ''}>
                            {email.bounce_rate.toFixed(1)}%
                          </span>
                        ) : (
                          '0%'
                        )}
                      </TableCell>
                      <TableCell>
                        {email.last_used_at
                          ? new Date(email.last_used_at).toLocaleDateString()
                          : 'Never'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => verifyEmail(email.id)}
                            disabled={verifying === email.id}
                          >
                            {verifying === email.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeEmail(email.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-4 gap-4 pt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Emails</CardDescription>
                <CardTitle className="text-2xl">{emails.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Verified</CardDescription>
                <CardTitle className="text-2xl">
                  {emails.filter(e => e.mx_verified).length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Active</CardDescription>
                <CardTitle className="text-2xl">
                  {emails.filter(e => e.status === 'active').length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Avg Bounce Rate</CardDescription>
                <CardTitle className="text-2xl">
                  {emails.length > 0
                    ? (emails.reduce((sum, e) => sum + e.bounce_rate, 0) / emails.length).toFixed(1)
                    : '0'}%
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
