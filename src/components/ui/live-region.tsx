'use client';

import { useEffect, useRef } from 'react';

interface LiveRegionProps {
  message: string;
  politeness?: 'polite' | 'assertive';
  clearOnUnmount?: boolean;
}

/**
 * Live region component for screen reader announcements
 * Use this to announce dynamic content changes to screen readers
 */
export function LiveRegion({
  message,
  politeness = 'polite',
  clearOnUnmount = true,
}: LiveRegionProps) {
  const regionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const region = regionRef.current;

    if (region && message) {
      // Clear existing content first to ensure the new message is announced
      region.textContent = '';

      // Use a small delay to ensure the screen reader picks up the change
      setTimeout(() => {
        if (regionRef.current) {
          regionRef.current.textContent = message;
        }
      }, 100);
    }

    return () => {
      if (clearOnUnmount && region) {
        region.textContent = '';
      }
    };
  }, [message, clearOnUnmount]);

  return <div ref={regionRef} aria-live={politeness} aria-atomic="true" className="sr-only" />;
}

/**
 * Hook for announcing messages to screen readers
 */
export function useAnnouncement() {
  const regionRef = useRef<HTMLDivElement>(null);

  const announce = (message: string, politeness: 'polite' | 'assertive' = 'polite') => {
    if (regionRef.current) {
      regionRef.current.setAttribute('aria-live', politeness);
      regionRef.current.textContent = '';

      setTimeout(() => {
        if (regionRef.current) {
          regionRef.current.textContent = message;
        }
      }, 100);
    }
  };

  const AnnouncementRegion = () => (
    <div ref={regionRef} aria-live="polite" aria-atomic="true" className="sr-only" />
  );

  return { announce, AnnouncementRegion };
}
