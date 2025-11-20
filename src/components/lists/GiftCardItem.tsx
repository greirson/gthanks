'use client';

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GiftCard } from './hooks/useGiftCardDialogs';

interface GiftCardItemProps {
  card: GiftCard;
}

function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return '';
  }
}

export function GiftCardItem({ card }: GiftCardItemProps) {
  const [faviconError, setFaviconError] = useState(false);
  const faviconUrl = getFaviconUrl(card.url);

  return (
    <div
      className={cn(
        'group relative inline-flex items-center gap-2 rounded-full px-3',
        'bg-secondary/50 transition-colors hover:bg-secondary/70',
        'border border-secondary-foreground/10',
        'min-w-0 max-w-full',
        'h-11' // Fixed height for uniform pill sizes (44px)
      )}
    >
      {/* Favicon */}
      {faviconUrl && !faviconError && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={faviconUrl}
          alt=""
          className="h-4 w-4 flex-shrink-0"
          onError={() => setFaviconError(true)}
        />
      )}

      {/* Link icon fallback */}
      {(!faviconUrl || faviconError) && (
        <ExternalLink className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
      )}

      {/* Clickable name */}
      <a
        href={card.url}
        target="_blank"
        rel="noopener noreferrer"
        className="truncate text-sm font-medium hover:underline"
      >
        {card.name}
      </a>
    </div>
  );
}
