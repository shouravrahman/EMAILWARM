import * as nodemailer from 'nodemailer';
import { supabase } from './supabase';
import * as CryptoJS from 'crypto-js';
import { UnsubscribeManager } from './unsubscribe';

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailSendRequest {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
  smtpConfig: SMTPConfig;
  campaignId: string;
  emailAccountId: string;
  prospectId?: string;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: {
    code: string;
    message: string;
    isTemporary: boolean;
  };
}

export class EmailSender {
  private static encryptionKey = process.env.SMTP_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || '';

  /**
   * Send email via SMTP with retry logic
   */
  static async sendEmail(request: EmailSendRequest): Promise<SendResult> {
    try {
      // Check suppression list first
      const isSuppressed = await UnsubscribeManager.isSuppressed(request.to);
      if (isSuppressed) {
        return {
          success: false,
          error: {
            code: 'SUPPRESSED',
            message: 'Recipient is on suppression list (unsubscribed)',
            isTemporary: false,
          },
        };
      }

      // Validate email request
      const validation = this.validateEmail(request);
      if (!validation.valid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.error || 'Invalid email request',
            isTemporary: false,
          },
        };
      }

      // Add unsubscribe link to HTML
      let htmlWithUnsubscribe = request.html;
      if (request.prospectId) {
        htmlWithUnsubscribe = UnsubscribeManager.addUnsubscribeLink(
          request.html,
          request.prospectId,
          request.campaignId,
          request.to
        );
      }

      // Create transporter
      const transporter = nodemailer.createTransport({
        host: request.smtpConfig.host,
        port: request.smtpConfig.port,
        secure: request.smtpConfig.secure,
        auth: {
          user: request.smtpConfig.auth.user,
          pass: request.smtpConfig.auth.pass,
        },
      });

      // Send email
      const info = await transporter.sendMail({
        from: request.from,
        to: request.to,
        subject: request.subject,
        text: request.text,
        html: htmlWithUnsubscribe,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error: any) {
      console.error('Error sending email:', error);

      // Determine if error is temporary
      const isTemporary = this.isTemporaryError(error);

      return {
        success: false,
        error: {
          code: error.code || 'SEND_ERROR',
          message: error.message || 'Failed to send email',
          isTemporary,
        },
      };
    }
  }

  /**
   * Get SMTP config from connected email account
   */
  static async getSMTPConfig(emailAccountId: string): Promise<SMTPConfig | null> {
    try {
      const { data: emailAccount, error } = await supabase
        .from('connected_emails')
        .select('email_address, provider, oauth_tokens')
        .eq('id', emailAccountId)
        .single();

      if (error || !emailAccount) {
        console.error('Error fetching email account:', error);
        return null;
      }

      // Decrypt SMTP credentials if encrypted
      let smtpConfig = emailAccount.oauth_tokens?.smtp;
      
      if (smtpConfig && smtpConfig.encrypted) {
        smtpConfig = this.decryptSMTPConfig(smtpConfig);
      }

      // If no SMTP config, try to infer from provider
      if (!smtpConfig) {
        smtpConfig = this.getDefaultSMTPConfig(emailAccount.provider, emailAccount.email_address);
      }

      return smtpConfig;
    } catch (error) {
      console.error('Error getting SMTP config:', error);
      return null;
    }
  }

  /**
   * Get default SMTP config based on provider
   */
  private static getDefaultSMTPConfig(provider: string, email: string): SMTPConfig | null {
    const configs: Record<string, Partial<SMTPConfig>> = {
      gmail: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
      },
      outlook: {
        host: 'smtp-mail.outlook.com',
        port: 587,
        secure: false,
      },
      office365: {
        host: 'smtp.office365.com',
        port: 587,
        secure: false,
      },
    };

    const config = configs[provider.toLowerCase()];
    if (!config) {
      return null;
    }

    return {
      ...config,
      auth: {
        user: email,
        pass: '', // Must be provided by user
      },
    } as SMTPConfig;
  }

  /**
   * Encrypt SMTP credentials
   */
  static encryptSMTPConfig(config: SMTPConfig): any {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(config),
      this.encryptionKey
    ).toString();

    return {
      encrypted: true,
      data: encrypted,
    };
  }

  /**
   * Decrypt SMTP credentials
   */
  static decryptSMTPConfig(encryptedConfig: any): SMTPConfig {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    const decrypted = CryptoJS.AES.decrypt(
      encryptedConfig.data,
      this.encryptionKey
    ).toString(CryptoJS.enc.Utf8);

    return JSON.parse(decrypted);
  }



  /**
   * Validate email before sending
   */
  static validateEmail(request: EmailSendRequest): { valid: boolean; error?: string } {
    if (!request.to || !this.isValidEmail(request.to)) {
      return { valid: false, error: 'Invalid recipient email' };
    }

    if (!request.from || !this.isValidEmail(request.from)) {
      return { valid: false, error: 'Invalid sender email' };
    }

    if (!request.subject || request.subject.trim().length === 0) {
      return { valid: false, error: 'Subject is required' };
    }

    if (!request.html && !request.text) {
      return { valid: false, error: 'Email body is required' };
    }

    if (!request.smtpConfig || !request.smtpConfig.host) {
      return { valid: false, error: 'SMTP configuration is required' };
    }

    return { valid: true };
  }

  /**
   * Check if email address is valid
   */
  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Determine if error is temporary (should retry)
   */
  private static isTemporaryError(error: any): boolean {
    const temporaryCodes = [
      'ETIMEDOUT',
      'ECONNRESET',
      'ECONNREFUSED',
      'ENOTFOUND',
      'ENETUNREACH',
      'EAI_AGAIN',
    ];

    const temporaryMessages = [
      'timeout',
      'network',
      'connection',
      'rate limit',
      'too many',
      'try again',
      'temporarily',
    ];

    // Check error code
    if (error.code && temporaryCodes.includes(error.code)) {
      return true;
    }

    // Check error message
    const message = (error.message || '').toLowerCase();
    return temporaryMessages.some(msg => message.includes(msg));
  }

  /**
   * Check if error is permanent (don't retry)
   */
  private static isPermanentError(error: any): boolean {
    const permanentCodes = [
      'EAUTH',
      'EMESSAGE',
    ];

    const permanentMessages = [
      'invalid recipient',
      'recipient not found',
      'mailbox unavailable',
      'mailbox full',
      'blocked',
      'blacklisted',
      'authentication failed',
      'invalid credentials',
    ];

    // Check error code
    if (error.code && permanentCodes.includes(error.code)) {
      return true;
    }

    // Check error message
    const message = (error.message || '').toLowerCase();
    return permanentMessages.some(msg => message.includes(msg));
  }
}
