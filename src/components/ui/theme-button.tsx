'use client';

import React from 'react';

import { useTheme } from '@/components/theme/theme-provider';
import { Button, ButtonProps } from '@/components/ui/button';

/**
 * ThemeButton automatically uses primary variant in light mode and secondary variant in dark mode
 * This provides optimal contrast and visual hierarchy in both themes
 */
export const ThemeButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, ...props }, ref) => {
    const { resolvedTheme } = useTheme();

    // If a specific variant is provided, use it; otherwise auto-select based on theme
    const themeVariant = variant || (resolvedTheme === 'dark' ? 'secondary' : 'default');

    return <Button variant={themeVariant} {...props} ref={ref} />;
  }
);

ThemeButton.displayName = 'ThemeButton';
