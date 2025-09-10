import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAIService, EmailAnalysisRequest } from '@/lib/ai-service';
import { emailRateLimiter, validateEmailAddress, sanitizeEmailContent } from '@/lib/aurinko';

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
    const { subject, email_body, recipient } = body;

    // Validate required fields
    if (!subject || !email_body) {
      return NextResponse.json(
        { error: 'Missing required fields: subject and email_body' },
        { status: 400 }
      );
    }

    // Validate input lengths
    if (subject.length > 998) {
      return NextResponse.json(
        { error: 'Subject line too long (max 998 characters)' },
        { status: 400 }
      );
    }

    if (email_body.length > 100000) {
      return NextResponse.json(
        { error: 'Email body too long (max 100KB)' },
        { status: 400 }
      );
    }

    // Validate recipient email if provided
    if (recipient && !validateEmailAddress(recipient)) {
      return NextResponse.json(
        { error: 'Invalid recipient email address' },
        { status: 400 }
      );
    }

    // Sanitize content
    const sanitizedSubject = sanitizeEmailContent(subject);
    const sanitizedBody = sanitizeEmailContent(email_body);

    // Prepare analysis request
    const analysisRequest: EmailAnalysisRequest = {
      subject: sanitizedSubject,
      body: sanitizedBody,
      recipient
    };

    let analysisResult;

    try {
      // Try to use AI service for analysis
      const aiService = getAIService();
      analysisResult = await aiService.analyzeEmail(analysisRequest);
    } catch (aiError) {
      console.warn('AI analysis failed, using fallback analysis:', aiError);
      
      // Fallback analysis
      analysisResult = performFallbackAnalysis(analysisRequest);
    }

    // Log analysis for improvement
    try {
      await supabase
        .from('email_logs')
        .insert([{
          campaign_id: null,
          email_id: null,
          message_id: `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          subject: sanitizedSubject,
          recipient: recipient || 'analysis@example.com',
          status: 'analyzed',
          metadata: {
            analysis_result: analysisResult,
            analyzed_at: new Date().toISOString(),
            user_id: user.id
          }
        }]);
    } catch (logError) {
      console.warn('Failed to log email analysis:', logError);
    }

    return NextResponse.json({
      success: true,
      data: analysisResult
    });

  } catch (error) {
    console.error('Error in POST /api/emails/analyze:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function performFallbackAnalysis(request: EmailAnalysisRequest) {
  const { subject, body } = request;
  
  // Basic spam detection
  const spamWords = [
    'free', 'urgent', 'limited time', 'act now', 'click here', 'buy now',
    'guaranteed', 'no obligation', 'risk free', 'winner', 'congratulations',
    'cash', 'money', 'earn', 'income', 'investment', 'loan'
  ];
  
  const subjectLower = subject.toLowerCase();
  const bodyLower = body.toLowerCase();
  const content = `${subjectLower} ${bodyLower}`;
  
  let spamScore = 0;
  let deliverabilityScore = 100;
  let engagementScore = 70;
  
  const suggestions = [];
  const issues = [];
  
  // Check for spam indicators
  spamWords.forEach(word => {
    if (content.includes(word)) {
      spamScore += 10;
      deliverabilityScore -= 5;
    }
  });
  
  // Check for excessive capitalization
  const capsRatio = (subject.match(/[A-Z]/g) || []).length / subject.length;
  if (capsRatio > 0.3) {
    spamScore += 15;
    deliverabilityScore -= 10;
    issues.push({
      type: 'spam_risk',
      severity: 'medium',
      message: 'Excessive capitalization in subject line',
      suggestion: 'Use normal capitalization to avoid spam filters'
    });
  }
  
  // Check for excessive exclamation marks
  const exclamationCount = (content.match(/!/g) || []).length;
  if (exclamationCount > 3) {
    spamScore += 10;
    deliverabilityScore -= 5;
    issues.push({
      type: 'spam_risk',
      severity: 'low',
      message: 'Too many exclamation marks',
      suggestion: 'Limit exclamation marks to maintain professionalism'
    });
  }
  
  // Check subject line length
  if (subject.length > 50) {
    engagementScore -= 10;
    suggestions.push('Consider shortening the subject line for better mobile display');
  }
  
  if (subject.length < 10) {
    engagementScore -= 15;
    suggestions.push('Subject line might be too short to be engaging');
  }
  
  // Check body length
  if (body.length < 50) {
    engagementScore -= 20;
    suggestions.push('Email body seems too short for meaningful engagement');
  }
  
  if (body.length > 2000) {
    engagementScore -= 10;
    suggestions.push('Consider making the email more concise');
  }
  
  // Check for personalization
  if (!body.includes('{{') && !body.toLowerCase().includes('dear') && !body.toLowerCase().includes('hi ')) {
    engagementScore -= 15;
    suggestions.push('Add personalization to improve engagement');
  }
  
  // Check for call to action
  const ctaWords = ['click', 'visit', 'download', 'register', 'sign up', 'learn more', 'contact'];
  const hasCTA = ctaWords.some(word => bodyLower.includes(word));
  if (!hasCTA) {
    engagementScore -= 10;
    suggestions.push('Consider adding a clear call to action');
  }
  
  // Normalize scores
  spamScore = Math.min(100, Math.max(0, spamScore));
  deliverabilityScore = Math.min(100, Math.max(0, deliverabilityScore));
  engagementScore = Math.min(100, Math.max(0, engagementScore));
  
  return {
    spamScore,
    deliverabilityScore,
    engagementScore,
    suggestions,
    issues
  };
}