'use client';

import { useState, useCallback, useMemo } from 'react';
import { Filter, CheckSquare, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useViewPreference } from '@/lib/utils/view-preferences';
import { Button } from '@/components/ui/button';
import { ViewToggle } from '@/components/ui/view-toggle';
import { ReservationFilterPanel } from './filters/ReservationFilterPanel';
import { MobileReservationFilterSheet } from './filters/MobileReservationFilterSheet';
import { ReservationsDisplay } from './reservations-display';
import { EmptyState } from './empty-state';
import { ReservationSkeleton } from './reservation-skeleton';
import { BulkActionsBar } from './bulk-actions-bar';
import { BulkActionDialogs } from './bulk-action-dialogs';
import { useReservationFilters, useReservationsQuery } from './hooks/useReservationFilters';
import type { ReservationWithWish } from '@/lib/validators/api-responses/reservations';
import { reservationsApi } from '@/lib/api/reservations';
import { useQueryClient } from '@tanstack/react-query';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { WishDetailsModal } from './wish-details-modal';

export function ReservationsView() {
  const queryClient = useQueryClient();

  // State management
  const [selectedReservationIds, setSelectedReservationIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isDesktopFilterOpen, setIsDesktopFilterOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [viewMode, setViewMode, _isHydrated] = useViewPreference('viewMode.reservations', 'grid');
  const [actioningReservation, setActioningReservation] = useState<ReservationWithWish | null>(
    null
  );
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [showBulkCancelDialog, setShowBulkCancelDialog] = useState(false);
  const [showBulkPurchaseDialog, setShowBulkPurchaseDialog] = useState(false);
  const [showUnmarkDialog, setShowUnmarkDialog] = useState(false);
  const [_showBulkUnmarkDialog, setShowBulkUnmarkDialog] = useState(false);
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [isWishModalOpen, setIsWishModalOpen] = useState(false);

  // Data fetching
  const { data: reservations, isLoading } = useReservationsQuery();
  const currentReservations = reservations || [];

  // Filtering
  const {
    filterState,
    setDateFilter,
    setOwnerFilter,
    setPurchaseStatus,
    setSortOption,
    setSearchQuery,
    resetFilters,
    filteredReservations,
    activeFilterCount,
    uniqueOwners,
  } = useReservationFilters(currentReservations);

  // Memoize filtered reservations to avoid unnecessary re-renders
  const memoizedFilteredReservations = useMemo(() => filteredReservations, [filteredReservations]);

  // Selection handlers
  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => !prev);
    if (isSelectionMode) {
      setSelectedReservationIds(new Set());
    }
  }, [isSelectionMode]);

  const toggleReservationSelection = useCallback((reservationId: string) => {
    setSelectedReservationIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(reservationId)) {
        newSet.delete(reservationId);
      } else {
        newSet.add(reservationId);
      }
      return newSet;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedReservationIds(new Set());
  }, []);

  const selectAll = useCallback(() => {
    const allIds = new Set(filteredReservations.map((r) => r.id));
    setSelectedReservationIds(allIds);
  }, [filteredReservations]);

  // Action handlers
  const handleCancelClick = useCallback((reservation: ReservationWithWish) => {
    setActioningReservation(reservation);
    setShowCancelDialog(true);
  }, []);

  const handleMarkPurchasedClick = useCallback((reservation: ReservationWithWish) => {
    setActioningReservation(reservation);
    setShowPurchaseDialog(true);
  }, []);

  const confirmCancel = useCallback(() => {
    if (!actioningReservation) {
      return;
    }

    reservationsApi
      .removeReservation(actioningReservation.id)
      .then(() => {
        toast.success('Reservation cancelled');
        void queryClient.invalidateQueries({ queryKey: ['reservations'] });
        setShowCancelDialog(false);
        setActioningReservation(null);
      })
      .catch(() => {
        toast.error('Failed to cancel reservation');
      });
  }, [actioningReservation, queryClient]);

  const confirmMarkPurchased = useCallback(() => {
    if (!actioningReservation) {
      return;
    }

    reservationsApi
      .markAsPurchased(actioningReservation.id, new Date())
      .then(() => {
        toast.success('Marked as purchased');
        void queryClient.invalidateQueries({ queryKey: ['reservations'] });
        setShowPurchaseDialog(false);
        setActioningReservation(null);
      })
      .catch(() => {
        toast.error('Failed to mark as purchased');
      });
  }, [actioningReservation, queryClient]);

  const handleUnmarkPurchasedClick = useCallback((reservation: ReservationWithWish) => {
    setActioningReservation(reservation);
    setShowUnmarkDialog(true);
  }, []);

  const confirmUnmark = useCallback(() => {
    if (!actioningReservation) {
      return;
    }

    reservationsApi
      .unmarkAsPurchased(actioningReservation.id)
      .then(() => {
        toast.success('Unmarked as purchased');
        void queryClient.invalidateQueries({ queryKey: ['reservations'] });
        setShowUnmarkDialog(false);
        setActioningReservation(null);
      })
      .catch(() => {
        toast.error('Failed to un-mark');
      });
  }, [actioningReservation, queryClient]);

  // Bulk action handlers
  const handleBulkCancel = useCallback(() => {
    const selectedIds = Array.from(selectedReservationIds);

    reservationsApi
      .bulkCancel(selectedIds)
      .then((result) => {
        if (result.success) {
          toast.success(`Cancelled ${selectedIds.length} reservation(s)`);
        } else {
          toast.warning(result.message);
        }
        void queryClient.invalidateQueries({ queryKey: ['reservations'] });
        setShowBulkCancelDialog(false);
        setSelectedReservationIds(new Set());
      })
      .catch(() => {
        toast.error('Failed to cancel reservations');
      });
  }, [selectedReservationIds, queryClient]);

  const handleBulkMarkPurchased = useCallback(() => {
    const selectedIds = Array.from(selectedReservationIds);

    reservationsApi
      .bulkMarkAsPurchased(selectedIds, new Date())
      .then((result) => {
        if (result.success) {
          toast.success(`Marked ${selectedIds.length} reservation(s) as purchased`);
        } else {
          toast.warning(result.message);
        }
        void queryClient.invalidateQueries({ queryKey: ['reservations'] });
        setShowBulkPurchaseDialog(false);
        setSelectedReservationIds(new Set());
      })
      .catch(() => {
        toast.error('Failed to mark as purchased');
      });
  }, [selectedReservationIds, queryClient]);

  const _handleBulkUnmark = useCallback(() => {
    const selectedIds = Array.from(selectedReservationIds);

    reservationsApi
      .bulkUnmarkPurchased(selectedIds)
      .then((result) => {
        if (result.success) {
          toast.success(`Unmarked ${selectedIds.length} reservation(s)`);
        } else {
          toast.warning(result.message);
        }
        void queryClient.invalidateQueries({ queryKey: ['reservations'] });
        setShowBulkUnmarkDialog(false);
        setSelectedReservationIds(new Set());
      })
      .catch(() => {
        toast.error('Failed to un-mark reservations');
      });
  }, [selectedReservationIds, queryClient]);

  // Modal handlers
  const handleCardClick = useCallback(
    (reservationId: string) => {
      if (!isSelectionMode) {
        setSelectedReservationId(reservationId);
        setIsWishModalOpen(true);
      }
    },
    [isSelectionMode]
  );

  const handleCancelFromModal = useCallback(async () => {
    if (!selectedReservationId) {
      return;
    }

    try {
      await reservationsApi.removeReservation(selectedReservationId);
      toast.success('Reservation cancelled');
      void queryClient.invalidateQueries({ queryKey: ['reservations'] });
      setIsWishModalOpen(false);
      setSelectedReservationId(null);
    } catch (error) {
      toast.error('Failed to cancel reservation');
      throw error;
    }
  }, [selectedReservationId, queryClient]);

  const handleMarkPurchasedFromModal = useCallback(async () => {
    if (!selectedReservationId) {
      return;
    }

    try {
      await reservationsApi.markAsPurchased(selectedReservationId, new Date());
      toast.success('Marked as purchased');
      void queryClient.invalidateQueries({ queryKey: ['reservations'] });
      setIsWishModalOpen(false);
      setSelectedReservationId(null);
    } catch (error) {
      toast.error('Failed to mark as purchased');
      throw error;
    }
  }, [selectedReservationId, queryClient]);

  const handleUnmarkFromModal = useCallback(async () => {
    if (!selectedReservationId) {
      return;
    }

    try {
      await reservationsApi.unmarkAsPurchased(selectedReservationId);
      toast.success('Unmarked as purchased');
      void queryClient.invalidateQueries({ queryKey: ['reservations'] });
      setIsWishModalOpen(false);
      setSelectedReservationId(null);
    } catch (error) {
      toast.error('Failed to un-mark');
      throw error;
    }
  }, [selectedReservationId, queryClient]);

  return (
    <>
      <div className="relative min-h-screen">
        {/* Mobile top menu - Sticky */}
        <div className="sticky top-0 z-30 flex items-center justify-between border-b bg-background px-4 py-1.5 md:hidden">
          {/* Left side */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileFilterOpen(true)}
              aria-label="Filter reservations"
            >
              <Filter className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSelectionMode}
              aria-label={isSelectionMode ? 'Exit selection mode' : 'Select reservations'}
            >
              <CheckSquare className={cn('h-4 w-4', isSelectionMode && 'text-primary')} />
            </Button>
          </div>

          {/* Right side - View Toggle */}
          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>

        {/* Desktop filter panel - Sliding Overlay */}
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
                <ReservationFilterPanel
                  open={isDesktopFilterOpen}
                  onOpenChange={setIsDesktopFilterOpen}
                  filterState={filterState}
                  uniqueOwners={uniqueOwners}
                  setDateFilter={setDateFilter}
                  setOwnerFilter={setOwnerFilter}
                  setPurchaseStatus={setPurchaseStatus}
                  setSortOption={setSortOption}
                  setSearchQuery={setSearchQuery}
                  resetFilters={resetFilters}
                  activeFilterCount={activeFilterCount}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main content area - Shifts when filter panel is open */}
        <div
          className={cn(
            'transition-all duration-300 ease-in-out',
            isDesktopFilterOpen && 'lg:ml-80'
          )}
        >
          <div className="container mx-auto px-4 py-8 pb-24 md:pb-0">
            {/* Desktop header */}
            <div className="mb-8 hidden flex-col gap-4 sm:flex sm:flex-row sm:items-center sm:justify-between md:flex">
              <div>
                <h1 className="text-2xl font-bold sm:text-3xl">My Reservations</h1>
                <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                  Track gifts you&apos;ve reserved for others
                </p>
              </div>
            </div>

            {/* Desktop controls bar */}
            <div className="mb-6 hidden items-center justify-between md:flex">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDesktopFilterOpen(!isDesktopFilterOpen)}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
                <Button
                  variant={isSelectionMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={toggleSelectionMode}
                >
                  <CheckSquare className="mr-2 h-4 w-4" />
                  Select
                </Button>
              </div>
              <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
            </div>

            {/* Content */}
            {isLoading ? (
              <div
                className={cn(
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                    : 'flex flex-col gap-2'
                )}
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <ReservationSkeleton key={i} variant={viewMode} />
                ))}
              </div>
            ) : filteredReservations.length === 0 ? (
              <EmptyState hasActiveFilters={activeFilterCount > 0} />
            ) : (
              <ReservationsDisplay
                reservations={memoizedFilteredReservations}
                viewMode={viewMode}
                selectedIds={selectedReservationIds}
                isSelectionMode={isSelectionMode}
                onToggleSelect={toggleReservationSelection}
                onCancel={handleCancelClick}
                onMarkPurchased={handleMarkPurchasedClick}
                onUnmarkPurchased={handleUnmarkPurchasedClick}
                onCardClick={handleCardClick}
              />
            )}
          </div>
        </div>

        {/* Mobile filter sheet */}
        <MobileReservationFilterSheet
          open={isMobileFilterOpen}
          onOpenChange={setIsMobileFilterOpen}
          filterState={filterState}
          uniqueOwners={uniqueOwners}
          setDateFilter={setDateFilter}
          setOwnerFilter={setOwnerFilter}
          setPurchaseStatus={setPurchaseStatus}
          setSortOption={setSortOption}
          setSearchQuery={setSearchQuery}
          resetFilters={resetFilters}
          activeFilterCount={activeFilterCount}
        />

        {/* Bulk actions bar */}
        {isSelectionMode && selectedReservationIds.size > 0 && (
          <BulkActionsBar
            selectedCount={selectedReservationIds.size}
            onBulkCancel={() => setShowBulkCancelDialog(true)}
            onBulkMarkPurchased={() => setShowBulkPurchaseDialog(true)}
            onSelectAll={selectAll}
            onClearSelection={clearSelection}
            onClose={toggleSelectionMode}
          />
        )}

        {/* Single reservation cancel dialog */}
        {actioningReservation && (
          <ConfirmDialog
            open={showCancelDialog}
            onOpenChange={(open) => {
              setShowCancelDialog(open);
              if (!open) {
                setActioningReservation(null);
              }
            }}
            title="Cancel reservation?"
            description={`Are you sure you want to cancel your reservation for "${actioningReservation.wish.title}"? This item will become available for others to reserve.`}
            confirmText="Cancel Reservation"
            onConfirm={confirmCancel}
            variant="destructive"
          />
        )}

        {/* Single reservation mark purchased dialog */}
        {actioningReservation && (
          <ConfirmDialog
            open={showPurchaseDialog}
            onOpenChange={(open) => {
              setShowPurchaseDialog(open);
              if (!open) {
                setActioningReservation(null);
              }
            }}
            title="Mark as purchased?"
            description={`Mark "${actioningReservation.wish.title}" as purchased? This will move it to your purchased items section.`}
            confirmText="Mark as Purchased"
            onConfirm={confirmMarkPurchased}
            variant="default"
          />
        )}

        {/* Single reservation un-mark dialog */}
        {actioningReservation && (
          <ConfirmDialog
            open={showUnmarkDialog}
            onOpenChange={(open) => {
              setShowUnmarkDialog(open);
              if (!open) {
                setActioningReservation(null);
              }
            }}
            title="Un-mark as purchased?"
            description={`Un-mark "${actioningReservation.wish.title}" as purchased? This will move it back to your active reservations.`}
            confirmText="Un-mark"
            onConfirm={confirmUnmark}
            variant="default"
          />
        )}

        {/* Bulk action dialogs */}
        <BulkActionDialogs
          cancelDialogOpen={showBulkCancelDialog}
          purchaseDialogOpen={showBulkPurchaseDialog}
          selectedCount={selectedReservationIds.size}
          onCancelConfirm={handleBulkCancel}
          onPurchaseConfirm={handleBulkMarkPurchased}
          onCancel={() => {
            setShowBulkCancelDialog(false);
            setShowBulkPurchaseDialog(false);
          }}
        />

        {/* Wish details modal */}
        <WishDetailsModal
          reservation={
            selectedReservationId
              ? (currentReservations.find((r) => r.id === selectedReservationId) ?? null)
              : null
          }
          open={isWishModalOpen}
          onOpenChange={setIsWishModalOpen}
          onCancel={handleCancelFromModal}
          onMarkPurchased={handleMarkPurchasedFromModal}
          onUnmark={handleUnmarkFromModal}
        />
      </div>
    </>
  );
}
