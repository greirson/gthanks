'use client';

import { ControlsBar, type ViewMode } from '@/components/ui/controls-bar';

export type ListViewMode = ViewMode;

export interface ListControlsBarProps {
  onToggleFilters: () => void;
  isFiltersOpen: boolean;
  filterCount: number;
  viewMode: ListViewMode;
  onViewModeChange: (mode: ListViewMode) => void;
  // Optional hydration state
  isHydrated?: boolean;
}

export function ListControlsBar(props: ListControlsBarProps) {
  return <ControlsBar {...props} />;
}
