'use client';

import { ArrowDownAZ, Hash, Calendar, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DEFAULT_DIRECTION,
  type ListSortPreference,
  type ListSortMode,
} from '@/lib/utils/sort-preferences';

interface ListSortToggleProps {
  preference: ListSortPreference;
  onPreferenceChange: (preference: ListSortPreference) => void;
  isHydrated?: boolean;
}

export function ListSortToggle({
  preference,
  onPreferenceChange,
  isHydrated = true,
}: ListSortToggleProps) {
  const handleClick = (clickedMode: ListSortMode) => {
    if (!isHydrated) {
      return;
    }

    if (clickedMode === preference.mode) {
      // Same mode → toggle direction
      const newDirection = preference.direction === 'asc' ? 'desc' : 'asc';
      onPreferenceChange({ mode: clickedMode, direction: newDirection });
    } else {
      // Different mode → use smart default
      const defaultDirection = DEFAULT_DIRECTION[clickedMode];
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
      aria-label="Sort lists"
    >
      {/* Alphabetical */}
      <button
        type="button"
        onClick={() => handleClick('name')}
        disabled={!isHydrated}
        className={cn(
          'relative inline-flex min-h-[36px] min-w-[44px] items-center justify-center rounded-sm px-3 text-sm font-medium transition-all',
          preference.mode === 'name'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
        aria-label={`Sort alphabetically${preference.mode === 'name' ? `, ${preference.direction === 'asc' ? 'ascending' : 'descending'}` : ''}`}
        title={`Sort A-Z${preference.mode === 'name' ? ` ${preference.direction === 'asc' ? '↑' : '↓'}` : ''}`}
      >
        <ArrowDownAZ className="h-4 w-4" />
        {preference.mode === 'name' &&
          (preference.direction === 'asc' ? (
            <ArrowUp className="absolute -right-0.5 -top-0.5 h-3 w-3" />
          ) : (
            <ArrowDown className="absolute -right-0.5 -top-0.5 h-3 w-3" />
          ))}
      </button>

      {/* Number of wishes */}
      <button
        type="button"
        onClick={() => handleClick('wishes')}
        disabled={!isHydrated}
        className={cn(
          'relative inline-flex min-h-[36px] min-w-[44px] items-center justify-center rounded-sm px-3 text-sm font-medium transition-all',
          preference.mode === 'wishes'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
        aria-label={`Sort by number of wishes${preference.mode === 'wishes' ? `, ${preference.direction === 'asc' ? 'ascending' : 'descending'}` : ''}`}
        title={`Sort by # of wishes${preference.mode === 'wishes' ? ` ${preference.direction === 'asc' ? '↑' : '↓'}` : ''}`}
      >
        <Hash className="h-4 w-4" />
        {preference.mode === 'wishes' &&
          (preference.direction === 'asc' ? (
            <ArrowUp className="absolute -right-0.5 -top-0.5 h-3 w-3" />
          ) : (
            <ArrowDown className="absolute -right-0.5 -top-0.5 h-3 w-3" />
          ))}
      </button>

      {/* Date created (newest) */}
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
        aria-label={`Sort by date created${preference.mode === 'newest' ? `, ${preference.direction === 'asc' ? 'ascending' : 'descending'}` : ''}`}
        title={`Sort by newest${preference.mode === 'newest' ? ` ${preference.direction === 'asc' ? '↑' : '↓'}` : ''}`}
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
