'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { smtpConnectionSchema, type SMTPConnectionInput } from '@/lib/validation-schemas';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Mail, Server } from 'lucide-react';
import { FormField } from '@/components/forms/form-field';
import { useState } from 'react';

export default function SmtpForm({ onEmailConnected }: { onEmailConnected: () => void }) {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<SMTPConnectionInput>({
    resolver: zodResolver(smtpConnectionSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      host: '',
      port: 587,
      username: '',
      password: '',
      secure: false,
    },
  });

  const onSubmit = async (data: SMTPConnectionInput) => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/emails/connect-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to connect');
      }

      setSuccess('Email account connected successfully!');
      reset();
      onEmailConnected();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Server className="h-5 w-5 mr-2" />
          Connect with SMTP
        </CardTitle>
        <CardDescription>
          Enter your SMTP credentials to connect your email account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert variant="default" className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700">
              <Mail className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
          
          <FormField
            label="Email Address"
            name="email"
            type="email"
            placeholder="your.name@example.com"
            register={register('email')}
            error={errors.email?.message}
            required
          />

          <FormField
            label="Username"
            name="username"
            type="text"
            placeholder="Usually your email address"
            register={register('username')}
            error={errors.username?.message}
            required
            helpText="Usually the same as your email address"
          />

          <FormField
            label="Password / App Password"
            name="password"
            type="password"
            placeholder="Enter your email password or app password"
            register={register('password')}
            error={errors.password?.message}
            required
            helpText="Use an app-specific password for better security"
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="SMTP Host"
              name="host"
              type="text"
              placeholder="smtp.example.com"
              register={register('host')}
              error={errors.host?.message}
              required
            />

            <FormField
              label="SMTP Port"
              name="port"
              type="number"
              placeholder="587"
              register={register('port', { valueAsNumber: true })}
              error={errors.port?.message}
              required
              helpText="Usually 587 or 465"
            />
          </div>

          <Button type="submit" disabled={loading || !isValid} className="w-full">
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Connecting...</span>
              </div>
            ) : (
              'Connect Account'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
