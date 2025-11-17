import { NextRequest, NextResponse } from 'next/server';
import { CampaignScheduler } from '@/lib/campaign-scheduler';

/**
 * Cron endpoint to process active campaigns
 * This endpoint is called by Vercel Cron every 4 hours
 * 
 * Schedule: Runs every 4 hours (e.g., 00:00, 04:00, 08:00, etc.)
 * 
 * Authentication: Uses Vercel Cron Secret for security
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('Unauthorized cron request');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Starting campaign scheduler...');
    const startTime = Date.now();

    // Process all active campaigns
    const result = await CampaignScheduler.processActiveCampaigns();

    const duration = Date.now() - startTime;
    console.log(`Campaign scheduler completed in ${duration}ms`);

    // Return detailed results
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      summary: {
        totalCampaigns: result.totalCampaigns,
        processed: result.processed,
        skipped: result.skipped,
        totalEmailsQueued: result.totalEmailsQueued,
        errors: result.errors.length,
      },
      results: result.results,
      errors: result.errors,
    });
  } catch (error: any) {
    console.error('Error in cron job:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint for manual triggering (for testing)
 * Requires authentication
 */
export async function POST(request: NextRequest) {
  try {
    // For manual triggers, we could add authentication here
    // For now, we'll allow it for testing purposes
    console.log('Manual campaign scheduler trigger');

    const result = await CampaignScheduler.processActiveCampaigns();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalCampaigns: result.totalCampaigns,
        processed: result.processed,
        skipped: result.skipped,
        totalEmailsQueued: result.totalEmailsQueued,
        errors: result.errors.length,
      },
      results: result.results,
      errors: result.errors,
    });
  } catch (error: any) {
    console.error('Error in manual trigger:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
