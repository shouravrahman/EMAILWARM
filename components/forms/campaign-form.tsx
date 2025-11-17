'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { campaignSchema, type CampaignInput } from '@/lib/validation-schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface CampaignFormProps {
  emailAccounts: Array<{ id: string; email_address: string; provider: string }>;
  onSubmit: (data: CampaignInput) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  defaultValues?: Partial<CampaignInput>;
}

export function CampaignForm({
  emailAccounts,
  onSubmit,
  onCancel,
  isSubmitting = false,
  defaultValues,
}: CampaignFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<CampaignInput>({
    resolver: zodResolver(campaignSchema),
    mode: 'onChange', // Real-time validation
    defaultValues: defaultValues || {
      name: '',
      emailId: '',
      dailyVolume: 5,
    },
  });

  const emailId = watch('emailId');
  const dailyVolume = watch('dailyVolume');

  const handleFormSubmit = async (data: CampaignInput) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Campaign Name */}
      <div className="space-y-2">
        <Label htmlFor="name">
          Campaign Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          placeholder="Enter campaign name"
          {...register('name')}
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && (
          <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Email Account */}
      <div className="space-y-2">
        <Label htmlFor="emailId">
          Email Account <span className="text-red-500">*</span>
        </Label>
        <Select
          value={emailId}
          onValueChange={(value: string) => setValue('emailId', value, { shouldValidate: true })}
        >
          <SelectTrigger className={errors.emailId ? 'border-red-500' : ''}>
            <SelectValue placeholder="Select email account" />
          </SelectTrigger>
          <SelectContent>
            {emailAccounts.length === 0 ? (
              <SelectItem value="" disabled>
                No email accounts connected
              </SelectItem>
            ) : (
              emailAccounts.map((email) => (
                <SelectItem key={email.id} value={email.id}>
                  {email.email_address} ({email.provider})
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {errors.emailId && (
          <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {errors.emailId.message}
          </p>
        )}
        {emailAccounts.length === 0 && (
          <Alert>
            <AlertDescription className="text-sm">
              You need to connect an email account first. Go to the Emails page to connect one.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Daily Volume */}
      <div className="space-y-2">
        <Label htmlFor="dailyVolume">
          Daily Volume <span className="text-red-500">*</span>
        </Label>
        <Select
          value={dailyVolume?.toString()}
          onValueChange={(value: string) =>
            setValue('dailyVolume', parseInt(value), { shouldValidate: true })
          }
        >
          <SelectTrigger className={errors.dailyVolume ? 'border-red-500' : ''}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 email/day</SelectItem>
            <SelectItem value="5">5 emails/day</SelectItem>
            <SelectItem value="10">10 emails/day</SelectItem>
            <SelectItem value="15">15 emails/day</SelectItem>
            <SelectItem value="20">20 emails/day</SelectItem>
            <SelectItem value="25">25 emails/day</SelectItem>
            <SelectItem value="30">30 emails/day</SelectItem>
            <SelectItem value="40">40 emails/day</SelectItem>
            <SelectItem value="50">50 emails/day</SelectItem>
          </SelectContent>
        </Select>
        {errors.dailyVolume && (
          <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {errors.dailyVolume.message}
          </p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Start with a lower volume and gradually increase to build sender reputation
        </p>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || !isValid || emailAccounts.length === 0}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          {isSubmitting ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Creating...</span>
            </div>
          ) : (
            'Create Campaign'
          )}
        </Button>
      </div>
    </form>
  );
}
