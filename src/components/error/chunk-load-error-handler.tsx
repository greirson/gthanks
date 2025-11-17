'use client';

import { useEffect, useState } from 'react';

import { AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';

// Fallback UI shown when JavaScript chunks fail to load
const OfflineFallback = () => (
  <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm">
    <div className="mx-4 max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-lg">
      <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-destructive" />
      <h2 className="mb-2 text-2xl font-bold text-foreground">Server Offline</h2>
      <p className="mb-6 text-muted-foreground">
        The development server isn&apos;t running. Start the server with{' '}
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-sm">pnpm dev</code> and try
        again.
      </p>
      <Button onClick={() => window.location.reload()} className="w-full">
        Retry Connection
      </Button>
    </div>
  </div>
);

/**
 * Global error handler for chunk loading failures.
 * Detects when Next.js JavaScript chunks fail to load (common when dev server is stopped)
 * and shows a friendly error message instead of infinite loading.
 */
export function ChunkLoadErrorHandler({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const errorHandler = (event: ErrorEvent) => {
      // Detect chunk load errors - these happen when:
      // 1. Dev server is stopped
      // 2. Network fails
      // 3. Server returns HTML instead of JS (MIME type mismatch)
      const isChunkLoadError =
        event.message.includes('Failed to fetch dynamically imported module') ||
        event.message.includes('Loading chunk') ||
        event.message.includes('Unexpected token') ||
        (event.message.includes('<') && event.filename?.includes('.js'));

      if (isChunkLoadError) {
        console.error('Chunk load error detected:', event.message);
        setHasError(true);
      }
    };

    // Listen for global script loading errors
    window.addEventListener('error', errorHandler);

    return () => {
      window.removeEventListener('error', errorHandler);
    };
  }, []);

  if (hasError) {
    return <OfflineFallback />;
  }

  return <>{children}</>;
}
