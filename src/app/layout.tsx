import { Toaster } from '@/components/ui/toaster';

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import { ChunkLoadErrorHandler } from '@/components/error/chunk-load-error-handler';
import { ErrorBoundary } from '@/components/error/error-boundary';
import { QueryProvider } from '@/components/providers/query-provider';
import { SessionProvider } from '@/components/providers/session-provider';
import { DynamicThemeMeta } from '@/components/theme/dynamic-theme-meta';
import { ThemeProvider, ThemeScript } from '@/components/theme/theme-provider';
import { SkipLink } from '@/components/ui/skip-link';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  title: 'gthanks - Wishlist Manager',
  description: 'Create and share wishlists with friends and family',
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/favicon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={inter.className}>
        <SkipLink href="#main-content">Skip to main content</SkipLink>
        <SessionProvider>
          <ChunkLoadErrorHandler>
            <ErrorBoundary
              fallback={
                <div className="flex min-h-screen items-center justify-center">
                  <div className="text-center">
                    <h1 className="mb-4 text-2xl font-bold">Theme System Error</h1>
                    <p className="mb-4 text-muted-foreground">
                      There was an issue with the theme system. The page will work but themes may
                      not function correctly.
                    </p>
                    <a
                      href="/"
                      className="inline-block rounded-md bg-primary px-4 py-2 text-primary-foreground no-underline hover:bg-primary/90"
                    >
                      Reload Page
                    </a>
                  </div>
                </div>
              }
            >
              <ThemeProvider>
                <QueryProvider>
                  <main id="main-content">{children}</main>
                  <Toaster />
                  <DynamicThemeMeta />
                </QueryProvider>
              </ThemeProvider>
            </ErrorBoundary>
          </ChunkLoadErrorHandler>
        </SessionProvider>
      </body>
    </html>
  );
}
