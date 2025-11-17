'use client';

import { useState, useCallback, useMemo } from 'react';
import { PlusIcon, X, Filter, CheckSquare, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useViewPreference } from '@/lib/utils/view-preferences';
import { Button as ThemeButton } from '@/components/ui/button';
import { Button } from '@/components/ui/button';
import { ViewToggle } from '@/components/ui/view-toggle';
import { MobileFilterSheet } from './filters/MobileFilterSheet';
import { WishFilterPanel } from './filters/WishFilterPanel';
import { WishControlsBar } from './wish-controls-bar';
import { useWishFilters, useWishesQuery } from './hooks/useWishFilters';
import { BulkActionsBar } from './bulk-actions-bar';
import { WishesDisplay } from './wishes-display';
import { EmptyStateWithFilters } from './empty-state-with-filters';
import { WishesLoadingSkeleton } from './wish-skeleton';
import type { Wish } from '@/lib/validators/api-responses/wishes';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { WishForm } from '@/components/wishes/wish-form';
import { usePreventUnsavedClose } from '@/hooks/use-form-dirty-state';
import { useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { wishesApi } from '@/lib/api/wishes';

export function WishesView() {
  const queryClient = useQueryClient();
  const [selectedWishIds, setSelectedWishIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isDesktopFilterOpen, setIsDesktopFilterOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [showAddWishDialog, setShowAddWishDialog] = useState(false);
  const [isAddWishFormDirty, setIsAddWishFormDirty] = useState(false);
  const [showEditWishDialog, setShowEditWishDialog] = useState(false);
  const [isEditWishFormDirty, setIsEditWishFormDirty] = useState(false);
  const [editingWish, setEditingWish] = useState<Wish | null>(null);
  const [deletingWish, setDeletingWish] = useState<Wish | null>(null);

  // View mode state - default to compact for better space efficiency
  const [viewMode, setViewMode, isHydrated] = useViewPreference('viewMode.wishes', 'compact');

  // Use React Query to fetch wishes data with loading state
  const { data: wishesData, isLoading } = useWishesQuery();
  const currentWishes: Wish[] = wishesData?.items || [];

  // Use the filter hook with live data
  const {
    filterState,
    setWishLevelSelection,
    setPriceRange,
    setSortOption,
    resetFilters,
    filteredWishes,
    activeFilterCount,
    maxPrice,
  } = useWishFilters(currentWishes);

  // Memoize filtered wishes to avoid unnecessary re-renders
  const memoizedFilteredWishes = useMemo(() => filteredWishes, [filteredWishes]);

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => !prev);
    if (isSelectionMode) {
      setSelectedWishIds(new Set());
    }
  }, [isSelectionMode]);

  const selectAllWishes = useCallback(() => {
    const allWishIds = new Set(memoizedFilteredWishes.map((w) => w.id));
    setSelectedWishIds(allWishIds);
  }, [memoizedFilteredWishes]);

  const clearSelection = useCallback(() => {
    setSelectedWishIds(new Set());
  }, []);

  const clearFilters = useCallback(() => {
    resetFilters();
    toast.success('Filters cleared');
  }, [resetFilters]);

  const handleEditWish = useCallback((wish: Wish) => {
    setEditingWish(wish);
    setShowEditWishDialog(true);
  }, []);

  const handleDeleteWish = useCallback((wish: Wish) => {
    setDeletingWish(wish);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!deletingWish) {
      return;
    }

    wishesApi
      .deleteWish(deletingWish.id)
      .then(() => {
        toast.success(`"${deletingWish.title}" deleted`);
        void queryClient.invalidateQueries({ queryKey: ['wishes'] });
        setDeletingWish(null);
      })
      .catch(() => {
        toast.error('Failed to delete wish');
      });
  }, [deletingWish, queryClient]);

  // Handle wish selection for bulk actions
  const toggleWishSelection = useCallback((wishId: string) => {
    setSelectedWishIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(wishId)) {
        newSet.delete(wishId);
      } else {
        newSet.add(wishId);
      }
      return newSet;
    });
  }, []);

  // Handle modal close with unsaved changes
  const addWishCloseHandler = usePreventUnsavedClose(isAddWishFormDirty, () =>
    setShowAddWishDialog(false)
  );
  const editWishCloseHandler = usePreventUnsavedClose(isEditWishFormDirty, () =>
    setShowEditWishDialog(false)
  );

  return (
    <>
      <div className="relative">
        {/* Mobile Top Menu Row - Sticky */}
        <div className="sticky top-0 z-30 flex items-center justify-between border-b bg-background px-4 py-1.5 md:hidden">
          {/* Left side */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileFilterOpen(true)}
              aria-label="Filter wishes"
            >
              <Filter className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSelectionMode}
              aria-label={isSelectionMode ? "Exit selection mode" : "Select wishes"}
            >
              <CheckSquare className={cn("h-4 w-4", isSelectionMode && "text-primary")} />
            </Button>
          </div>

          {/* Right side - View Toggle */}
          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>

        {/* Desktop Filter Panel - Sliding Overlay */}
        <div className="hidden lg:block">
          <div
            className={cn(
              'fixed left-0 top-16 z-30 h-[calc(100vh-4rem)] w-80 transform border-r bg-background shadow-xl transition-transform duration-300 ease-in-out',
              isDesktopFilterOpen ? 'translate-x-0' : '-translate-x-full'
            )}
          >
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b p-4">
                <h2 className="text-lg font-semibold">Filters</h2>
                <Button variant="ghost" size="icon" onClick={() => setIsDesktopFilterOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <WishFilterPanel
                  wishLevelSelection={filterState.wishLevel}
                  priceRange={filterState.cost}
                  maxPrice={maxPrice}
                  sortOption={filterState.sort}
                  onWishLevelChange={setWishLevelSelection}
                  onPriceChange={setPriceRange}
                  onSortChange={setSortOption}
                  onClearAll={clearFilters}
                  activeFilterCount={activeFilterCount}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area - Shifts when filter panel is open */}
        <div
          className={cn(
            'transition-all duration-300 ease-in-out',
            isDesktopFilterOpen && 'lg:ml-80'
          )}
        >
          <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">My Wishes</h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Create and manage your wishlist items
              </p>
            </div>
            {/* Add Wish Button - Desktop Only */}
            <ThemeButton onClick={() => setShowAddWishDialog(true)} className="hidden sm:flex">
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Wish
            </ThemeButton>
          </div>

          {/* Controls Bar - Desktop Only */}
          <div className="hidden md:block">
            <WishControlsBar
              isHydrated={isHydrated}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              filterCount={activeFilterCount}
              onToggleFilters={() => {
                const isMobile = window.innerWidth < 1024;
                if (isMobile) {
                  setIsMobileFilterOpen(!isMobileFilterOpen);
                } else {
                  setIsDesktopFilterOpen(!isDesktopFilterOpen);
                }
              }}
              isFiltersOpen={isDesktopFilterOpen || isMobileFilterOpen}
              showSelectButton={true}
              isSelectionMode={isSelectionMode}
              onToggleSelection={toggleSelectionMode}
              showMobileActions={true}
              onAddAction={() => setShowAddWishDialog(true)}
            />
          </div>

          {/* Content with bottom padding for mobile */}
          <div className="pb-24 md:pb-0">
            {/* Loading Skeleton */}
            {isLoading && (
              <WishesLoadingSkeleton
                variant={viewMode}
                count={8}
              />
            )}

            {/* Wishes Display or Empty State */}
            {!isLoading && (
              filteredWishes.length === 0 ? (
                <EmptyStateWithFilters
                  hasActiveFilters={activeFilterCount > 0}
                  totalWishCount={currentWishes.length}
                  onClearFilters={resetFilters}
                />
              ) : (
                <WishesDisplay
                  wishes={filteredWishes}
                  isSelectionMode={isSelectionMode}
                  selectedWishIds={selectedWishIds}
                  onToggleSelection={toggleWishSelection}
                  onEdit={handleEditWish}
                  onDelete={handleDeleteWish}
                  showAddToList={false}
                  viewMode={viewMode}
                />
              )
            )}
          </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Bar - Fixed (only when not in selection mode) */}
      {!isSelectionMode && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background shadow-md md:hidden">
          <div className="flex items-center justify-end px-4 py-1.5">
            <Button
              onClick={() => setShowAddWishDialog(true)}
              size="lg"
              className="min-h-[44px] min-w-[110px]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Wish
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Actions Bar - Fixed to Bottom on All Screen Sizes */}
      {isSelectionMode && selectedWishIds.size > 0 && (
        <BulkActionsBar
          selectedCount={selectedWishIds.size}
          selectedWishIds={Array.from(selectedWishIds)}
          onSelectAll={selectAllWishes}
          onClearSelection={clearSelection}
          onClose={toggleSelectionMode}
        />
      )}

      {/* Mobile Filter Sheet */}
      <MobileFilterSheet
        open={isMobileFilterOpen}
        onOpenChange={setIsMobileFilterOpen}
        wishLevelSelection={filterState.wishLevel}
        priceRange={filterState.cost}
        maxPrice={maxPrice}
        sortOption={filterState.sort}
        onWishLevelChange={setWishLevelSelection}
        onPriceChange={setPriceRange}
        onSortChange={setSortOption}
        onClearAll={clearFilters}
        activeFilterCount={activeFilterCount}
      />

      {/* Add Wish Dialog */}
      <Dialog open={showAddWishDialog} onOpenChange={addWishCloseHandler.handleClose}>
        <DialogContent className="max-w-2xl" {...addWishCloseHandler.dialogProps}>
          <DialogHeader>
            <DialogTitle>Add New Wish</DialogTitle>
            <DialogDescription>
              Create a new wish and optionally add it to your lists.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <WishForm
              onSuccess={() => {
                setShowAddWishDialog(false);
                setIsAddWishFormDirty(false);

                // Invalidate the wishes query to trigger a refetch
                void queryClient.invalidateQueries({ queryKey: ['wishes'] });
              }}
              onCancel={() => {
                setShowAddWishDialog(false);
                setIsAddWishFormDirty(false);
              }}
              showListSelection={true}
              onDirtyStateChange={setIsAddWishFormDirty}
            />
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Edit Wish Dialog */}
      {editingWish && (
        <Dialog open={showEditWishDialog} onOpenChange={editWishCloseHandler.handleClose}>
          <DialogContent className="max-w-2xl" {...editWishCloseHandler.dialogProps}>
            <DialogHeader>
              <DialogTitle>Edit Wish</DialogTitle>
              <DialogDescription>Update your wish details.</DialogDescription>
            </DialogHeader>
            <DialogBody>
              <WishForm
                wish={editingWish}
                onSuccess={() => {
                  setShowEditWishDialog(false);
                  setEditingWish(null);
                  setIsEditWishFormDirty(false);

                  // Invalidate the wishes query to trigger a refetch
                  void queryClient.invalidateQueries({ queryKey: ['wishes'] });
                }}
                onCancel={() => {
                  setShowEditWishDialog(false);
                  setEditingWish(null);
                  setIsEditWishFormDirty(false);
                }}
                onDirtyStateChange={setIsEditWishFormDirty}
              />
            </DialogBody>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingWish && (
        <ConfirmDialog
          open={!!deletingWish}
          onOpenChange={(open) => !open && setDeletingWish(null)}
          title="Delete wish?"
          description={`Are you sure you want to delete "${deletingWish.title}"? This action cannot be undone.`}
          confirmText="Delete"
          onConfirm={confirmDelete}
          variant="destructive"
        />
      )}
    </>
  );
}
