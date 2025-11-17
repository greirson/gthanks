'use client';

import { Moon, Sun } from 'lucide-react';

import React, { useState } from 'react';

import { useTheme } from '@/components/theme/theme-provider';
import { Button } from '@/components/ui/button';

interface SimpleThemeToggleProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function SimpleThemeToggle({
  variant = 'ghost',
  size = 'icon',
  className,
}: SimpleThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Use a simple effect to set mounted state
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Simple toggle between light and dark (no system preference)
  const toggleTheme = () => {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light');
  };

  // Don't render until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        disabled
        aria-label="Loading theme toggle"
      >
        <Sun className="h-4 w-4" />
        <span className="sr-only">Loading theme toggle</span>
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleTheme}
      className={className}
      aria-label={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} theme`}
    >
      {resolvedTheme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
