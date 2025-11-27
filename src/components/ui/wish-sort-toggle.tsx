'use client';

import { Star, DollarSign, Calendar, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WISH_DEFAULT_DIRECTION,
  type WishSortPreference,
  type WishSortMode,
} from '@/lib/utils/sort-preferences';

interface WishSortToggleProps {
  preference: WishSortPreference;
  onPreferenceChange: (preference: WishSortPreference) => void;
  isHydrated?: boolean;
}

export function WishSortToggle({
  preference,
  onPreferenceChange,
  isHydrated = true,
}: WishSortToggleProps) {
  const handleClick = (clickedMode: WishSortMode) => {
    if (!isHydrated) {
      return;
    }

    if (clickedMode === preference.mode) {
      // Same mode -> toggle direction
      const newDirection = preference.direction === 'asc' ? 'desc' : 'asc';
      onPreferenceChange({ mode: clickedMode, direction: newDirection });
    } else {
      // Different mode -> use smart default
      const defaultDirection = WISH_DEFAULT_DIRECTION[clickedMode];
      onPreferenceChange({ mode: clickedMode, direction: defaultDirection });
    }
  };

  return (
    <div
      className={cn(
        'inline-flex min-h-[44px] items-center justify-center gap-1 rounded-md bg-muted p-1 text-muted-foreground',
        !isHydrated && 'cursor-not-allowed opacity-50'
      )}
      role="group"
      aria-label="Sort wishes"
    >
      {/* Priority (Star) */}
      <button
        type="button"
        onClick={() => handleClick('priority')}
        disabled={!isHydrated}
        className={cn(
          'relative inline-flex min-h-[36px] min-w-[44px] items-center justify-center rounded-sm px-3 text-sm font-medium transition-all',
          preference.mode === 'priority'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
        aria-label={`Sort by priority${preference.mode === 'priority' ? `, ${preference.direction === 'asc' ? 'ascending' : 'descending'}` : ''}`}
        title={`Sort by priority${preference.mode === 'priority' ? ` ${preference.direction === 'asc' ? '↑' : '↓'}` : ''}`}
      >
        <Star className="h-4 w-4" />
        {preference.mode === 'priority' &&
          (preference.direction === 'asc' ? (
            <ArrowUp className="absolute -right-0.5 -top-0.5 h-3 w-3" />
          ) : (
            <ArrowDown className="absolute -right-0.5 -top-0.5 h-3 w-3" />
          ))}
      </button>

      {/* Price (Dollar Sign) */}
      <button
        type="button"
        onClick={() => handleClick('price')}
        disabled={!isHydrated}
        className={cn(
          'relative inline-flex min-h-[36px] min-w-[44px] items-center justify-center rounded-sm px-3 text-sm font-medium transition-all',
          preference.mode === 'price'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
        aria-label={`Sort by price${preference.mode === 'price' ? `, ${preference.direction === 'asc' ? 'ascending' : 'descending'}` : ''}`}
        title={`Sort by price${preference.mode === 'price' ? ` ${preference.direction === 'asc' ? '↑' : '↓'}` : ''}`}
      >
        <DollarSign className="h-4 w-4" />
        {preference.mode === 'price' &&
          (preference.direction === 'asc' ? (
            <ArrowUp className="absolute -right-0.5 -top-0.5 h-3 w-3" />
          ) : (
            <ArrowDown className="absolute -right-0.5 -top-0.5 h-3 w-3" />
          ))}
      </button>

      {/* Date (Calendar) */}
      <button
        type="button"
        onClick={() => handleClick('newest')}
        disabled={!isHydrated}
        className={cn(
          'relative inline-flex min-h-[36px] min-w-[44px] items-center justify-center rounded-sm px-3 text-sm font-medium transition-all',
          preference.mode === 'newest'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
        aria-label={`Sort by date${preference.mode === 'newest' ? `, ${preference.direction === 'asc' ? 'ascending' : 'descending'}` : ''}`}
        title={`Sort by date${preference.mode === 'newest' ? ` ${preference.direction === 'asc' ? '↑' : '↓'}` : ''}`}
      >
        <Calendar className="h-4 w-4" />
        {preference.mode === 'newest' &&
          (preference.direction === 'asc' ? (
            <ArrowUp className="absolute -right-0.5 -top-0.5 h-3 w-3" />
          ) : (
            <ArrowDown className="absolute -right-0.5 -top-0.5 h-3 w-3" />
          ))}
      </button>
    </div>
  );
}
