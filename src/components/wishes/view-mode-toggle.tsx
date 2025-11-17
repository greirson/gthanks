'use client';

import { Grid2X2, Grid3X3, List } from 'lucide-react';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

export type ViewMode = 'list' | 'grid-small' | 'grid-large';

interface ViewModeToggleProps {
  value: ViewMode;
  onValueChange: (value: ViewMode) => void;
  className?: string;
}

export function ViewModeToggle({ value, onValueChange, className }: ViewModeToggleProps) {
  return (
    <ToggleGroup
      value={value}
      onValueChange={onValueChange as (value: string) => void}
      className={className}
    >
      <ToggleGroupItem value="list" aria-label="List view">
        <List className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="grid-small" aria-label="Small grid view">
        <Grid3X3 className="h-4 w-4" />
      </ToggleGroupItem>
      <ToggleGroupItem value="grid-large" aria-label="Large grid view">
        <Grid2X2 className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
