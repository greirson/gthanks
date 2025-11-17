'use client';

import { ControlsBar, type ViewMode } from '@/components/ui/controls-bar';

export type WishViewMode = ViewMode;

export interface WishControlsBarProps {
  onToggleFilters: () => void;
  isFiltersOpen: boolean;
  filterCount: number;
  viewMode: WishViewMode;
  onViewModeChange: (mode: WishViewMode) => void;
  // Optional Select button props
  showSelectButton?: boolean;
  isSelectionMode?: boolean;
  onToggleSelection?: () => void;
  // Optional mobile action buttons
  showMobileActions?: boolean;
  onAddAction?: () => void;
  // Optional hydration state
  isHydrated?: boolean;
}

export function WishControlsBar(props: WishControlsBarProps) {
  return <ControlsBar {...props} />;
}
