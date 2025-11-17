'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { campaignSchema } from '@/lib/validation-schemas';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Info, Sparkles } from 'lucide-react';
import { useState } from 'react';

type OutreachCampaignInput = z.infer<typeof campaignSchema>;

interface ProspectList {
  id: string;
  name: string;
  total_prospects: number;
  active_prospects: number;
}

interface OutreachCampaignFormProps {
  emailAccounts: Array<{ id: string; email_address: string; provider: string }>;
  prospectLists: ProspectList[];
  onSubmit: (data: OutreachCampaignInput) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  defaultValues?: Partial<OutreachCampaignInput>;
}

const defaultTemplate = `Subject: Quick introduction, {{first_name}}

Hi {{first_name}},

I hope this email finds you well. I came across your profile{{#if company}} at {{company}}{{/if}} and was impressed by your work{{#if title}} as {{title}}{{/if}}.

I'd love to connect and potentially explore opportunities for collaboration.

Looking forward to hearing from you.

Best regards,
{{sender_name}}`;

export function OutreachCampaignForm({
  emailAccounts,
  prospectLists,
  onSubmit,
  onCancel,
  isSubmitting = false,
  defaultValues,
}: OutreachCampaignFormProps) {
  const [showVariables, setShowVariables] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm<OutreachCampaignInput>({
    resolver: zodResolver(campaignSchema),
    mode: 'onChange',
    defaultValues: defaultValues || {
      name: '',
      emailId: '',
      dailyVolume: 5,
      campaignType: 'outreach',
      prospectListId: '',
      outreachMode: 'automated',
      personalizationTemplate: defaultTemplate,
    },
  });

  const emailId = watch('emailId');
  const dailyVolume = watch('dailyVolume');
  const prospectListId = watch('prospectListId');
  const outreachMode = watch('outreachMode');
  const personalizationTemplate = watch('personalizationTemplate');

  const selectedList = prospectLists.find((list) => list.id === prospectListId);

  const handleFormSubmit = async (data: OutreachCampaignInput) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const availableVariables = [
    { key: '{{first_name}}', desc: "Prospect's first name" },
    { key: '{{last_name}}', desc: "Prospect's last name" },
    { key: '{{company}}', desc: "Prospect's company" },
    { key: '{{title}}', desc: "Prospect's job title" },
    { key: '{{custom_field_1}}', desc: 'Custom field 1' },
    { key: '{{custom_field_2}}', desc: 'Custom field 2' },
    { key: '{{custom_field_3}}', desc: 'Custom field 3' },
    { key: '{{sender_name}}', desc: 'Your name' },
    { key: '{{sender_company}}', desc: 'Your company' },
    { key: '{{sender_title}}', desc: 'Your title' },
  ];

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Campaign Name */}
      <div className="space-y-2">
        <Label htmlFor="name">
          Campaign Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          placeholder="e.g., Q1 Product Launch Outreach"
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

      {/* Prospect List */}
      <div className="space-y-2">
        <Label htmlFor="prospectListId">
          Prospect List <span className="text-red-500">*</span>
        </Label>
        <Select
          value={prospectListId}
          onValueChange={(value: string) =>
            setValue('prospectListId', value, { shouldValidate: true })
          }
        >
          <SelectTrigger className={errors.prospectListId ? 'border-red-500' : ''}>
            <SelectValue placeholder="Select prospect list" />
          </SelectTrigger>
          <SelectContent>
            {prospectLists.length === 0 ? (
              <SelectItem value="" disabled>
                No prospect lists available
              </SelectItem>
            ) : (
              prospectLists.map((list) => (
                <SelectItem key={list.id} value={list.id}>
                  {list.name} ({list.active_prospects} active prospects)
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {errors.prospectListId && (
          <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {errors.prospectListId.message}
          </p>
        )}
        {selectedList && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            This list contains {selectedList.total_prospects} total prospects,{' '}
            {selectedList.active_prospects} active
          </p>
        )}
        {prospectLists.length === 0 && (
          <Alert>
            <AlertDescription className="text-sm">
              You need to import prospects first. Go to the Prospects page to upload a CSV.
            </AlertDescription>
          </Alert>
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
      </div>

      {/* Outreach Mode */}
      <div className="space-y-2">
        <Label htmlFor="outreachMode">
          Outreach Mode <span className="text-red-500">*</span>
        </Label>
        <Select
          value={outreachMode}
          onValueChange={(value: 'automated' | 'manual') =>
            setValue('outreachMode', value, { shouldValidate: true })
          }
        >
          <SelectTrigger className={errors.outreachMode ? 'border-red-500' : ''}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="automated">
              Automated - Send emails automatically based on schedule
            </SelectItem>
            <SelectItem value="manual">Manual - Review and approve each batch before sending</SelectItem>
          </SelectContent>
        </Select>
        {errors.outreachMode && (
          <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {errors.outreachMode.message}
          </p>
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
          Start with lower volume to maintain good sender reputation
        </p>
      </div>

      {/* Personalization Template */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="personalizationTemplate">
            Email Template <span className="text-red-500">*</span>
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowVariables(!showVariables)}
            className="text-xs"
          >
            <Info className="h-3 w-3 mr-1" />
            {showVariables ? 'Hide' : 'Show'} Variables
          </Button>
        </div>
        
        {showVariables && (
          <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-xs space-y-1">
              <p className="font-semibold text-blue-900 dark:text-blue-100">
                Available Variables:
              </p>
              <div className="grid grid-cols-2 gap-1 mt-2">
                {availableVariables.map((v) => (
                  <div key={v.key} className="text-blue-800 dark:text-blue-200">
                    <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded text-xs">
                      {v.key}
                    </code>
                    <span className="ml-1 text-xs">- {v.desc}</span>
                  </div>
                ))}
              </div>
              <p className="text-blue-700 dark:text-blue-300 mt-2">
                AI will enhance your template with natural variations to avoid spam detection.
              </p>
            </AlertDescription>
          </Alert>
        )}

        <Textarea
          id="personalizationTemplate"
          placeholder="Enter your email template with variables..."
          rows={12}
          {...register('personalizationTemplate')}
          className={`font-mono text-sm ${errors.personalizationTemplate ? 'border-red-500' : ''}`}
        />
        {errors.personalizationTemplate && (
          <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {errors.personalizationTemplate.message}
          </p>
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Include "Subject:" on the first line. Use variables like {'{'}
          {'{'}first_name{'}'}{'}'}  for personalization.
        </p>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={
            isSubmitting ||
            !isValid ||
            emailAccounts.length === 0 ||
            prospectLists.length === 0
          }
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          {isSubmitting ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Creating...</span>
            </div>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Create Outreach Campaign
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
