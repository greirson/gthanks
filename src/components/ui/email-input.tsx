'use client';

import { forwardRef, useState } from 'react';
import { Mail, AlertCircle } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface EmailInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  showIcon?: boolean;
  autoValidate?: boolean;
  'aria-describedby'?: string;
}

/**
 * Validates email format using a robust regex pattern
 * @param email - The email string to validate
 * @returns boolean indicating if email is valid
 */
export const isValidEmail = (email: string): boolean => {
  if (!email || !email.trim()) {
    return false;
  }
  // More robust email regex that prevents consecutive dots and requires TLD
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email.trim());
};

/**
 * EmailInput - A reusable email input component with validation
 *
 * Features:
 * - Built-in email validation
 * - Optional mail icon
 * - Error state with visual feedback
 * - Enter key support for submission
 * - Consistent styling with other UI components
 */
export const EmailInput = forwardRef<HTMLInputElement, EmailInputProps>(
  (
    {
      value,
      onChange,
      onSubmit,
      placeholder = 'Enter email address',
      disabled = false,
      error: externalError,
      className,
      showIcon = true,
      autoValidate = true,
      ...props
    },
    ref
  ) => {
    const [internalError, setInternalError] = useState<string | null>(null);
    const [hasBlurred, setHasBlurred] = useState(false);

    // Use external error if provided, otherwise use internal validation
    const displayError = externalError || (autoValidate && hasBlurred ? internalError : null);
    const hasError = Boolean(displayError);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);

      // Clear errors when user starts typing
      if (internalError) {
        setInternalError(null);
      }
    };

    const handleBlur = () => {
      setHasBlurred(true);

      if (autoValidate && value.trim() && !isValidEmail(value)) {
        setInternalError('Please enter a valid email address');
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();

        // Validate before submitting if auto-validation is enabled
        if (autoValidate && value.trim() && !isValidEmail(value)) {
          setInternalError('Please enter a valid email address');
          setHasBlurred(true);
          return;
        }

        onSubmit?.();
      }
    };

    return (
      <div className={cn('space-y-2', className)}>
        <div className="relative">
          {showIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2">
              <Mail
                className={cn('h-4 w-4', hasError ? 'text-destructive' : 'text-muted-foreground')}
              />
            </div>
          )}

          <Input
            ref={ref}
            type="email"
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              showIcon && 'pl-10',
              hasError && 'border-destructive focus-visible:ring-destructive',
              className
            )}
            aria-invalid={hasError}
            aria-describedby={
              hasError
                ? `${props['aria-describedby'] || 'email-input'}-error`
                : props['aria-describedby']
            }
            {...props}
          />

          {hasError && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <AlertCircle className="h-4 w-4 text-destructive" />
            </div>
          )}
        </div>

        {displayError && (
          <p
            id={`${props['aria-describedby'] || 'email-input'}-error`}
            className="flex items-center gap-1 text-sm font-medium text-destructive"
          >
            <AlertCircle className="h-3 w-3" />
            {displayError}
          </p>
        )}
      </div>
    );
  }
);

EmailInput.displayName = 'EmailInput';
