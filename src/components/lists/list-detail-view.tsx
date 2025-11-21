'use client';

import { useState, useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { X, ArrowLeft, Filter, CheckSquare, Share2, Pencil, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ViewToggle } from '@/components/ui/view-toggle';

import { AddWishTabDialog } from '@/components/lists/add-wish-tab-dialog';
import { CollapsibleGiftCardSection } from '@/components/lists/CollapsibleGiftCardSection';
import { useManageGiftCardsDialog } from '@/components/lists/GiftCardSection';
import type { GiftCard } from '@/components/lists/hooks/useManageGiftCardsDialog';
import { ListHeader } from '@/components/lists/list-header';
import { ListDetailTopNav } from '@/components/lists/list-detail-top-nav';
import { ListDetailWishesSection } from '@/components/lists/list-detail-wishes-section';
import { ListForm } from '@/components/lists/list-form';
import { ListSharingDialog } from '@/components/lists/list-sharing-dialog';
import { Button } from '@/components/ui/button';
import { Button as ThemeButtonAlias } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { BulkActionsBar } from '@/components/wishes/bulk-actions-bar';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { WishForm } from '@/components/wishes/wish-form';
import { WishControlsBar } from '@/components/wishes/wish-controls-bar';
import { useViewPreference } from '@/lib/utils/view-preferences';
import { WishFilterPanel } from '@/components/wishes/filters/WishFilterPanel';
import { MobileFilterSheet } from '@/components/wishes/filters/MobileFilterSheet';
import { useWishFilters } from '@/components/wishes/hooks/useWishFilters';
import { listsApi } from '@/lib/api/lists';
import { reservationsApi } from '@/lib/api/reservations';
import { wishesApi } from '@/lib/api/wishes';
import type { ListWithDetails as ApiListWithDetails } from '@/lib/validators/api-responses/lists';
import type { ListWithDetails as ServiceListWithDetails } from '@/lib/services/list-service';
import {
  useEditListDialog,
  useAddWishDialog,
  useEditWishDialog,
  useSharingDialog,
  useRemoveWishDialog,
} from '@/components/lists/hooks/useListDialogs';

interface ListDetailViewProps {
  initialList: ServiceListWithDetails | null;
  listId: string;
}

export function ListDetailView({ initialList, listId }: ListDetailViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: session } = useSession();

  // Dialog management using custom hooks
  const editListDialog = useEditListDialog();
  const addWishDialog = useAddWishDialog();
  const editWishDialog = useEditWishDialog();
  const sharingDialog = useSharingDialog();
  const removeWishDialog = useRemoveWishDialog();

  // Filter panel states
  const [isDesktopFilterOpen, setIsDesktopFilterOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // View mode state - using standardized modes (list or grid)
  const [viewMode, setViewMode, isHydrated] = useViewPreference('viewMode.listDetail', 'grid');

  // Selection mode state
  const [selectedWishIds, setSelectedWishIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Convert server-side list to API format for React Query
  const convertedInitialList: ApiListWithDetails | undefined = initialList
    ? ({
        ...initialList,
        visibility: initialList.visibility as 'public' | 'private' | 'password',
        password: initialList.password ?? null,
        createdAt:
          initialList.createdAt instanceof Date
            ? initialList.createdAt.toISOString()
            : (initialList.createdAt as string),
        updatedAt:
          initialList.updatedAt instanceof Date
            ? initialList.updatedAt.toISOString()
            : (initialList.updatedAt as string),
        wishes: initialList.wishes?.map((lw) => ({
          ...lw,
          addedAt: lw.addedAt instanceof Date ? lw.addedAt.toISOString() : (lw.addedAt as string),
          wish: {
            ...lw.wish,
            createdAt:
              lw.wish.createdAt instanceof Date
                ? lw.wish.createdAt.toISOString()
                : (lw.wish.createdAt as string),
            updatedAt:
              lw.wish.updatedAt instanceof Date
                ? lw.wish.updatedAt.toISOString()
                : (lw.wish.updatedAt as string),
          },
        })),
      } as ApiListWithDetails)
    : undefined;

  // Use React Query with initial data from server
  const { data: list } = useQuery({
    queryKey: ['lists', listId],
    queryFn: () => listsApi.getList(listId),
    initialData: convertedInitialList,
    refetchOnMount: true,
    refetchOnWindowFocus: false, // Prevent refetch on tab switch - fixes gift card dialog reset bug
  });

  // Fetch reservation data (privacy-aware: owners see isReserved: false)
  const { data: reservations } = useQuery({
    queryKey: ['list-reservations', listId],
    queryFn: () => reservationsApi.getListReservations(listId),
    enabled: !!list,
  });

  // Fetch all user's wishes for the "Add Existing" tab
  const { data: allUserWishesData } = useQuery({
    queryKey: ['wishes'],
    queryFn: () => wishesApi.getWishes(),
    enabled: !!list?.isOwner, // Only fetch if user is the list owner
  });

  // Filter wishes for "Add Existing" dialog
  const availableWishes = useMemo(() => {
    if (!allUserWishesData?.items || !list?.wishes) {
      return [];
    }
    const currentWishIds = new Set(list.wishes.map((lw) => lw.wish.id));
    return allUserWishesData.items.filter((w) => !currentWishIds.has(w.id));
  }, [allUserWishesData?.items, list?.wishes]);

  const alreadyAddedWishes = useMemo(() => {
    if (!allUserWishesData?.items || !list?.wishes) {
      return [];
    }
    const currentWishIds = new Set(list.wishes.map((lw) => lw.wish.id));
    return allUserWishesData.items.filter((w) => currentWishIds.has(w.id));
  }, [allUserWishesData?.items, list?.wishes]);

  // Memoize giftCards to prevent creating new array references on every render
  const giftCards = useMemo(() => {
    if (!list?.giftCardPreferences) {
      return [];
    }
    return typeof list.giftCardPreferences === 'string'
      ? (JSON.parse(list.giftCardPreferences || '[]') as GiftCard[])
      : (list.giftCardPreferences as GiftCard[] | undefined) || [];
  }, [list?.giftCardPreferences]);

  // Gift card manage dialog
  const manageGiftCardsDialog = useManageGiftCardsDialog(giftCards);

  // Helper to get the correct public URL (vanity URL if available, otherwise standard share token URL)
  const getPublicUrl = useCallback(() => {
    if (!list?.shareToken) {
      return null;
    }

    const username = session?.user?.username;
    const canUseVanityUrls = session?.user?.canUseVanityUrls ?? false;

    // Use vanity URL if user has vanity URLs enabled, has a username, and list has a slug
    if (canUseVanityUrls && username && list.slug) {
      return `/${username}/${list.slug}`;
    }

    // Fallback to standard share token URL
    return `/share/${list.shareToken}`;
  }, [list?.shareToken, list?.slug, session?.user?.username, session?.user?.canUseVanityUrls]);

  // Convert reservations to array of wish IDs that are reserved
  const reservedWishIds = useMemo(() => {
    if (!reservations) {
      return [];
    }
    const reserved = Object.entries(reservations)
      .filter(([_, res]) => res.isReserved)
      .map(([wishId]) => wishId);
    return reserved;
  }, [reservations]);

  // Extract wishes from list for filtering
  const wishes =
    list?.wishes?.map((lw) => ({
      ...lw.wish,
      isOwner: list.isOwner,
    })) || [];

  // Use the filter hook with the wishes
  const {
    filterState,
    setWishLevelSelection,
    setPriceRange,
    setSortOption,
    resetFilters,
    filteredWishes,
    activeFilterCount,
    maxPrice,
  } = useWishFilters(wishes);

  // Remove wish from list mutation
  const removeWishMutation = useMutation({
    mutationFn: (wishId: string) => listsApi.removeWishFromList(listId, { wishId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['lists', listId] });
      toast({
        title: 'Wish removed',
        description: 'The wish has been removed from this list',
      });
      removeWishDialog.close();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to remove wish from list',
        variant: 'destructive',
      });
    },
  });

  const confirmRemoveWish = () => {
    if (removeWishDialog.wishToRemove) {
      removeWishMutation.mutate(removeWishDialog.wishToRemove.id);
    }
  };

  const clearFilters = useCallback(() => {
    resetFilters();
    toast({
      title: 'Filters cleared',
    });
  }, [resetFilters, toast]);

  // Selection mode handlers
  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => !prev);
    if (isSelectionMode) {
      setSelectedWishIds(new Set());
    }
  }, [isSelectionMode]);

  const selectAllWishes = useCallback(() => {
    const allWishIds = new Set(filteredWishes.map((w) => w.id));
    setSelectedWishIds(allWishIds);
  }, [filteredWishes]);

  const clearSelection = useCallback(() => {
    setSelectedWishIds(new Set());
  }, []);

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

  // Calculate if all visible wishes are selected
  const allSelected = useMemo(() => {
    if (filteredWishes.length === 0) {
      return false;
    }
    return filteredWishes.every((wish) => selectedWishIds.has(wish.id));
  }, [filteredWishes, selectedWishIds]);

  // Handle select all toggle
  const handleSelectAllToggle = useCallback(() => {
    if (allSelected) {
      clearSelection();
    } else {
      selectAllWishes();
    }
  }, [allSelected, clearSelection, selectAllWishes]);

  if (!list) {
    return (
      <div className="text-center">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">List not found</h1>
        <p className="mb-6 text-gray-600">
          The list you{'"'}re looking for doesn{'"'}t exist or you don{'"'}t have access to it.
        </p>
        <Button onClick={() => router.push('/lists')}>Back to Lists</Button>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Filter Sheet */}
      <div className="md:hidden">
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
      </div>

      {/* Desktop Layout with Sliding Filter Panel */}
      <div className="relative hidden md:block">
        {/* Filter Panel - Sliding Overlay */}
        <div
          className={cn(
            'fixed left-0 top-16 z-30 h-[calc(100vh-4rem)] w-80 transform border-r bg-background shadow-xl transition-transform duration-300 ease-in-out',
            isDesktopFilterOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex h-full flex-col">
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold">Filters & Sort</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsDesktopFilterOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Filter Panel Content */}
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

        {/* Main Content Area - Shifts when filter panel is open */}
        <div
          className={cn(
            'transition-all duration-300 ease-in-out',
            isDesktopFilterOpen ? 'ml-80' : 'ml-0',
            // Add bottom padding when bulk actions bar is visible
            isSelectionMode && selectedWishIds.size > 0 && 'pb-24'
          )}
        >
          {/* Top Navigation Bar */}
          <ListDetailTopNav
            variant="desktop"
            isOwner={list.isOwner}
            list={list}
            isSelectionMode={isSelectionMode}
            onBack={() => router.push('/lists')}
            onToggleSelection={toggleSelectionMode}
            onAddWish={() => addWishDialog.open()}
            onEditList={() => editListDialog.open()}
            onShare={() => sharingDialog.open()}
            onPublicView={
              getPublicUrl()
                ? () => {
                    const url = getPublicUrl();
                    if (url) {
                      window.open(url, '_blank');
                    }
                  }
                : undefined
            }
          />

          {/* List Header - Centered */}
          <ListHeader
            name={list.name}
            description={list.description}
            visibility={list.visibility}
            wishCount={list._count.wishes}
            shareToken={list.shareToken}
          />

          {/* Controls Bar - Filter button and View toggle */}
          <div className="pt-2">
            <WishControlsBar
              isHydrated={isHydrated}
              onToggleFilters={() => setIsDesktopFilterOpen(!isDesktopFilterOpen)}
              isFiltersOpen={isDesktopFilterOpen}
              filterCount={activeFilterCount}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              showSelectButton={!!list.isOwner}
              isSelectionMode={isSelectionMode}
              onToggleSelection={toggleSelectionMode}
            />
          </div>

          {/* Gift Cards Section */}
          <div className="pt-4">
            <CollapsibleGiftCardSection
              listId={list.id}
              giftCards={giftCards}
              canEdit={list.canEdit ?? false}
              onUpdate={() => {
                void queryClient.invalidateQueries({ queryKey: ['lists', listId] });
              }}
              onManage={list.canEdit ? () => manageGiftCardsDialog.open() : undefined}
              externalManageDialog={manageGiftCardsDialog}
              infoTooltip={
                list.canEdit
                  ? "Gift cards you'd appreciate. Manage them to keep your preferences up to date."
                  : 'Gift cards the list owner would appreciate.'
              }
            />
          </div>

          {/* Desktop Wishes Display */}
          <div className="pt-4">
            <ListDetailWishesSection
              wishes={filteredWishes}
              viewMode={viewMode}
              isOwner={!!list.isOwner}
              isSelectionMode={!!(isSelectionMode && list.isOwner)}
              selectedWishIds={selectedWishIds}
              reservedWishIds={reservedWishIds}
              onEdit={editWishDialog.open}
              onDelete={removeWishDialog.open}
              onToggleSelection={toggleWishSelection}
            />
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden">
        {/* Mobile Top Menu Row - Sticky */}
        <div className="sticky top-0 z-30 flex items-center justify-between border-b bg-background px-4 py-1.5 md:hidden">
          {/* Left side - Back + Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              aria-label="Go back"
              title="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileFilterOpen(true)}
              aria-label="Filter wishes"
            >
              <Filter className="h-4 w-4" />
            </Button>
            {list.isOwner && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSelectionMode}
                aria-label={isSelectionMode ? 'Exit selection mode' : 'Select wishes'}
              >
                <CheckSquare className={cn('h-4 w-4', isSelectionMode && 'text-primary')} />
              </Button>
            )}
          </div>

          {/* Right side - View Toggle */}
          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>

        {/* Main Content with Bottom Padding */}
        <div className="pb-24 md:pb-0">
          {/* List Header */}
          <ListHeader
            name={list.name}
            description={list.description}
            visibility={list.visibility}
            wishCount={list._count.wishes}
            shareToken={list.shareToken}
            className="mb-2 sm:mb-4"
          />

          {/* Gift Cards Section - Mobile */}
          <div className="pt-4">
            <CollapsibleGiftCardSection
              listId={list.id}
              giftCards={giftCards}
              canEdit={list.canEdit ?? false}
              onUpdate={() => {
                void queryClient.invalidateQueries({ queryKey: ['lists', listId] });
              }}
              onManage={list.canEdit ? () => manageGiftCardsDialog.open() : undefined}
              externalManageDialog={manageGiftCardsDialog}
              infoTooltip={
                list.canEdit
                  ? "Gift cards you'd appreciate. Manage them to keep your preferences up to date."
                  : 'Gift cards the list owner would appreciate.'
              }
            />
          </div>

          {/* Mobile Selection Controls */}
          {isSelectionMode && list.isOwner && (
            <div className="mb-4 flex items-center justify-between rounded-lg bg-muted px-3 py-2">
              <span className="text-sm font-medium">{selectedWishIds.size} selected</span>
              <div className="flex gap-2">
                <ThemeButtonAlias variant="ghost" size="sm" onClick={handleSelectAllToggle}>
                  {allSelected ? 'Deselect All' : 'Select All'}
                </ThemeButtonAlias>
              </div>
            </div>
          )}

          {/* Mobile Wishes Display */}
          <div className="pt-4">
            <ListDetailWishesSection
              wishes={filteredWishes}
              viewMode={viewMode}
              isOwner={!!list.isOwner}
              isSelectionMode={!!(isSelectionMode && list.isOwner)}
              selectedWishIds={selectedWishIds}
              reservedWishIds={reservedWishIds}
              onEdit={editWishDialog.open}
              onDelete={removeWishDialog.open}
              onToggleSelection={toggleWishSelection}
            />
          </div>
        </div>
      </div>

      {/* Bottom Bar - Mobile Only, Hidden in Selection Mode */}
      {!isSelectionMode && !!list?.isOwner && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background shadow-md md:hidden">
          <div className="flex items-center justify-between px-3 py-1.5">
            {/* Left side - Secondary actions */}
            {list.isOwner && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-11 w-11 p-0"
                  onClick={() => sharingDialog.open()}
                  aria-label="Share list"
                  title="Share list"
                >
                  <Share2 className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-11 w-11 p-0"
                  onClick={() => editListDialog.open()}
                  aria-label="Edit list"
                  title="Edit list"
                >
                  <Pencil className="h-5 w-5" />
                </Button>
              </div>
            )}

            {/* Right side - Primary action */}
            {list.isOwner && (
              <Button onClick={() => addWishDialog.open()} size="sm" className="min-h-[44px]">
                <Plus className="mr-2 h-5 w-5" />
                Add Wish
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Bulk Actions Bar - Fixed to Bottom on All Screen Sizes */}
      {isSelectionMode && selectedWishIds.size > 0 && list.isOwner && (
        <BulkActionsBar
          selectedCount={selectedWishIds.size}
          selectedWishIds={Array.from(selectedWishIds)}
          onSelectAll={selectAllWishes}
          onClearSelection={clearSelection}
          onClose={toggleSelectionMode}
          listId={list.id}
        />
      )}

      {/* Dialogs - Shared between desktop and mobile */}

      {/* Edit List Dialog */}
      <Dialog open={editListDialog.isOpen} onOpenChange={editListDialog.handleClose}>
        <DialogContent className="max-w-2xl" {...editListDialog.dialogProps}>
          <DialogHeader>
            <DialogTitle>Edit List</DialogTitle>
            <DialogDescription>Update your list details and settings.</DialogDescription>
          </DialogHeader>
          <ListForm
            list={list as any}
            onSuccess={() => editListDialog.close()}
            onCancel={() => editListDialog.close()}
            onDirtyStateChange={(dirty) => editListDialog.setIsDirty(dirty)}
            onOpenSharingSettings={() => {
              editListDialog.close();
              sharingDialog.open();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Add Wish Dialog - Tabbed (Create New / Add Existing) */}
      <AddWishTabDialog
        open={addWishDialog.isOpen}
        onOpenChange={addWishDialog.handleClose}
        listId={listId}
        availableWishes={availableWishes}
        alreadyAddedWishes={alreadyAddedWishes}
        isDirty={addWishDialog.isDirty}
        setIsDirty={addWishDialog.setIsDirty}
        onSuccess={() => {
          addWishDialog.close();
          void queryClient.invalidateQueries({ queryKey: ['lists', listId] });
          void queryClient.invalidateQueries({ queryKey: ['wishes'] });
        }}
      />

      {/* Edit Wish Dialog */}
      <Dialog open={editWishDialog.isOpen} onOpenChange={editWishDialog.handleClose}>
        <DialogContent className="max-w-2xl" {...editWishDialog.dialogProps}>
          <DialogHeader>
            <DialogTitle>Edit Wish</DialogTitle>
            <DialogDescription>Update the details of your wish.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {editWishDialog.editingWish && (
              <WishForm
                wish={editWishDialog.editingWish}
                showListSelection={true}
                onSuccess={() => {
                  editWishDialog.close();
                  void queryClient.invalidateQueries({ queryKey: ['lists', listId] });
                }}
                onCancel={() => editWishDialog.close()}
                onDirtyStateChange={(dirty) => editWishDialog.setIsDirty(dirty)}
              />
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Sharing Dialog */}
      <ListSharingDialog
        list={list as any}
        open={sharingDialog.isOpen}
        onOpenChange={(open) => {
          sharingDialog.setOpen(open);
          // Refresh list data when sharing dialog closes to ensure UI is up to date
          if (!open) {
            void queryClient.invalidateQueries({ queryKey: ['lists', listId] });
          }
        }}
      />

      {/* Remove Wish Confirmation Dialog */}
      <ConfirmDialog
        open={removeWishDialog.isOpen}
        onOpenChange={(open) => removeWishDialog.setOpen(open)}
        title="Remove Wish"
        description={`Are you sure you want to remove "${removeWishDialog.wishToRemove?.title}" from this list?`}
        confirmText="Remove"
        variant="destructive"
        onConfirm={confirmRemoveWish}
      />
    </>
  );
}
