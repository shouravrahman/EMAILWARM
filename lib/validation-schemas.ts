import { z } from 'zod';

/**
 * Email address validation schema with disposable email and MX record checks
 * Note: Async refinements are handled separately in email-validation.ts utilities
 */
export const emailAddressSchema = z
  .string()
  .min(1, 'Email address is required')
  .email('Invalid email address format')
  .max(254, 'Email address too long')
  .toLowerCase()
  .trim();

/**
 * Campaign creation/update schema
 */
export const campaignSchema = z.object({
  name: z.string()
    .min(1, 'Campaign name is required')
    .max(100, 'Campaign name must be 100 characters or less')
    .trim(),
  emailId: z.string()
    .uuid('Invalid email ID format'),
  dailyVolume: z.number()
    .int('Daily volume must be a whole number')
    .min(1, 'Minimum 1 email per day')
    .max(50, 'Maximum 50 emails per day'),
  status: z.enum(['active', 'paused', 'completed'], {
    errorMap: () => ({ message: 'Status must be active, paused, or completed' })
  }).optional(),
  campaignType: z.enum(['warmup', 'outreach'], {
    errorMap: () => ({ message: 'Campaign type must be warmup or outreach' })
  }).optional().default('warmup'),
  prospectListId: z.string()
    .uuid('Invalid prospect list ID format')
    .optional(),
  outreachMode: z.enum(['automated', 'manual'], {
    errorMap: () => ({ message: 'Outreach mode must be automated or manual' })
  }).optional(),
  personalizationTemplate: z.string()
    .min(10, 'Personalization template must be at least 10 characters')
    .max(5000, 'Personalization template must be 5000 characters or less')
    .optional(),
}).refine(
  (data) => {
    // If campaign type is outreach, require prospect list and template
    if (data.campaignType === 'outreach') {
      return data.prospectListId && data.personalizationTemplate && data.outreachMode;
    }
    return true;
  },
  {
    message: 'Outreach campaigns require prospect list, personalization template, and outreach mode',
    path: ['campaignType'],
  }
);

/**
 * Email send request schema
 */
export const emailSendSchema = z.object({
  campaign_id: z.string().uuid('Invalid campaign ID'),
  email_id: z.string().uuid('Invalid email ID'),
  recipient: emailAddressSchema,
  subject: z.string()
    .min(1, 'Subject is required')
    .max(998, 'Subject must be 998 characters or less')
    .trim(),
  content: z.string()
    .min(1, 'Email body is required')
    .max(10 * 1024 * 1024, 'Email body is too large (max 10MB)'),
});

/**
 * Email generation request schema
 */
export const emailGenerateSchema = z.object({
  prompt: z.string()
    .min(10, 'Prompt must be at least 10 characters')
    .max(1000, 'Prompt must be 1000 characters or less')
    .trim(),
  tone: z.enum(['professional', 'casual', 'friendly', 'formal'], {
    errorMap: () => ({ message: 'Invalid tone selected' })
  }).optional(),
  length: z.enum(['short', 'medium', 'long'], {
    errorMap: () => ({ message: 'Invalid length selected' })
  }).optional(),
});

/**
 * SMTP connection schema
 */
export const smtpConnectionSchema = z.object({
  email: emailAddressSchema,
  host: z.string()
    .min(1, 'SMTP host is required')
    .max(255, 'SMTP host too long')
    .trim(),
  port: z.number()
    .int('Port must be a whole number')
    .min(1, 'Port must be at least 1')
    .max(65535, 'Port must be 65535 or less'),
  username: z.string()
    .min(1, 'Username is required')
    .max(255, 'Username too long')
    .trim(),
  password: z.string()
    .min(1, 'Password is required')
    .max(255, 'Password too long'),
  secure: z.boolean().optional().default(true),
});

/**
 * Warmup pool email schema
 */
export const warmupPoolEmailSchema = z.object({
  email: emailAddressSchema,
  provider: z.enum(['gmail', 'outlook', 'custom'], {
    errorMap: () => ({ message: 'Provider must be gmail, outlook, or custom' })
  }),
});

/**
 * Report generation schema
 */
export const reportGenerateSchema = z.object({
  startDate: z.string()
    .datetime('Invalid start date format')
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')),
  endDate: z.string()
    .datetime('Invalid end date format')
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')),
  emailIds: z.array(z.string().uuid('Invalid email ID'))
    .min(1, 'At least one email must be selected')
    .max(10, 'Maximum 10 emails can be included in a report'),
}).refine(
  (data: { startDate: string; endDate: string }) => new Date(data.startDate) <= new Date(data.endDate),
  {
    message: 'Start date must be before or equal to end date',
    path: ['endDate'],
  }
);

/**
 * Subscription quantity update schema
 */
export const subscriptionQuantitySchema = z.object({
  quantity: z.number()
    .int('Quantity must be a whole number')
    .min(1, 'Minimum 1 email address')
    .max(100, 'Maximum 100 email addresses'),
});

/**
 * User signup schema
 */
export const userSignupSchema = z.object({
  email: emailAddressSchema,
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be 72 characters or less')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less')
    .trim()
    .optional(),
});

/**
 * Pagination schema for list endpoints
 */
export const paginationSchema = z.object({
  page: z.number()
    .int('Page must be a whole number')
    .min(1, 'Page must be at least 1')
    .optional()
    .default(1),
  limit: z.number()
    .int('Limit must be a whole number')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must be 100 or less')
    .optional()
    .default(20),
});

/**
 * Type exports for use in API routes
 */
export type EmailAddressInput = z.infer<typeof emailAddressSchema>;
export type CampaignInput = z.infer<typeof campaignSchema>;
export type EmailSendInput = z.infer<typeof emailSendSchema>;
export type EmailGenerateInput = z.infer<typeof emailGenerateSchema>;
export type SMTPConnectionInput = z.infer<typeof smtpConnectionSchema>;
export type WarmupPoolEmailInput = z.infer<typeof warmupPoolEmailSchema>;
export type ReportGenerateInput = z.infer<typeof reportGenerateSchema>;
export type SubscriptionQuantityInput = z.infer<typeof subscriptionQuantitySchema>;
export type UserSignupInput = z.infer<typeof userSignupSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
