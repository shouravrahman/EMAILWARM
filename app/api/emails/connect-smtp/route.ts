import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { validateRequestBody, withErrorHandling, createErrorResponse } from '@/lib/validate-request';
import { smtpConnectionSchema, type SMTPConnectionInput } from '@/lib/validation-schemas';
import { validateEmail } from '@/lib/email-validation';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY is not set in environment variables');
}

function encrypt(text: string): string {
  try {
    if (ENCRYPTION_KEY.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be 32 characters long');
    }
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

export const POST = withErrorHandling(async (request: NextRequest) => {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return createErrorResponse('Unauthorized', 'AUTHENTICATION_REQUIRED', undefined, 401);
  }

  // Validate request body
  const result = await validateRequestBody(request, smtpConnectionSchema);
  
  if ('error' in result) {
    return result.error;
  }

  const validatedData = result.data as SMTPConnectionInput;

  // Validate email address
  const emailValidation = await validateEmail(validatedData.email);
  if (!emailValidation.valid) {
    return createErrorResponse(
      emailValidation.reason || 'Invalid email address',
      'VALIDATION_ERROR',
      undefined,
      400
    );
  }

  // Verify SMTP credentials
  const transporter = nodemailer.createTransport({
    host: validatedData.host,
    port: validatedData.port,
    secure: validatedData.secure,
    auth: {
      user: validatedData.username,
      pass: validatedData.password,
    },
  });

  try {
    await transporter.verify();
  } catch (error: any) {
    if (error.code === 'EAUTH') {
      return createErrorResponse('Invalid SMTP credentials', 'VALIDATION_ERROR', undefined, 401);
    }
    if (error.code === 'ECONNECTION') {
      return createErrorResponse('Could not connect to SMTP server', 'VALIDATION_ERROR', undefined, 502);
    }
    throw error;
  }

  // Check if email is already connected
  const { data: existingEmail } = await supabase
    .from('connected_emails')
    .select('id')
    .eq('email_address', validatedData.email)
    .eq('user_id', user.id)
    .single();

  if (existingEmail) {
    return createErrorResponse('Email already connected', 'VALIDATION_ERROR', undefined, 409);
  }

  // Encrypt credentials
  const encryptedCredentials = {
    password: encrypt(validatedData.password),
    smtp_host: validatedData.host,
    smtp_port: validatedData.port,
  };

  // Store email account in database
  const { error: insertError } = await supabase
    .from('connected_emails')
    .insert([{
      user_id: user.id,
      email_address: validatedData.email,
      provider: 'smtp',
      oauth_tokens: { smtp: encryptedCredentials },
      status: 'active'
    }]);

  if (insertError) {
    console.error('Error storing SMTP email account:', insertError);
    throw new Error('Failed to store email account');
  }

  return NextResponse.json({ success: true, message: 'SMTP account connected successfully' });
});
