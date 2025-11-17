import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { AurinkoClient } from '@/lib/aurinko';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';

function encrypt(text: string): string {
  try {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/emails?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/emails?error=missing_parameters', request.url)
      );
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.redirect(
        new URL('/auth/login?error=authentication_required', request.url)
      );
    }

    // Verify state parameter for CSRF protection
    if (state !== user.id) {
      console.error('Invalid state parameter:', { expected: user.id, received: state });
      return NextResponse.redirect(
        new URL('/emails?error=invalid_state', request.url)
      );
    }

    // Validate environment variables
    const clientId = process.env.AURINKO_CLIENT_ID;
    const clientSecret = process.env.AURINKO_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/oauth`;

    if (!clientId || !clientSecret) {
      console.error('Missing Aurinko configuration');
      return NextResponse.redirect(
        new URL('/emails?error=configuration_error', request.url)
      );
    }

    // Exchange code for tokens with retry logic
    let tokenData;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        tokenData = await AurinkoClient.exchangeCodeForTokens(
          code,
          clientId,
          clientSecret,
          redirectUri
        );
        break;
      } catch (tokenError) {
        retryCount++;
        if (retryCount >= maxRetries) {
          console.error('Token exchange failed after retries:', tokenError);
          return NextResponse.redirect(
            new URL('/emails?error=token_exchange_failed', request.url)
          );
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }

    if (!tokenData) {
      return NextResponse.redirect(
        new URL('/emails?error=token_exchange_failed', request.url)
      );
    }

    // Get account info to determine email address and provider
    let accountInfo;
    try {
      const aurinkoClient = new AurinkoClient(tokenData.access_token);
      accountInfo = await aurinkoClient.getAccountInfo();
    } catch (accountError) {
      console.error('Failed to get account info:', accountError);
      return NextResponse.redirect(
        new URL('/emails?error=account_info_failed', request.url)
      );
    }

    // Validate account info
    if (!accountInfo.email || !accountInfo.provider) {
      console.error('Invalid account info:', accountInfo);
      return NextResponse.redirect(
        new URL('/emails?error=invalid_account_info', request.url)
      );
    }

    // Check if email is already connected
    const { data: existingEmail } = await supabase
      .from('connected_emails')
      .select('id')
      .eq('email_address', accountInfo.email)
      .eq('user_id', user.id)
      .single();

    if (existingEmail) {
      return NextResponse.redirect(
        new URL('/emails?error=email_already_connected', request.url)
      );
    }

    // Encrypt tokens before storing
    const encryptedTokens = {
      access_token: encrypt(tokenData.access_token),
      refresh_token: encrypt(tokenData.refresh_token),
      expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
      token_type: tokenData.token_type,
      scope: tokenData.scope,
    };

    // Store email account in database with transaction
    const { data: insertedEmail, error: insertError } = await supabase
      .from('connected_emails')
      .insert([{
        user_id: user.id,
        email_address: accountInfo.email,
        provider: accountInfo.provider.toLowerCase(),
        oauth_tokens: encryptedTokens,
        status: 'active'
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Error storing email account:', insertError);
      return NextResponse.redirect(
        new URL('/emails?error=storage_failed', request.url)
      );
    }

    // Initialize email sync in background
    try {
      const aurinkoClient = new AurinkoClient(tokenData.access_token);
      await aurinkoClient.startSync(30, false);
    } catch (syncError) {
      console.warn('Initial sync failed, will retry later:', syncError);
      // Don't fail the entire flow for sync issues
    }

    // Log successful connection
    console.log('Email account connected successfully:', {
      userId: user.id,
      email: accountInfo.email,
      provider: accountInfo.provider,
      emailId: insertedEmail.id
    });

    return NextResponse.redirect(
      new URL('/emails?success=connected', request.url)
    );

  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/emails?error=oauth_failed', request.url)
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { provider, scopes: customScopes } = await request.json();
    
    // Validate provider
    const supportedProviders = ['gmail', 'outlook', 'yahoo'];
    if (!provider || !supportedProviders.includes(provider.toLowerCase())) {
      return NextResponse.json(
        { error: 'Invalid or unsupported provider' },
        { status: 400 }
      );
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate environment variables
    const clientId = process.env.AURINKO_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/oauth`;
    
    let scopes: string[];
    if (customScopes && Array.isArray(customScopes)) {
      scopes = customScopes;
    } else {
      switch (provider.toLowerCase()) {
        case 'gmail':
          scopes = ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.modify'];
          break;
        case 'outlook':
          scopes = ['Mail.Read', 'Mail.Send', 'Mail.ReadWrite'];
          break;
        default:
          scopes = ['Mail.Read', 'Mail.Send', 'Mail.ReadWrite'];
          break;
      }
    }
    
    // Generate auth URL with state for CSRF protection
    const authUrl = AurinkoClient.getAuthUrl(
      clientId,
      redirectUri,
      scopes,
      user.id // Use user ID as state for CSRF protection
    );

    return NextResponse.json({ authUrl });

  } catch (error) {
    console.error('Error generating OAuth URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate OAuth URL' },
      { status: 500 }
    );
  }
}