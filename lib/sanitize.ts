/**
 * HTML Sanitization utilities to prevent XSS attacks
 * These functions remove dangerous HTML content while preserving safe formatting
 */

/**
 * Removes dangerous HTML tags and attributes that could be used for XSS attacks
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeHTML(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  let sanitized = html;

  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove iframe tags and their content
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

  // Remove object tags and their content
  sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');

  // Remove embed tags
  sanitized = sanitized.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');

  // Remove applet tags and their content
  sanitized = sanitized.replace(/<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi, '');

  // Remove meta tags
  sanitized = sanitized.replace(/<meta\b[^<]*>/gi, '');

  // Remove link tags (except for safe rel attributes)
  sanitized = sanitized.replace(/<link\b[^<]*>/gi, '');

  // Remove base tags
  sanitized = sanitized.replace(/<base\b[^<]*>/gi, '');

  // Remove form tags and their content
  sanitized = sanitized.replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '');

  // Remove input tags
  sanitized = sanitized.replace(/<input\b[^<]*>/gi, '');

  // Remove button tags with onclick
  sanitized = sanitized.replace(/<button\b[^<]*onclick[^<]*(?:(?!<\/button>)<[^<]*)*<\/button>/gi, '');

  // Remove javascript: protocol from href and src attributes
  sanitized = sanitized.replace(/javascript:/gi, '');

  // Remove data: protocol (except for safe image data URIs)
  sanitized = sanitized.replace(/data:(?!image\/(png|jpg|jpeg|gif|svg\+xml|webp))/gi, '');

  // Remove vbscript: protocol
  sanitized = sanitized.replace(/vbscript:/gi, '');

  // Remove file: protocol
  sanitized = sanitized.replace(/file:/gi, '');

  // Remove all event handlers (onclick, onload, onerror, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove FSCommand (Flash)
  sanitized = sanitized.replace(/FSCommand:/gi, '');

  // Remove seekSegmentTime (Media)
  sanitized = sanitized.replace(/seekSegmentTime:/gi, '');

  return sanitized;
}

/**
 * More aggressive sanitization for email content
 * Removes inline styles and additional potentially dangerous content
 * @param content - The email content to sanitize
 * @returns Sanitized email content
 */
export function sanitizeEmailContent(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // First apply general HTML sanitization
  let sanitized = sanitizeHTML(content);

  // Remove style tags and their content
  sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove inline style attributes (optional - uncomment if needed)
  // sanitized = sanitized.replace(/\s*style\s*=\s*["'][^"']*["']/gi, '');
  // sanitized = sanitized.replace(/\s*style\s*=\s*[^\s>]*/gi, '');

  // Remove class attributes that might be used for CSS injection
  // (optional - uncomment if you want to remove all classes)
  // sanitized = sanitized.replace(/\s*class\s*=\s*["'][^"']*["']/gi, '');

  // Remove id attributes that might be used for targeting
  // (optional - uncomment if you want to remove all ids)
  // sanitized = sanitized.replace(/\s*id\s*=\s*["'][^"']*["']/gi, '');

  return sanitized;
}

/**
 * Sanitizes user input for display in HTML context
 * Escapes HTML entities to prevent XSS
 * @param text - Plain text to escape
 * @returns HTML-safe text
 */
export function escapeHTML(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'/]/g, (char) => htmlEscapeMap[char] || char);
}

/**
 * Sanitizes URLs to prevent javascript: and data: protocol attacks
 * @param url - URL to sanitize
 * @returns Safe URL or empty string if dangerous
 */
export function sanitizeURL(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }

  const trimmedUrl = url.trim().toLowerCase();

  // Block dangerous protocols
  const dangerousProtocols = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
    'about:',
  ];

  for (const protocol of dangerousProtocols) {
    if (trimmedUrl.startsWith(protocol)) {
      return '';
    }
  }

  // Allow only safe protocols
  const safeProtocols = ['http:', 'https:', 'mailto:', 'tel:', 'sms:'];
  const hasProtocol = safeProtocols.some(protocol => trimmedUrl.startsWith(protocol));

  // If it has a protocol and it's not safe, block it
  if (trimmedUrl.includes(':') && !hasProtocol) {
    return '';
  }

  return url;
}

/**
 * Sanitizes email subject line
 * Removes control characters and excessive whitespace
 * @param subject - Email subject to sanitize
 * @returns Sanitized subject
 */
export function sanitizeEmailSubject(subject: string): string {
  if (!subject || typeof subject !== 'string') {
    return '';
  }

  // Remove control characters (except newline and tab)
  let sanitized = subject.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  // Replace multiple whitespace with single space
  sanitized = sanitized.replace(/\s+/g, ' ');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length (email subject should be under 998 characters per RFC 2822)
  if (sanitized.length > 998) {
    sanitized = sanitized.substring(0, 998);
  }

  return sanitized;
}

/**
 * Validates and sanitizes email addresses
 * Removes potentially dangerous characters
 * @param email - Email address to sanitize
 * @returns Sanitized email or empty string if invalid
 */
export function sanitizeEmailAddress(email: string): string {
  if (!email || typeof email !== 'string') {
    return '';
  }

  // Remove whitespace
  let sanitized = email.trim().toLowerCase();

  // Basic email format validation
  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
  if (!emailRegex.test(sanitized)) {
    return '';
  }

  return sanitized;
}

/**
 * Sanitizes campaign name or other user-provided text fields
 * @param text - Text to sanitize
 * @returns Sanitized text
 */
export function sanitizeTextField(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Remove control characters
  let sanitized = text.replace(/[\x00-\x1F\x7F]/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Remove excessive whitespace
  sanitized = sanitized.replace(/\s+/g, ' ');

  return sanitized;
}
