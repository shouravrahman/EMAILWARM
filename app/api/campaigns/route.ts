import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { validateRequestBody, withErrorHandling, createErrorResponse } from '@/lib/validate-request';
import { campaignSchema } from '@/lib/validation-schemas';
import { sanitizeTextField } from '@/lib/sanitize';

export const POST = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return createErrorResponse('Unauthorized', 'AUTHENTICATION_REQUIRED', undefined, 401);
  }

  // Validate request body
  const result = await validateRequestBody(request, campaignSchema);
  
  if ('error' in result) {
    return result.error;
  }

  // Sanitize text fields
  const sanitizedName = sanitizeTextField(result.data.name);
  const campaignData = result.data as any;

  // Check user subscription limits
  const { data: limits } = await supabase
    .rpc('check_user_limits', { p_user_id: user.id });
  
  if (!limits?.[0]?.can_create_campaign) {
    return createErrorResponse(
      'Campaign limit reached. Please upgrade your plan.',
      'INSUFFICIENT_QUOTA',
      undefined,
      403
    );
  }

  // If outreach campaign, verify prospect list exists and belongs to user
  if (campaignData.campaignType === 'outreach' && campaignData.prospectListId) {
    const { data: prospectList, error: listError } = await supabase
      .from('prospect_lists')
      .select('id, total_prospects')
      .eq('id', campaignData.prospectListId)
      .eq('user_id', user.id)
      .single();

    if (listError || !prospectList) {
      return createErrorResponse(
        'Prospect list not found or access denied',
        'RESOURCE_NOT_FOUND',
        undefined,
        404
      );
    }

    if (prospectList.total_prospects === 0) {
      return createErrorResponse(
        'Cannot create campaign with empty prospect list',
        'VALIDATION_ERROR',
        undefined,
        400
      );
    }
  }

  // Create campaign with validated data
  const { data, error } = await supabase
    .from('warmup_campaigns')
    .insert([{
      user_id: user.id,
      name: sanitizedName,
      email_id: campaignData.emailId,
      daily_volume: campaignData.dailyVolume,
      settings: {},
      status: campaignData.status || 'draft',
      campaign_type: campaignData.campaignType || 'warmup',
      prospect_list_id: campaignData.prospectListId || null,
      outreach_mode: campaignData.outreachMode || null,
      personalization_template: campaignData.personalizationTemplate || null,
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating campaign:', error);
    throw new Error('Failed to create campaign');
  }

  return NextResponse.json({ data }, { status: 201 });
});

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const campaignType = searchParams.get('type'); // 'warmup' or 'outreach'

    let query = supabase
      .from('warmup_campaigns')
      .select(`
        *,
        connected_emails (
          email_address,
          provider,
          status
        ),
        prospect_lists (
          id,
          name,
          total_prospects,
          active_prospects
        )
      `)
      .eq('user_id', user.id);

    // Filter by campaign type if specified
    if (campaignType === 'warmup' || campaignType === 'outreach') {
      query = query.eq('campaign_type', campaignType);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching campaigns:', error);
      return NextResponse.json(
        { error: 'Failed to fetch campaigns' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error in GET /api/campaigns:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}