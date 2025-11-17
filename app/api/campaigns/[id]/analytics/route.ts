import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
	try {
		const supabase = await createClient();
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		// Verify user owns this campaign
		const { data: campaign, error: campaignError } = await supabase
			.from("warmup_campaigns")
			.select("*")
			.eq("id", (await context.params).id)
			.eq("user_id", user.id)
			.single();

		if (campaignError || !campaign) {
			return NextResponse.json(
				{ error: "Campaign not found" },
				{ status: 404 }
			);
		}

		// Get email logs for analytics
		const { data: emailLogs, error: logsError } = await supabase
			.from("email_logs")
			.select("*, email_accounts(email_address)") // Select email_accounts to get recipient email
			.eq("campaign_id", (await context.params).id)
			.order("sent_at", { ascending: true });

		if (logsError) {
			return NextResponse.json(
				{ error: "Failed to fetch email logs" },
				{ status: 500 }
			);
		}

		const logs = emailLogs || [];

		// Calculate analytics
		const analytics = {
			overview: {
				totalSent: logs.length,
				totalOpened: logs.filter((log) => log.open_count > 0).length,
				totalReplied: logs.filter((log) => log.reply_count > 0).length,
				totalBounced: logs.filter((log) => log.status === "bounced")
					.length,
				openRate:
					logs.length > 0
						? Math.round(
								(logs.filter((log) => log.open_count > 0)
									.length /
									logs.length) *
									100
						  )
						: 0,
				replyRate:
					logs.length > 0
						? Math.round(
								(logs.filter((log) => log.reply_count > 0)
									.length /
									logs.length) *
									100
						  )
						: 0,
				bounceRate:
					logs.length > 0
						? Math.round(
								(logs.filter((log) => log.status === "bounced")
									.length /
									logs.length) *
									100
						  )
						: 0,
			},
			timeline: generateTimelineData(logs),
			statusBreakdown: generateStatusBreakdown(logs),
			engagementMetrics: generateEngagementMetrics(logs),
			recipientAnalysis: generateRecipientAnalysis(logs),
		};

		return NextResponse.json({
			success: true,
			data: analytics,
		});
	} catch (error) {
		console.error("Error in GET /api/campaigns/[id]/analytics:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

function generateTimelineData(logs: any[]) {
	const timelineMap = new Map();

	logs.forEach((log) => {
		const date = new Date(log.sent_at).toISOString().split("T")[0];
		if (!timelineMap.has(date)) {
			timelineMap.set(date, {
				date,
				sent: 0,
				opened: 0,
				replied: 0,
				bounced: 0,
			});
		}

		const dayData = timelineMap.get(date);
		dayData.sent += 1;
		if (log.open_count > 0) dayData.opened += 1;
		if (log.reply_count > 0) dayData.replied += 1;
		if (log.status === "bounced") dayData.bounced += 1;
	});

	return Array.from(timelineMap.values()).sort(
		(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
	);
}

function generateStatusBreakdown(logs: any[]) {
	const statusCounts = logs.reduce((acc, log) => {
		acc[log.status] = (acc[log.status] || 0) + 1;
		return acc;
	}, {});

	return Object.entries(statusCounts).map(([status, count]) => ({
		status,
		count,
		percentage:
			logs.length > 0
				? Math.round(((count as number) / logs.length) * 100)
				: 0,
	}));
}

function generateEngagementMetrics(logs: any[]) {
	const totalOpens = logs.reduce((sum, log) => sum + log.open_count, 0);
	const totalReplies = logs.reduce((sum, log) => sum + log.reply_count, 0);

	return {
		averageOpensPerEmail:
			logs.length > 0
				? Math.round((totalOpens / logs.length) * 100) / 100
				: 0,
		averageRepliesPerEmail:
			logs.length > 0
				? Math.round((totalReplies / logs.length) * 100) / 100
				: 0,
		engagementRate:
			logs.length > 0
				? Math.round(
						(logs.filter(
							(log) => log.open_count > 0 || log.reply_count > 0
						).length /
							logs.length) *
							100
				  )
				: 0,
		responseTime: calculateAverageResponseTime(logs),
	};
}

function generateRecipientAnalysis(logs: any[]) {
	const domainMap = new Map();

	logs.forEach((log) => {
		const domain = log.recipient.split("@")[1];
		if (!domainMap.has(domain)) {
			domainMap.set(domain, {
				domain,
				sent: 0,
				opened: 0,
				replied: 0,
				bounced: 0,
			});
		}

		const domainData = domainMap.get(domain);
		domainData.sent += 1;
		if (log.open_count > 0) domainData.opened += 1;
		if (log.reply_count > 0) domainData.replied += 1;
		if (log.status === "bounced") domainData.bounced += 1;
	});

	return Array.from(domainMap.values())
		.map((domain) => ({
			...domain,
			openRate:
				domain.sent > 0
					? Math.round((domain.opened / domain.sent) * 100)
					: 0,
			replyRate:
				domain.sent > 0
					? Math.round((domain.replied / domain.sent) * 100)
					: 0,
			bounceRate:
				domain.sent > 0
					? Math.round((domain.bounced / domain.sent) * 100)
					: 0,
		}))
		.sort((a, b) => b.sent - a.sent);
}

function calculateAverageResponseTime(logs: any[]) {
	const responseTimes = logs
		.filter((log) => log.replied_at && log.sent_at)
		.map((log) => {
			const sent = new Date(log.sent_at).getTime();
			const replied = new Date(log.replied_at).getTime();
			return replied - sent;
		});

	if (responseTimes.length === 0) return 0;

	const averageMs =
		responseTimes.reduce((sum, time) => sum + time, 0) /
		responseTimes.length;
	return Math.round(averageMs / (1000 * 60 * 60 * 24)); // Convert to days
}
