'use client';

import { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle } from 'lucide-react';
import { UseFormRegisterReturn } from 'react-hook-form';

interface BaseFormFieldProps {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  helpText?: string;
  className?: string;
}

interface InputFormFieldProps extends BaseFormFieldProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'datetime-local' | 'url';
  placeholder?: string;
  register: UseFormRegisterReturn;
  disabled?: boolean;
}

interface TextareaFormFieldProps extends BaseFormFieldProps {
  placeholder?: string;
  register: UseFormRegisterReturn;
  rows?: number;
  disabled?: boolean;
}

interface CustomFormFieldProps extends BaseFormFieldProps {
  children: ReactNode;
}

/**
 * Reusable form field component with validation display
 * Supports input, textarea, and custom field types
 */
export function FormField({
  label,
  name,
  type = 'text',
  placeholder,
  register,
  error,
  required = false,
  helpText,
  disabled = false,
  className = '',
}: InputFormFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Input
        id={name}
        type={type}
        placeholder={placeholder}
        {...register}
        disabled={disabled}
        className={error ? 'border-red-500 focus-visible:ring-red-500' : ''}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      {error && (
        <p
          id={`${name}-error`}
          className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1"
          role="alert"
        >
          <AlertTriangle className="h-3 w-3 flex-shrink-0" />
          <span>{error}</span>
        </p>
      )}
      {helpText && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{helpText}</p>
      )}
    </div>
  );
}

/**
 * Textarea form field component
 */
export function TextareaFormField({
  label,
  name,
  placeholder,
  register,
  error,
  required = false,
  helpText,
  rows = 4,
  disabled = false,
  className = '',
}: TextareaFormFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Textarea
        id={name}
        placeholder={placeholder}
        rows={rows}
        {...register}
        disabled={disabled}
        className={error ? 'border-red-500 focus-visible:ring-red-500' : ''}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      {error && (
        <p
          id={`${name}-error`}
          className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1"
          role="alert"
        >
          <AlertTriangle className="h-3 w-3 flex-shrink-0" />
          <span>{error}</span>
        </p>
      )}
      {helpText && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{helpText}</p>
      )}
    </div>
  );
}

/**
 * Custom form field wrapper for Select, RadioGroup, etc.
 */
export function CustomFormField({
  label,
  name,
  children,
  error,
  required = false,
  helpText,
  className = '',
}: CustomFormFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {children}
      {error && (
        <p
          id={`${name}-error`}
          className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1"
          role="alert"
        >
          <AlertTriangle className="h-3 w-3 flex-shrink-0" />
          <span>{error}</span>
        </p>
      )}
      {helpText && !error && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{helpText}</p>
      )}
    </div>
  );
}
