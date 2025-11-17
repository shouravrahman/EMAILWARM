import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/utils/supabase/server";
import { getAurinkoClient } from '@/lib/aurinko';

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
		const { searchParams } = new URL(request.url);
		const email_id = searchParams.get("email_id");

		if (!email_id) {
			return NextResponse.json(
				{ error: "Email ID required" },
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
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		// Check if user has access to the email account

		const { data: emailAccount, error: emailError } = await supabase
			.from("connected_emails")
			.select("*")
			.eq("id", email_id)
			.eq("user_id", user.id)
			.single();

		if (emailError || !emailAccount) {
			return NextResponse.json(
				{ error: "Email account not found" },
				{ status: 404 }
			);
		}

		// Get Aurinko client
		const aurinkoClient = await getAurinkoClient(email_id);

		// Fetch specific message
		const message = await aurinkoClient.getMessage(params.id);

		return NextResponse.json({
			success: true,
			message,
		});
  } catch (error) {
    console.error('Error in GET /api/emails/messages/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const { email_id, unread, flagged } = await request.json();

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

    // Update message status
    const result = await aurinkoClient.updateMessageStatus(
      params.id,
      unread,
      flagged
    );

    return NextResponse.json({
      success: true,
      message: 'Message status updated',
      result
    });

  } catch (error) {
    console.error('Error in PUT /api/emails/messages/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
