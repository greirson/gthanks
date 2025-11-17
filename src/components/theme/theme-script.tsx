import React from 'react';

/**
 * ThemeScript prevents theme flash (FOUC) by setting the theme class before React hydrates.
 * This script runs immediately when the page loads, blocking render until theme is determined.
 */
export function ThemeScript() {
  // This script is inlined and runs immediately on page load
  const themeScript = `
    (function() {
      function getTheme() {
        // Check localStorage first (works for both auth and unauth users)
        const stored = localStorage.getItem('theme');
        if (stored === 'light' || stored === 'dark') return stored;
        
        // If theme is 'system' or not set, check system preference
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
          return 'dark';
        }
        return 'light';
      }
      
      // Apply theme class immediately
      document.documentElement.classList.add(getTheme());
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: themeScript }} suppressHydrationWarning />;
}
