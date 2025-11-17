import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const supabase = await createClient();
    try {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		// Get email log with campaign verification
		const { data: emailLog, error } = await supabase
			.from("email_logs")
			.select(
				`
        *,
        warmup_campaigns!inner (
          id,
          name,
          user_id
        )
      `
			)
			.eq("id", params.id)
			.eq("warmup_campaigns.user_id", user.id)
			.single();

		if (error || !emailLog) {
			return NextResponse.json(
				{ error: "Email log not found" },
				{ status: 404 }
			);
		}

		return NextResponse.json({
			success: true,
			data: emailLog,
		});
	} catch (error) {
		console.error("Error in GET /api/emails/logs/[id]:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	} finally {
	}
}

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const supabase = await createClient();
    try {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		const body = await request.json();
		const {
			status,
			open_count,
			reply_count,
			opened_at,
			replied_at,
			bounced_at,
			metadata,
		} = body;

		// Verify user owns this email log
		const { data: emailLog, error: verifyError } = await supabase
			.from("email_logs")
			.select(
				`
        id,
        warmup_campaigns!inner (
          user_id
        )
      `
			)
			.eq("id", params.id)
			.eq("warmup_campaigns.user_id", user.id)
			.single();

		if (verifyError || !emailLog) {
			return NextResponse.json(
				{ error: "Email log not found or unauthorized" },
				{ status: 404 }
			);
		}

		// Prepare update data
		const updateData: any = {};
		if (status !== undefined) updateData.status = status;
		if (open_count !== undefined) updateData.open_count = open_count;
		if (reply_count !== undefined) updateData.reply_count = reply_count;
		if (opened_at !== undefined) updateData.opened_at = opened_at;
		if (replied_at !== undefined) updateData.replied_at = replied_at;
		if (bounced_at !== undefined) updateData.bounced_at = bounced_at;
		if (metadata !== undefined) updateData.metadata = metadata;

		// Update email log
		const { data, error } = await supabase
			.from("email_logs")
			.update(updateData)
			.eq("id", params.id)
			.select()
			.single();

		if (error) {
			return NextResponse.json(
				{ error: "Failed to update email log" },
				{ status: 500 }
			);
		}

		return NextResponse.json({
			success: true,
			data,
		});
	} catch (error) {
		console.error("Error in PUT /api/emails/logs/[id]:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	} finally {
	}
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const supabase = await createClient();
    try {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		// Verify user owns this email log
		const { data: emailLog, error: verifyError } = await supabase
			.from("email_logs")
			.select(
				`
        id,
        warmup_campaigns!inner (
          user_id
        )
      `
			)
			.eq("id", params.id)
			.eq("warmup_campaigns.user_id", user.id)
			.single();

		if (verifyError || !emailLog) {
			return NextResponse.json(
				{ error: "Email log not found or unauthorized" },
				{ status: 404 }
			);
		}

		// Delete email log
		const { error } = await supabase
			.from("email_logs")
			.delete()
			.eq("id", params.id);

		if (error) {
			return NextResponse.json(
				{ error: "Failed to delete email log" },
				{ status: 500 }
			);
		}

		return NextResponse.json({
			success: true,
			message: "Email log deleted successfully",
		});
	} catch (error) {
		console.error("Error in DELETE /api/emails/logs/[id]:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	} finally {
	}
}
