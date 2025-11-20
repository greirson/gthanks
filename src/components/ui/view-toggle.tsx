'use client';

import { Grid2x2, List } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'list' | 'grid';

interface ViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  isHydrated?: boolean;
}

export function ViewToggle({
  viewMode,
  onViewModeChange,
  isHydrated = true,
}: ViewToggleProps) {
  return (
    <button
      onClick={() => {
        if (isHydrated) {
          onViewModeChange(viewMode === 'list' ? 'grid' : 'list');
        }
      }}
      disabled={!isHydrated}
      className={cn(
        'inline-flex min-h-[44px] items-center justify-center gap-1 rounded-md bg-muted p-1 text-muted-foreground',
        !isHydrated && 'cursor-not-allowed opacity-50'
      )}
      aria-label={`Switch to ${viewMode === 'list' ? 'grid' : 'list'} view`}
    >
      <div
        className={cn(
          'inline-flex min-h-[36px] min-w-[44px] items-center justify-center rounded-sm px-3 text-sm font-medium transition-all',
          viewMode === 'list'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground'
        )}
      >
        <List className="h-4 w-4" />
      </div>
      <div
        className={cn(
          'inline-flex min-h-[36px] min-w-[44px] items-center justify-center rounded-sm px-3 text-sm font-medium transition-all',
          viewMode === 'grid'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground'
        )}
      >
        <Grid2x2 className="h-4 w-4" />
      </div>
    </button>
  );
}
