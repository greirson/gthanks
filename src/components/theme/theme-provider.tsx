'use client';

import { createContext, useContext, useEffect, useState } from 'react';

import { useSession } from 'next-auth/react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  systemTheme: ResolvedTheme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  enableSystem?: boolean;
}

export function ThemeProvider({ children, defaultTheme = 'system' }: ThemeProviderProps) {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>('light');

  // System theme detection
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateSystemTheme = () => {
      setSystemTheme(mediaQuery.matches ? 'dark' : 'light');
    };

    updateSystemTheme();
    mediaQuery.addEventListener('change', updateSystemTheme);
    return () => mediaQuery.removeEventListener('change', updateSystemTheme);
  }, []);

  // Load theme on mount
  useEffect(() => {
    if (status === 'loading') {
      return;
    }

    let initialTheme: Theme = defaultTheme;

    // Always check localStorage first to match ThemeScript behavior
    const stored = localStorage.getItem('theme') as Theme;
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      initialTheme = stored;
    }

    // For authenticated users, also sync localStorage with database preference
    if (status === 'authenticated' && session?.user) {
      const userTheme = (session.user as { themePreference?: string }).themePreference as Theme;
      if (userTheme && ['light', 'dark', 'system'].includes(userTheme)) {
        // If database theme differs from localStorage, update localStorage
        if (stored !== userTheme) {
          localStorage.setItem('theme', userTheme);
        }
        initialTheme = userTheme;
      }
    }

    setThemeState(initialTheme);
    setMounted(true);
  }, [status, session, defaultTheme]);

  // Calculate resolved theme
  const resolvedTheme: ResolvedTheme = theme === 'system' ? systemTheme : theme;

  // Apply theme to DOM
  useEffect(() => {
    if (!mounted) {
      return;
    }

    const root = document.documentElement;

    // Remove existing theme classes
    root.classList.remove('light', 'dark');

    // Add current theme class
    root.classList.add(resolvedTheme);
  }, [resolvedTheme, mounted]);

  // Update theme function
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);

    // Always update localStorage to prevent hydration mismatch
    localStorage.setItem('theme', newTheme);

    if (status === 'authenticated') {
      // Update database for authenticated users
      void fetch('/api/user/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme }),
      }).catch((error) => {
        console.error('Failed to update theme preference:', error);
        // Show user notification that theme preference could not be saved
        // The localStorage fallback will still work for the current session
      });
    }
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return <div className="theme-loading">{children}</div>;
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
        systemTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // Return a default context when ThemeProvider is not available
    // This can happen during SSR or when components are used outside the provider
    return {
      theme: 'system' as Theme,
      resolvedTheme: 'light' as ResolvedTheme,
      setTheme: () => {
        console.warn('Cannot set theme outside of ThemeProvider');
      },
      systemTheme: 'light' as ResolvedTheme,
    };
  }
  return context;
}

// Re-export ThemeScript for convenience
export { ThemeScript } from './theme-script';
