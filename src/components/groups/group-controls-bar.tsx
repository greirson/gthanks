'use client';

import { ControlsBar, type ViewMode } from '@/components/ui/controls-bar';

export type GroupViewMode = ViewMode;

export interface GroupControlsBarProps {
  onToggleFilters: () => void;
  isFiltersOpen: boolean;
  filterCount: number;
  viewMode: GroupViewMode;
  onViewModeChange: (mode: GroupViewMode) => void;
  // Optional hydration state
  isHydrated?: boolean;
}

export function GroupControlsBar(props: GroupControlsBarProps) {
  return <ControlsBar {...props} />;
}
