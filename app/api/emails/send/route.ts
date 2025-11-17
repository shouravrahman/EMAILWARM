import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAurinkoClient } from '@/lib/aurinko';
import { validateRequestBody, withErrorHandling, createErrorResponse } from '@/lib/validate-request';
import { emailSendSchema, type EmailSendInput } from '@/lib/validation-schemas';
import { validateEmail } from '@/lib/email-validation';
import { sanitizeEmailSubject, sanitizeEmailContent } from '@/lib/sanitize';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createClient();
  
  // Validate request body
  const result = await validateRequestBody(request, emailSendSchema);
  
  if ('error' in result) {
    return result.error;
  }

  const validatedData = result.data as EmailSendInput;

  // Additional email validation
  const emailValidation = await validateEmail(validatedData.recipient);
  if (!emailValidation.valid) {
    return createErrorResponse(
      emailValidation.reason || 'Invalid recipient email address',
      'VALIDATION_ERROR',
      undefined,
      400
    );
  }

  // Sanitize content
  const sanitizedSubject = sanitizeEmailSubject(validatedData.subject);
  const sanitizedContent = sanitizeEmailContent(validatedData.content);

  // Get email account details
  const { data: emailAccount, error: emailError } = await supabase
    .from('connected_emails')
    .select('*')
    .eq('id', validatedData.email_id)
    .single();

  if (emailError || !emailAccount) {
    return createErrorResponse(
      'Email account not found',
      'RESOURCE_NOT_FOUND',
      undefined,
      404
    );
  }

  // Get Aurinko client with valid tokens
  const aurinkoClient = await getAurinkoClient(validatedData.email_id);

  // Prepare email message with sanitized content
  const emailMessage = {
    subject: sanitizedSubject,
    body: sanitizedContent,
    to: [{ address: validatedData.recipient }],
    tracking: {
      opens: true,
      threadReplies: true,
      context: `campaign_${validatedData.campaign_id}`
    }
  };

  // Send email via Aurinko API
  const sendResponse = await aurinkoClient.sendMessage(emailMessage);

  if (!sendResponse.id) {
    return createErrorResponse(
      'Failed to send email via Aurinko',
      'EMAIL_SEND_FAILED',
      undefined,
      500
    );
  }

  // Log the email send
  const { error: logError } = await supabase
    .from('email_logs')
    .insert([{
      campaign_id: validatedData.campaign_id,
      email_id: validatedData.email_id,
      message_id: sendResponse.id,
      subject: sanitizedSubject,
      recipient: validatedData.recipient,
      status: 'sent',
      sent_at: new Date().toISOString()
    }]);

  if (logError) {
    console.error('Error logging email:', logError);
  }

  return NextResponse.json({
    success: true,
    message_id: sendResponse.id,
    message: 'Email sent successfully'
  });
});