import { NextRequest, NextResponse } from 'next/server';
import { EmailQueue } from '@/lib/email-queue';

/**
 * Process email queue
 * This endpoint processes pending emails in the queue
 * Can be called manually or via cron job
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Verify authorization (cron secret or admin auth)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // If cron secret is configured, verify it
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get batch size from query params (default: 50)
    const { searchParams } = new URL(request.url);
    const batchSize = parseInt(searchParams.get('batchSize') || '50', 10);

    // Process batch
    const result = await EmailQueue.processBatch(batchSize);

    // Get updated stats
    const stats = await EmailQueue.getStats();

    return NextResponse.json({
      success: true,
      result,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error processing email queue:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process email queue',
      },
      { status: 500 }
    );
  }
}

/**
 * Get queue stats
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Verify authorization
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const stats = await EmailQueue.getStats();

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching queue stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch queue stats',
      },
      { status: 500 }
    );
  }
}
