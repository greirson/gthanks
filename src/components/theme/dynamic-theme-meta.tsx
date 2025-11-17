'use client';

import { useEffect } from 'react';

import { useTheme } from '@/hooks/use-theme';

export function DynamicThemeMeta() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const themeColor = resolvedTheme === 'dark' ? '#1a1a1a' : '#ffffff';
      metaThemeColor.setAttribute('content', themeColor);
    }

    // Also update the manifest theme dynamically if supported
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink && 'BeforeInstallPromptEvent' in window) {
      // For future: Could implement dynamic manifest generation here
    }
  }, [resolvedTheme]);

  return null;
}
