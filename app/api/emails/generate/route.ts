import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAIService, fallbackTemplates, EmailGenerationRequest } from '@/lib/ai-service';
import { emailRateLimiter } from '@/lib/aurinko';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    if (!emailRateLimiter.isAllowed(user.id)) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          remainingRequests: emailRateLimiter.getRemainingRequests(user.id)
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email_type, context, recipient_info, constraints } = body;

    // Validate required fields
    if (!email_type || !context) {
      return NextResponse.json(
        { error: 'Missing required fields: email_type and context' },
        { status: 400 }
      );
    }

    // Validate email type
    const validTypes = ['introduction', 'follow_up', 'reply', 'thank_you', 'networking'];
    if (!validTypes.includes(email_type)) {
      return NextResponse.json(
        { error: 'Invalid email type' },
        { status: 400 }
      );
    }

    // Prepare AI request
    const aiRequest: EmailGenerationRequest = {
      type: email_type,
      context: {
        senderName: context.sender_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Professional',
        senderCompany: context.sender_company,
        senderTitle: context.sender_title,
        recipientName: recipient_info?.name || context.recipient_name,
        recipientCompany: recipient_info?.company || context.recipient_company,
        industry: context.industry || 'business',
        previousConversation: context.previous_conversation,
        campaignGoal: context.campaign_goal,
        tone: context.tone || 'professional'
      },
      constraints: {
        maxLength: constraints?.max_length || 200,
        includeSignature: constraints?.include_signature !== false,
        includeCallToAction: constraints?.include_cta !== false,
        avoidWords: constraints?.avoid_words || []
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
      const template = fallbackTemplates[email_type as keyof typeof fallbackTemplates];
      if (!template) {
        return NextResponse.json(
          { error: 'Email type not supported' },
          { status: 400 }
        );
      }

      // Simple template replacement
      const subject = template.subjects[Math.floor(Math.random() * template.subjects.length)];
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
          campaign_id: context.campaign_id || null,
          email_id: context.email_id || null,
          message_id: `generated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          subject: emailContent.subject,
          recipient: recipient_info?.email || 'generated@example.com',
          status: 'generated',
          metadata: {
            type: email_type,
            ai_generated: true,
            confidence: emailContent.confidence,
            context: aiRequest.context
          }
        }]);
    } catch (logError) {
      console.warn('Failed to log email generation:', logError);
      // Don't fail the request for logging issues
    }

    return NextResponse.json({
      success: true,
      data: {
        subject: emailContent.subject,
        body: emailContent.body,
        tone: emailContent.tone,
        confidence: emailContent.confidence,
        suggestions: emailContent.suggestions || []
      }
    });

  } catch (error) {
    console.error('Error in POST /api/emails/generate:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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