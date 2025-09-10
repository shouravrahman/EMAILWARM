import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getAurinkoClient } from '@/lib/aurinko';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { email_id, force_restart } = await request.json();

    if (!email_id) {
      return NextResponse.json(
        { error: 'Email ID required' },
        { status: 400 }
      );
    }

    // Get Aurinko client
    const aurinkoClient = await getAurinkoClient(email_id);

    // Start or restart sync
    const syncResponse = await aurinkoClient.startSync(30, true);

    // Store sync tokens in email account record
    const { error: updateError } = await supabase
      .from('connected_emails')
      .update({
        oauth_tokens: {
          ...((await supabase.from('connected_emails').select('oauth_tokens').eq('id', email_id).single()).data?.oauth_tokens || {}),
          sync_updated_token: syncResponse.syncUpdatedToken,
          sync_deleted_token: syncResponse.syncDeletedToken,
          last_sync_at: new Date().toISOString()
        }
      })
      .eq('id', email_id);

    if (updateError) {
      console.error('Error updating sync tokens:', updateError);
      return NextResponse.json(
        { error: 'Failed to store sync tokens' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      ready: syncResponse.ready,
      message: 'Email sync initialized'
    });

  } catch (error) {
    console.error('Error in POST /api/emails/sync:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const email_id = searchParams.get('email_id');
    const sync_type = searchParams.get('type') || 'updated'; // 'updated' or 'deleted'

    if (!email_id) {
      return NextResponse.json(
        { error: 'Email ID required' },
        { status: 400 }
      );
    }

    // Get email account with sync tokens
    const { data: emailAccount, error: emailError } = await supabase
      .from('connected_emails')
      .select('oauth_tokens')
      .eq('id', email_id)
      .single();

    if (emailError || !emailAccount) {
      return NextResponse.json(
        { error: 'Email account not found' },
        { status: 404 }
      );
    }

    const tokens = emailAccount.oauth_tokens;
    const deltaToken = sync_type === 'updated' 
      ? tokens.sync_updated_token 
      : tokens.sync_deleted_token;

    if (!deltaToken) {
      return NextResponse.json(
        { error: 'Sync not initialized. Please start sync first.' },
        { status: 400 }
      );
    }

    // Get Aurinko client
    const aurinkoClient = await getAurinkoClient(email_id);

    // Fetch sync data
    const syncData = sync_type === 'updated'
      ? await aurinkoClient.getSyncUpdated(deltaToken)
      : await aurinkoClient.getSyncDeleted(deltaToken);

    // Update delta token if provided
    if (syncData.nextDeltaToken) {
      const tokenField = sync_type === 'updated' 
        ? 'sync_updated_token' 
        : 'sync_deleted_token';

      await supabase
        .from('connected_emails')
        .update({
          oauth_tokens: {
            ...tokens,
            [tokenField]: syncData.nextDeltaToken,
            last_sync_at: new Date().toISOString()
          }
        })
        .eq('id', email_id);
    }

    return NextResponse.json({
      success: true,
      data: syncData.records,
      nextPageToken: syncData.nextPageToken,
      hasMore: !!syncData.nextPageToken
    });

  } catch (error) {
    console.error('Error in GET /api/emails/sync:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}