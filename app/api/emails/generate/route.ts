import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAIService, ADVANCED_EMAIL_TEMPLATES, EmailGenerationRequest } from '@/lib/ai-service';
import { emailRateLimiter } from '@/lib/aurinko';
import { validateRequestBody, withErrorHandling, createErrorResponse } from '@/lib/validate-request';
import { emailGenerateSchema } from '@/lib/validation-schemas';
import { sanitizeTextField, sanitizeEmailContent, sanitizeEmailSubject } from '@/lib/sanitize';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createClient();
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return createErrorResponse('Unauthorized', 'AUTHENTICATION_REQUIRED', undefined, 401);
  }

  // Rate limiting
  if (!emailRateLimiter.isAllowed(user.id)) {
    return createErrorResponse(
      'Rate limit exceeded',
      'RATE_LIMIT_EXCEEDED',
      { remainingRequests: emailRateLimiter.getRemainingRequests(user.id) },
      429
    );
  }

  // Validate request body
  const result = await validateRequestBody(request, emailGenerateSchema);
  
  if ('error' in result) {
    return result.error;
  }

  // Sanitize prompt
  const sanitizedPrompt = sanitizeTextField(result.data.prompt);

  // Prepare AI request using validated data
  const aiRequest: EmailGenerationRequest = {
    type: 'introduction', // Default type based on prompt
    context: {
      senderName: user.user_metadata?.name || user.email?.split('@')[0] || 'Professional',
      senderCompany: '',
      senderTitle: '',
      recipientName: '',
      recipientCompany: '',
      industry: 'business',
      previousConversation: sanitizedPrompt,
      campaignGoal: sanitizedPrompt,
      tone: result.data.tone || 'professional'
    },
    constraints: {
      maxLength: result.data.length === 'short' ? 100 : result.data.length === 'long' ? 300 : 200,
      includeSignature: true,
      includeCallToAction: true,
      avoidWords: []
    }
  };

  let emailContent;

  try {
    // Try to use AI service first
    const aiService = getAIService();
    emailContent = await aiService.generateEmail(aiRequest);
  } catch (aiError) {
    console.warn('AI service failed, using fallback templates:', aiError);
    
    // Fallback to templates
    const templates = ADVANCED_EMAIL_TEMPLATES['introduction'];
    if (!templates) {
      return createErrorResponse(
        'Email generation failed',
        'INTERNAL_ERROR',
        undefined,
        500
      );
    }

    // Simple template replacement
    const template = templates[Math.floor(Math.random() * templates.length)];
    const subject = template.subject;
    let body = template.body;

    // Replace placeholders
    const replacements = {
      '{{senderName}}': aiRequest.context.senderName,
      '{{senderTitle}}': aiRequest.context.senderTitle || '',
      '{{senderCompany}}': aiRequest.context.senderCompany || '',
      '{{recipientName}}': aiRequest.context.recipientName || 'there',
      '{{recipientCompany}}': aiRequest.context.recipientCompany || '',
      '{{industry}}': aiRequest.context.industry || 'your field'
    };

    Object.entries(replacements).forEach(([placeholder, value]) => {
      body = body.replace(new RegExp(placeholder, 'g'), value);
    });

    emailContent = {
      subject,
      body: body.trim(),
      tone: aiRequest.context.tone || 'professional',
      confidence: 0.8
    };
  }

  // Log generation for analytics
  try {
    await supabase
      .from('email_logs')
      .insert([{
        campaign_id: null,
        email_id: null,
        message_id: `generated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        subject: emailContent.subject,
        recipient: 'generated@example.com',
        status: 'generated',
        metadata: {
          type: 'introduction',
          ai_generated: true,
          confidence: emailContent.confidence,
          context: aiRequest.context
        }
      }]);
  } catch (logError) {
    console.warn('Failed to log email generation:', logError);
  }

  // Sanitize generated content before returning
  const sanitizedSubject = sanitizeEmailSubject(emailContent.subject);
  const sanitizedBody = sanitizeEmailContent(emailContent.body);

  return NextResponse.json({
    success: true,
    data: {
      subject: sanitizedSubject,
      body: sanitizedBody,
      tone: emailContent.tone,
      confidence: emailContent.confidence,
      suggestions: emailContent.suggestions || []
    }
  });
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get AI service status
    const aiService = getAIService();
    const status = await aiService.getStatus();

    return NextResponse.json({
      success: true,
      data: {
        aiAvailable: status.available,
        supportedTypes: ['introduction', 'follow_up', 'reply', 'thank_you', 'networking'],
        supportedTones: ['professional', 'casual', 'friendly', 'formal'],
        maxLength: 500,
        fallbackAvailable: true
      }
    });

  } catch (error) {
    console.error('Error in GET /api/emails/generate:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}