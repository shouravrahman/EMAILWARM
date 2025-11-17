import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

/**
 * Standard API error response structure
 */
export interface APIError {
  error: string;
  code: string;
  details?: any;
  timestamp: string;
  requestId: string;
}

/**
 * Error codes for consistent error handling
 */
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  AUTHORIZATION_FAILED: 'AUTHORIZATION_FAILED',
  INSUFFICIENT_QUOTA: 'INSUFFICIENT_QUOTA',
  WARMUP_POOL_UNAVAILABLE: 'WARMUP_POOL_UNAVAILABLE',
  PRICING_CALCULATION_ERROR: 'PRICING_CALCULATION_ERROR',
  EMAIL_SEND_FAILED: 'EMAIL_SEND_FAILED',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

/**
 * Validation result type
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: z.ZodError;
}

/**
 * Validates request body against a Zod schema
 * @param schema - Zod schema to validate against
 * @returns Validation function that can be used in API routes
 */
export function validateRequest<T>(schema: z.ZodSchema<T>) {
  return async (request: NextRequest): Promise<ValidationResult<T>> => {
    try {
      const body = await request.json();
      const data = await schema.parseAsync(body);
      return { success: true, data };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, errors: error };
      }
      throw error;
    }
  };
}

/**
 * Validates query parameters against a Zod schema
 * @param schema - Zod schema to validate against
 * @returns Validation function for query parameters
 */
export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return async (request: NextRequest): Promise<ValidationResult<T>> => {
    try {
      const { searchParams } = new URL(request.url);
      const params: Record<string, any> = {};
      
      searchParams.forEach((value, key) => {
        // Try to parse numbers
        if (!isNaN(Number(value))) {
          params[key] = Number(value);
        } else if (value === 'true' || value === 'false') {
          params[key] = value === 'true';
        } else {
          params[key] = value;
        }
      });
      
      const data = await schema.parseAsync(params);
      return { success: true, data };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { success: false, errors: error };
      }
      throw error;
    }
  };
}

/**
 * Creates a standardized error response
 * @param error - Error message
 * @param code - Error code from ERROR_CODES
 * @param details - Additional error details
 * @param status - HTTP status code
 */
export function createErrorResponse(
  error: string,
  code: keyof typeof ERROR_CODES,
  details?: any,
  status: number = 400
): NextResponse<APIError> {
  return NextResponse.json(
    {
      error,
      code: ERROR_CODES[code],
      details,
      timestamp: new Date().toISOString(),
      requestId: crypto.randomUUID(),
    },
    { status }
  );
}

/**
 * Creates a validation error response from Zod errors
 * @param zodError - Zod validation error
 */
export function createValidationErrorResponse(
  zodError: z.ZodError
): NextResponse<APIError> {
  const fieldErrors = zodError.flatten();
  
  return createErrorResponse(
    'Validation failed',
    'VALIDATION_ERROR',
    {
      fieldErrors: fieldErrors.fieldErrors,
      formErrors: fieldErrors.formErrors,
    },
    400
  );
}

/**
 * Higher-order function that wraps API route handlers with error handling
 * @param handler - The API route handler function
 */
export function withErrorHandling(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      return await handler(request, context);
    } catch (error) {
      console.error('API Error:', error);
      
      if (error instanceof z.ZodError) {
        return createValidationErrorResponse(error);
      }
      
      // Handle other known error types
      if (error instanceof Error) {
        const isDevelopment = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';
        return createErrorResponse(
          error.message || 'Internal server error',
          'INTERNAL_ERROR',
          isDevelopment ? { stack: error.stack } : undefined,
          500
        );
      }
      
      return createErrorResponse(
        'An unexpected error occurred',
        'INTERNAL_ERROR',
        undefined,
        500
      );
    }
  };
}

/**
 * Validates request body and returns typed data or error response
 * Use this helper in API routes for cleaner validation
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ data: T; error?: never } | { error: NextResponse; data?: never }> {
  const validation = await validateRequest(schema)(request);
  
  if (!validation.success) {
    return { error: createValidationErrorResponse(validation.errors!) };
  }
  
  return { data: validation.data! };
}

/**
 * Validates query parameters and returns typed data or error response
 */
export async function validateQueryParams<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<{ data: T; error?: never } | { error: NextResponse; data?: never }> {
  const validation = await validateQuery(schema)(request);
  
  if (!validation.success) {
    return { error: createValidationErrorResponse(validation.errors!) };
  }
  
  return { data: validation.data! };
}
