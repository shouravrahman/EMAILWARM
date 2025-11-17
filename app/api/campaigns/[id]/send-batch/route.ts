import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { EmailService } from '@/lib/email-service';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const campaignId = params.id;

    // Fetch campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('warmup_campaigns')
      .select(`
        *,
        connected_emails (
          id,
          email_address,
          provider
        ),
        prospect_lists (
          id,
          name
        )
      `)
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Verify it's an outreach campaign in manual mode
    if (campaign.campaign_type !== 'outreach' || campaign.outreach_mode !== 'manual') {
      return NextResponse.json(
        { error: 'This endpoint is only for manual outreach campaigns' },
        { status: 400 }
      );
    }

    // Get prospects that haven't been contacted yet
    const { data: prospects, error: prospectsError } = await supabase
      .from('prospects')
      .select('*')
      .eq('list_id', campaign.prospect_list_id)
      .eq('status', 'active')
      .limit(campaign.daily_volume);

    if (prospectsError) {
      throw prospectsError;
    }

    if (!prospects || prospects.length === 0) {
      return NextResponse.json(
        { error: 'No prospects available to contact', sent: 0 },
        { status: 200 }
      );
    }

    // Send emails to prospects
    const results = [];
    for (const prospect of prospects) {
      const result = await EmailService.sendOutreachEmail({
        campaignId: campaign.id,
        prospectId: prospect.id,
        emailAccountId: campaign.email_id,
        personalizationTemplate: campaign.personalization_template || '',
        senderInfo: {
          name: user.user_metadata?.full_name || 'Team',
          company: user.user_metadata?.company || '',
          title: user.user_metadata?.title || '',
        },
      });

      results.push({
        prospectId: prospect.id,
        email: prospect.email,
        success: result.success,
        messageId: result.messageId,
        error: result.error,
      });
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      message: `Batch sent successfully`,
      sent: successCount,
      failed: failureCount,
      results,
    });
  } catch (error) {
    console.error('Error sending batch:', error);
    return NextResponse.json(
      { error: 'Failed to send batch' },
      { status: 500 }
    );
  }
}
