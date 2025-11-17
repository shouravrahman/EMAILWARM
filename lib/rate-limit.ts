import { NextRequest } from 'next/server';

export interface RateLimitConfig {
  endpoint: string;
  maxRequests: number;
  windowMs: number;
  keyGenerator: (req: NextRequest) => string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

interface RequestRecord {
  timestamps: number[];
}

/**
 * In-memory rate limiter with automatic cleanup
 */
export class RateLimiter {
  private requests: Map<string, RequestRecord>;
  private cleanupInterval: NodeJS.Timeout | null;

  constructor() {
    this.requests = new Map();
    this.cleanupInterval = null;
    this.startCleanup();
  }

  /**
   * Check if a request is allowed based on rate limit configuration
   */
  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Get or create request record
    let record = this.requests.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.requests.set(key, record);
    }

    // Remove timestamps outside the current window
    record.timestamps = record.timestamps.filter((ts: number) => ts > windowStart);

    // Check if limit is exceeded
    const currentCount = record.timestamps.length;
    const allowed = currentCount < config.maxRequests;

    if (allowed) {
      // Add current timestamp
      record.timestamps.push(now);
    }

    const remaining = Math.max(0, config.maxRequests - record.timestamps.length);
    const oldestTimestamp = record.timestamps[0] || now;
    const resetAt = Math.ceil((oldestTimestamp + config.windowMs) / 1000);

    return {
      allowed,
      remaining,
      resetAt,
    };
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanup(): void {
    // Run cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Remove expired entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    const entries = Array.from(this.requests.entries());
    for (const [key, record] of entries) {
      // Remove entries with no recent activity
      const hasRecentActivity = record.timestamps.some((ts: number) => now - ts < maxAge);
      if (!hasRecentActivity) {
        this.requests.delete(key);
      }
    }

    // Limit total entries to prevent memory issues
    const maxEntries = 10000;
    if (this.requests.size > maxEntries) {
      const entriesToDelete = this.requests.size - maxEntries;
      const keys = Array.from(this.requests.keys());
      for (let i = 0; i < entriesToDelete; i++) {
        this.requests.delete(keys[i]);
      }
    }
  }

  /**
   * Stop cleanup interval (for testing)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton instance
let rateLimiterInstance: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter();
  }
  return rateLimiterInstance;
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/emails/send': {
    endpoint: '/api/emails/send',
    maxRequests: 10,
    windowMs: 10000, // 10 seconds
    keyGenerator: (req) => getUserKey(req),
  },
  '/api/emails/generate': {
    endpoint: '/api/emails/generate',
    maxRequests: 5,
    windowMs: 60000, // 1 minute
    keyGenerator: (req) => getUserKey(req),
  },
  '/api/campaigns': {
    endpoint: '/api/campaigns',
    maxRequests: 20,
    windowMs: 60000, // 1 minute
    keyGenerator: (req) => getUserKey(req),
  },
};

/**
 * Generate a unique key for rate limiting based on user ID or IP
 */
function getUserKey(req: NextRequest): string {
  // Try to get user ID from request (will be set by middleware)
  const userId = req.headers.get('x-user-id');
  if (userId) {
    return `user:${userId}`;
  }

  // Fallback to IP address for unauthenticated requests
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             'unknown';
  return `ip:${ip}`;
}
