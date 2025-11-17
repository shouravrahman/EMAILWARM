import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/utils/supabase/server";
import { getAurinkoClient } from '@/lib/aurinko';

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { searchParams } = new URL(request.url);
    const email_id = searchParams.get('email_id');

    if (!email_id) {
      return NextResponse.json(
        { error: 'Email ID required' },
        { status: 400 }
      );
    }

    // Verify user has access to this email account
    const supabase = await createClient();
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser();
	if (userError || !user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

    const { data: emailAccount, error: emailError } = await supabase
      .from('connected_emails')
      .select('*')
      .eq('id', email_id)
      .eq('user_id', user.id)
      .single();

    if (emailError || !emailAccount) {
      return NextResponse.json(
        { error: 'Email account not found' },
        { status: 404 }
      );
    }

    // Get Aurinko client
    const aurinkoClient = await getAurinkoClient(email_id);

    // Fetch tracking data
    const trackingData = await aurinkoClient.getTrackingData(params.id);

    // Also get local tracking data from our database
    const { data: localTracking, error: localError } = await supabase
      .from('email_logs')
      .select('*')
      .eq('message_id', params.id)
      .single();

    return NextResponse.json({
      success: true,
      tracking: {
        aurinko: trackingData,
        local: localTracking || null
      }
    });

  } catch (error) {
    console.error('Error in GET /api/emails/tracking/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
