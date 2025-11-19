'use client';

import { useState, useEffect } from 'react';
import { X, ExternalLink, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { GiftCard } from './hooks/useGiftCardDialogs';

interface GiftCardItemProps {
  card: GiftCard;
  index: number;
  onEdit?: (card: GiftCard, index: number) => void;
  onRemove?: (card: GiftCard, index: number) => void;
  isOwner?: boolean;
}

function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return '';
  }
}

function formatAmount(amount: number | undefined): string {
  if (!amount) return '';
  
  // Simple $ prefix format
  return `$${amount.toFixed(2).replace(/\.00$/, '')}`;
}

export function GiftCardItem({ 
  card, 
  index, 
  onEdit, 
  onRemove,
  isOwner = false 
}: GiftCardItemProps) {
  const [faviconError, setFaviconError] = useState(false);
  const faviconUrl = getFaviconUrl(card.url);

  return (
    <div
      className={cn(
        "group relative inline-flex items-center gap-2 px-3 py-2 rounded-full",
        "bg-secondary/50 hover:bg-secondary/70 transition-colors",
        "border border-secondary-foreground/10",
        "min-w-0 max-w-full"
      )}
    >
      {/* Favicon */}
      {faviconUrl && !faviconError && (
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

      {/* Name and amount */}
      <a
        href={card.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 min-w-0 hover:underline"
      >
        <span className="truncate text-sm font-medium">
          {card.name}
        </span>
        {card.amount && (
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {formatAmount(card.amount)}
          </span>
        )}
      </a>

      {/* Edit/Remove buttons (only for owner) */}
      {isOwner && (
        <div className="flex items-center gap-1 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={(e) => {
                e.preventDefault();
                onEdit(card, index);
              }}
            >
              <Edit2 className="h-3 w-3" />
            </Button>
          )}
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-destructive/20"
              onClick={(e) => {
                e.preventDefault();
                onRemove(card, index);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
