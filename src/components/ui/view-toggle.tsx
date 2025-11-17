"use client";

import { LayoutGrid, List } from "lucide-react";
import type { ViewMode } from "@/lib/utils/view-preferences";

type ViewToggleProps = {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
};

/**
 * A controlled toggle button component to switch between 'list' and 'compact' (grid) view.
 * Receives state as props from the parent component instead of managing its own state.
 * Shows both icons with a sliding background indicator that animates between them.
 * Matches the ToggleGroup component styling with animated slider.
 *
 * @param viewMode - The current view mode
 * @param onViewModeChange - Callback when view mode should change
 */
export function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
  const handleToggle = () => {
    // Toggle between list and compact (comfortable maps to compact for mobile)
    const currentMode = viewMode === 'comfortable' ? 'compact' : viewMode;
    const nextMode = currentMode === 'list' ? 'compact' : 'list';
    onViewModeChange(nextMode);
  };

  // Normalize view mode
  const currentMode = viewMode === 'comfortable' ? 'compact' : viewMode;
  const isListView = currentMode === 'list';

  return (
    <button
      onClick={handleToggle}
      role="radiogroup"
      aria-label={`Switch to ${isListView ? 'grid' : 'list'} view`}
      className="relative inline-flex h-11 min-h-[44px] items-center justify-center rounded-md bg-muted p-1 text-muted-foreground gap-1"
    >
      {/* Sliding background indicator */}
      <div
        className="absolute top-1 bottom-1 rounded-sm bg-background shadow-sm transition-all duration-300 ease-in-out"
        style={{
          left: '4px',
          width: '40px',
          transform: isListView ? 'translateX(0)' : 'translateX(44px)'
        }}
      />

      {/* Icons - matching ToggleGroupItem structure */}
      <div className="relative z-10 inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-2 text-sm font-medium">
        <List className="h-4 w-4" />
      </div>
      <div className="relative z-10 inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-2 text-sm font-medium">
        <LayoutGrid className="h-4 w-4" />
      </div>
    </button>
  );
}
