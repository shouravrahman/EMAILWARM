'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { emailSendSchema, type EmailSendInput } from '@/lib/validation-schemas';
import { Button } from '@/components/ui/button';
import { FormField, TextareaFormField } from './form-field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Send } from 'lucide-react';

interface EmailSendFormProps {
  campaignId: string;
  emailId: string;
  onSubmit: (data: EmailSendInput) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function EmailSendForm({
  campaignId,
  emailId,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: EmailSendFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<EmailSendInput>({
    resolver: zodResolver(emailSendSchema),
    mode: 'onChange',
    defaultValues: {
      campaign_id: campaignId,
      email_id: emailId,
      recipient: '',
      subject: '',
      content: '',
    },
  });

  const handleFormSubmit = async (data: EmailSendInput) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Recipient Email */}
      <FormField
        label="Recipient Email"
        name="recipient"
        type="email"
        placeholder="recipient@example.com"
        register={register('recipient')}
        error={errors.recipient?.message}
        required
        helpText="Enter a valid email address"
      />

      {/* Subject */}
      <FormField
        label="Subject"
        name="subject"
        type="text"
        placeholder="Enter email subject"
        register={register('subject')}
        error={errors.subject?.message}
        required
        helpText="Keep it concise and relevant"
      />

      {/* Email Content */}
      <TextareaFormField
        label="Email Content"
        name="content"
        placeholder="Enter your email message..."
        register={register('content')}
        error={errors.content?.message}
        required
        rows={8}
        helpText="Write a professional and engaging message"
      />

      {/* General Error Display */}
      {Object.keys(errors).length > 0 && !isValid && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please fix the errors above before submitting
          </AlertDescription>
        </Alert>
      )}

      {/* Form Actions */}
      <div className="flex items-center justify-end space-x-2 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting || !isValid}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
        >
          {isSubmitting ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Sending...</span>
            </div>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Email
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
