'use client';

import { Check, ShoppingBag, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Progress } from '@/components/ui/progress';
import { ThemeButton } from '@/components/ui/theme-button';

interface BulkActionsBarProps {
  selectedCount: number;
  onBulkCancel: () => void;
  onBulkMarkPurchased: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onClose: () => void;
}

interface ProgressState {
  current: number;
  total: number;
  operation: 'cancelling' | 'marking' | null;
}

export function BulkActionsBar({
  selectedCount,
  onBulkCancel,
  onBulkMarkPurchased,
  onSelectAll,
  onClearSelection,
  onClose,
}: BulkActionsBarProps) {
  const [isProcessing, _setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ProgressState>({
    current: 0,
    total: 0,
    operation: null,
  });

  // Reset progress when processing is done
  useEffect(() => {
    if (!isProcessing) {
      setProgress({ current: 0, total: 0, operation: null });
    }
  }, [isProcessing]);

  // Progress display component
  const ProgressDisplay = () => {
    if (!isProcessing || !progress.operation) {
      return null;
    }

    const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
    const operationTextMap = {
      cancelling: 'Cancelling reservations',
      marking: 'Marking as purchased',
    } as const;
    const operationText = operationTextMap[progress.operation] ?? 'Processing';

    return (
      <div className="mb-2 flex items-center gap-3 px-3">
        <div className="flex-1">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {operationText}... {progress.current} of {progress.total}
            </span>
            <span className="text-muted-foreground">{Math.round(percentage)}%</span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>
      </div>
    );
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      {/* Floating Toolbar - Fixed to Bottom on All Screen Sizes */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 shadow-lg backdrop-blur duration-300 animate-in slide-in-from-bottom"
        role="toolbar"
        aria-label="Bulk actions toolbar"
        style={{ minHeight: '60px' }}
      >
        <ProgressDisplay />
        <div className="flex items-center gap-2 px-3 py-2">
          {/* Selection Info */}
          <span className="text-sm font-medium text-muted-foreground">
            {selectedCount} selected
          </span>

          {/* Compact Action Buttons - Icon only on mobile, with text on desktop */}
          <div className="flex flex-1 items-center justify-center gap-1">
            {/* Select All */}
            <ThemeButton
              size="sm"
              variant="ghost"
              onClick={onSelectAll}
              disabled={isProcessing}
              className="h-11 w-11 p-0 md:w-auto md:px-3"
              title="Select All"
            >
              <Check className="h-5 w-5" />
              <span className="ml-2 hidden md:inline">Select All</span>
            </ThemeButton>

            {/* Clear Selection */}
            <ThemeButton
              size="sm"
              variant="ghost"
              onClick={onClearSelection}
              disabled={isProcessing}
              className="h-11 w-11 p-0 md:w-auto md:px-3"
              title="Clear Selection"
            >
              <X className="h-5 w-5" />
              <span className="ml-2 hidden md:inline">Clear</span>
            </ThemeButton>

            <div className="mx-1 h-6 w-px bg-border" /> {/* Separator */}

            {/* Mark as Purchased */}
            <ThemeButton
              size="sm"
              variant="default"
              onClick={onBulkMarkPurchased}
              disabled={isProcessing}
              className="h-11 w-11 p-0 md:w-auto md:px-4"
              title="Mark as Purchased"
            >
              <ShoppingBag className="h-5 w-5" />
              <span className="ml-2 hidden md:inline">Mark as Purchased</span>
            </ThemeButton>

            {/* Cancel Selected */}
            <ThemeButton
              size="sm"
              variant="destructive"
              onClick={onBulkCancel}
              disabled={isProcessing}
              className="h-11 w-11 p-0 md:w-auto md:px-4"
              title="Cancel Selected"
            >
              <Trash2 className="h-5 w-5" />
              <span className="ml-2 hidden md:inline">Cancel Selected</span>
            </ThemeButton>
          </div>

          {/* Exit button */}
          <ThemeButton
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-11 w-11 p-0"
            title="Exit Selection Mode"
          >
            <X className="h-5 w-5" />
          </ThemeButton>
        </div>
      </div>
    </>
  );
}
