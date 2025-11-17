import { createClient } from '@/utils/supabase/server';
import crypto from 'crypto';

export interface AurinkoConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface EmailMessage {
  id?: string;
  subject: string;
  body: string;
  to: Array<{ address: string; name?: string }>;
  from?: { address: string; name?: string };
  cc?: Array<{ address: string; name?: string }>;
  bcc?: Array<{ address: string; name?: string }>;
  tracking?: {
    opens: boolean;
    threadReplies: boolean;
    context?: string;
  };
  attachments?: Array<{
    filename: string;
    contentType: string;
    data: string; // base64 encoded
  }>;
  headers?: Record<string, string>;
}

export interface SyncResponse {
  syncUpdatedToken: string;
  syncDeletedToken: string;
  ready: boolean;
}

export interface MessageSyncResponse {
  nextPageToken?: string;
  nextDeltaToken?: string;
  records: any[];
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export class AurinkoClient {
  private baseUrl = 'https://api.aurinko.io/v1';
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async makeRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any,
    params?: Record<string, string>,
    retryCount = 0
  ): Promise<any> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value);
        }
      });
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'WarmupPro/1.0',
    };

    const config: RequestInit = {
      method,
      headers,
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url.toString(), config);

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
        if (retryCount < 3) {
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          return this.makeRequest(endpoint, method, data, params, retryCount + 1);
        }
        throw new Error('Rate limit exceeded. Please try again later.');
      }

      // Handle token expiration
      if (response.status === 401) {
        throw new Error('Access token expired. Please reconnect your email account.');
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Aurinko API error: ${response.status}`;
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      }
      
      return response.text();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error occurred while communicating with Aurinko API');
    }
  }

  // OAuth Methods with enhanced security
  static getAuthUrl(
    clientId: string, 
    redirectUri: string, 
    scopes: string[] = ['Mail.Read', 'Mail.Send', 'Mail.ReadWrite'],
    state?: string
  ): string {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
    });

    if (state) {
      params.append('state', state);
    }

    return `https://api.aurinko.io/v1/auth/authorize?${params.toString()}`;
  }

  static async exchangeCodeForTokens(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<TokenResponse> {
    const response = await fetch('https://api.aurinko.io/v1/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'WarmupPro/1.0',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  static async refreshAccessToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string
  ): Promise<TokenResponse> {
    const response = await fetch('https://api.aurinko.io/v1/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'WarmupPro/1.0',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token refresh failed: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  // Email Sync Methods with enhanced error handling
  async startSync(daysWithin: number = 30, awaitReady: boolean = true): Promise<SyncResponse> {
    return this.makeRequest('/email/sync', 'POST', null, {
      daysWithin: Math.min(Math.max(daysWithin, 1), 365).toString(),
      awaitReady: awaitReady.toString(),
    });
  }

  async getSyncUpdated(deltaToken: string, pageToken?: string): Promise<MessageSyncResponse> {
    const params: Record<string, string> = { deltaToken };
    if (pageToken) {
      params.pageToken = pageToken;
    }
    return this.makeRequest('/email/sync/updated', 'GET', null, params);
  }

  async getSyncDeleted(deltaToken: string, pageToken?: string): Promise<MessageSyncResponse> {
    const params: Record<string, string> = { deltaToken };
    if (pageToken) {
      params.pageToken = pageToken;
    }
    return this.makeRequest('/email/sync/deleted', 'GET', null, params);
  }

  // Email Message Methods with validation
  async getMessages(query?: string, maxResults?: number, pageToken?: string) {
    const params: Record<string, string> = {};
    if (query) params.q = query;
    if (maxResults) params.maxResults = Math.min(Math.max(maxResults, 1), 500).toString();
    if (pageToken) params.pageToken = pageToken;

    return this.makeRequest('/email/messages', 'GET', null, params);
  }

  async getMessage(messageId: string) {
    if (!messageId || typeof messageId !== 'string') {
      throw new Error('Valid message ID is required');
    }
    return this.makeRequest(`/email/messages/${encodeURIComponent(messageId)}`);
  }

  async sendMessage(message: EmailMessage) {
    // Validate message
    this.validateEmailMessage(message);
    
    // Add security headers
    const secureMessage = {
      ...message,
      headers: {
        'X-Mailer': 'WarmupPro',
        'X-Priority': '3',
        ...message.headers,
      }
    };

    return this.makeRequest('/email/messages', 'POST', secureMessage);
  }

  async createDraft(message: EmailMessage) {
    this.validateEmailMessage(message);
    return this.makeRequest('/email/drafts', 'POST', message);
  }

  async sendDraft(draftId: string) {
    if (!draftId || typeof draftId !== 'string') {
      throw new Error('Valid draft ID is required');
    }
    return this.makeRequest(`/email/drafts/${encodeURIComponent(draftId)}/send`, 'POST');
  }

  // Email Tracking Methods
  async getTrackingData(messageId: string) {
    if (!messageId || typeof messageId !== 'string') {
      throw new Error('Valid message ID is required');
    }
    return this.makeRequest(`/email/tracking/${encodeURIComponent(messageId)}`);
  }

  async updateMessageStatus(messageId: string, unread?: boolean, flagged?: boolean) {
    if (!messageId || typeof messageId !== 'string') {
      throw new Error('Valid message ID is required');
    }
    
    const data: any = {};
    if (unread !== undefined) data.unread = unread;
    if (flagged !== undefined) data.flagged = flagged;

    return this.makeRequest(`/email/messages/${encodeURIComponent(messageId)}`, 'PUT', data);
  }

  // Folder Methods
  async getFolders() {
    return this.makeRequest('/email/folders');
  }

  async getFolder(folderId: string) {
    if (!folderId || typeof folderId !== 'string') {
      throw new Error('Valid folder ID is required');
    }
    return this.makeRequest(`/email/folders/${encodeURIComponent(folderId)}`);
  }

  // Account Info
  async getAccountInfo() {
    return this.makeRequest('/email/account');
  }

  // Validation helper
  private validateEmailMessage(message: EmailMessage) {
    if (!message.subject || typeof message.subject !== 'string') {
      throw new Error('Email subject is required');
    }
    
    if (!message.body || typeof message.body !== 'string') {
      throw new Error('Email body is required');
    }
    
    if (!message.to || !Array.isArray(message.to) || message.to.length === 0) {
      throw new Error('At least one recipient is required');
    }
    
    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const recipient of message.to) {
      if (!recipient.address || !emailRegex.test(recipient.address)) {
        throw new Error(`Invalid email address: ${recipient.address}`);
      }
    }
    
    // Validate subject length
    if (message.subject.length > 998) {
      throw new Error('Email subject is too long (max 998 characters)');
    }
    
    // Validate body length (10MB limit)
    if (message.body.length > 10 * 1024 * 1024) {
      throw new Error('Email body is too large (max 10MB)');
    }
  }
}

// Enhanced token management with encryption
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY is not set in environment variables');
}

function encrypt(text: string): string {
  try {
    if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
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

function decrypt(text: string): string {
  try {
    if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be 32 characters long');
    }
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const parts = text.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedText = parts[2];
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

export async function getAurinkoClient(emailId: string): Promise<AurinkoClient> {
  const supabase = await createClient();
  const { data: emailAccount, error } = await supabase
    .from('connected_emails')
    .select('oauth_tokens, status')
    .eq('id', emailId)
    .single();

  if (error || !emailAccount) {
    throw new Error('Email account not found');
  }

  if (emailAccount.status !== 'active') {
    throw new Error('Email account is not active');
  }

  const tokens = emailAccount.oauth_tokens;
  
  if (!tokens || !tokens.access_token) {
    throw new Error('No valid tokens found for email account');
  }

  // Decrypt tokens
  let accessToken: string;
  try {
    accessToken = typeof tokens.access_token === 'string' && tokens.access_token.includes(':') 
      ? decrypt(tokens.access_token) 
      : tokens.access_token;
  } catch (error) {
    throw new Error('Failed to decrypt access token');
  }

  // Check if token needs refresh
  if (tokens.expires_at && new Date(tokens.expires_at) <= new Date(Date.now() + 5 * 60 * 1000)) {
    try {
      const refreshToken = typeof tokens.refresh_token === 'string' && tokens.refresh_token.includes(':')
        ? decrypt(tokens.refresh_token)
        : tokens.refresh_token;

      const refreshedTokens = await AurinkoClient.refreshAccessToken(
        refreshToken,
        process.env.AURINKO_CLIENT_ID!,
        process.env.AURINKO_CLIENT_SECRET!
      );

      // Encrypt and update tokens in database
      const encryptedTokens = {
        access_token: encrypt(refreshedTokens.access_token),
        refresh_token: encrypt(refreshedTokens.refresh_token),
        expires_at: new Date(Date.now() + refreshedTokens.expires_in * 1000).toISOString(),
        token_type: refreshedTokens.token_type,
        scope: refreshedTokens.scope,
      };

      await supabase
        .from('connected_emails')
        .update({
          oauth_tokens: encryptedTokens,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', emailId);

      return new AurinkoClient(refreshedTokens.access_token);
    } catch (refreshError) {
      // Mark email account as error state
      await supabase
        .from('connected_emails')
        .update({ 
          status: 'error',
          updated_at: new Date().toISOString()
        })
        .eq('id', emailId);
      
      throw new Error('Failed to refresh access token. Please reconnect your email account.');
    }
  }

  return new AurinkoClient(accessToken);
}

// Utility functions with enhanced security
export function generateRandomDelay(minMinutes: number = 5, maxMinutes: number = 60): number {
  const min = Math.max(minMinutes, 1);
  const max = Math.min(maxMinutes, 1440); // Max 24 hours
  return Math.floor(Math.random() * (max - min + 1) + min) * 60 * 1000;
}

export function isBusinessHours(date: Date = new Date(), timezone: string = 'UTC'): boolean {
  try {
    const localDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    const hour = localDate.getHours();
    const day = localDate.getDay();
    
    // Monday to Friday, 9 AM to 5 PM
    return day >= 1 && day <= 5 && hour >= 9 && hour <= 17;
  } catch (error) {
    // Fallback to UTC if timezone is invalid
    const hour = date.getUTCHours();
    const day = date.getUTCDay();
    return day >= 1 && day <= 5 && hour >= 9 && hour <= 17;
  }
}

export function getNextBusinessHour(date: Date = new Date(), timezone: string = 'UTC'): Date {
  const nextDate = new Date(date);
  let attempts = 0;
  const maxAttempts = 168; // Max 1 week of hours
  
  while (!isBusinessHours(nextDate, timezone) && attempts < maxAttempts) {
    nextDate.setHours(nextDate.getHours() + 1);
    attempts++;
    
    // If it's weekend, move to Monday 9 AM
    if (nextDate.getDay() === 0) { // Sunday
      nextDate.setDate(nextDate.getDate() + 1);
      nextDate.setHours(9, 0, 0, 0);
    } else if (nextDate.getDay() === 6) { // Saturday
      nextDate.setDate(nextDate.getDate() + 2);
      nextDate.setHours(9, 0, 0, 0);
    } else if (nextDate.getHours() > 17) { // After business hours
      nextDate.setDate(nextDate.getDate() + 1);
      nextDate.setHours(9, 0, 0, 0);
    } else if (nextDate.getHours() < 9) { // Before business hours
      nextDate.setHours(9, 0, 0, 0);
    }
  }
  
  return nextDate;
}

// Email validation utilities
export function validateEmailAddress(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(email) && email.length <= 254;
}

export function sanitizeEmailContent(content: string): string {
  // Remove potentially dangerous HTML/script content
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

// Rate limiting helper
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 60 * 1000 // 1 minute
  ) {}
  
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    return true;
  }
  
  getRemainingRequests(identifier: string): number {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    const validRequests = requests.filter(time => now - time < this.windowMs);
    return Math.max(0, this.maxRequests - validRequests.length);
  }
}

export const emailRateLimiter = new RateLimiter(50, 60 * 1000); // 50 requests per minute