'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Filter } from 'lucide-react';

import { useMemo, useState } from 'react';

import { ListForm } from '@/components/lists/list-form';
import { ListGrid } from '@/components/lists/list-grid';
import { ListSharingDialog } from '@/components/lists/list-sharing-dialog';
import { useViewPreference } from '@/lib/utils/view-preferences';
import { useSortPreference } from '@/lib/utils/sort-preferences';
import { ListFilterPanel } from '@/components/lists/filters/ListFilterPanel';
import { MobileListFilterSheet } from '@/components/lists/filters/MobileListFilterSheet';
import { useListFilters } from '@/components/lists/hooks/useListFilters';
import { Button } from '@/components/ui/button';
import { ListSortToggle } from '@/components/ui/list-sort-toggle';
import { ViewToggle } from '@/components/ui/view-toggle';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ThemeButton } from '@/components/ui/theme-button';
import { useToast } from '@/components/ui/use-toast';
import { usePreventUnsavedClose } from '@/hooks/use-form-dirty-state';
import { listsApi } from '@/lib/api/lists';
import { ListWithDetails } from '@/lib/services/list-service';
import { PaginatedListsResponse, ListWithOwner } from '@/lib/validators/api-responses/lists';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';

export default function ListsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: session } = useSession();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingList, setEditingList] = useState<ListWithDetails | null>(null);
  const [sharingList, setSharingList] = useState<ListWithDetails | null>(null);
  const [isCreateFormDirty, setIsCreateFormDirty] = useState(false);
  const [isEditFormDirty, setIsEditFormDirty] = useState(false);

  // Filter panel states
  const [isDesktopFilterOpen, setIsDesktopFilterOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // View mode state - default to grid for better space efficiency
  const [viewMode, setViewMode] = useViewPreference('viewMode.lists', 'grid');

  // List sort preference
  const [sortPreference, setSortPreference, isSortHydrated] = useSortPreference(
    'sortMode.lists',
    'name'
  );

  // Unsaved close prevention for create dialog
  const createCloseHandler = usePreventUnsavedClose(isCreateFormDirty, () => {
    setShowCreateDialog(false);
    setIsCreateFormDirty(false);
  });

  // Unsaved close prevention for edit dialog
  const editCloseHandler = usePreventUnsavedClose(isEditFormDirty, () => {
    setEditingList(null);
    setIsEditFormDirty(false);
  });

  // Fetch lists
  const { data, isLoading } = useQuery({
    queryKey: ['lists'],
    queryFn: () => listsApi.getLists(),
  });

  // Initialize filters hook with fetched lists
  const {
    filteredLists,
    search,
    visibility,
    ownership,
    itemCount,
    sort,
    setSearch,
    setVisibility,
    setOwnership,
    setItemCount,
    setSort,
    clearAllFilters,
    activeFilterCount,
  } = useListFilters(data?.items || [], session?.user?.id);

  // Sort lists based on user preference
  const sortedAndFilteredLists = useMemo(() => {
    if (!filteredLists) {
      return [];
    }

    const lists = [...filteredLists];
    const multiplier = sortPreference.direction === 'asc' ? 1 : -1;

    switch (sortPreference.mode) {
      case 'name':
        return lists.sort((a, b) => multiplier * a.name.localeCompare(b.name));
      case 'wishes':
        return lists.sort(
          (a, b) => multiplier * ((a._count?.listWishes || 0) - (b._count?.listWishes || 0))
        );
      case 'newest':
        return lists.sort(
          (a, b) => multiplier * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        );
      default:
        return lists;
    }
  }, [filteredLists, sortPreference]);

  // Delete mutation with optimistic updates
  const deleteMutation = useMutation({
    mutationFn: listsApi.deleteList,
    onMutate: async (listId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['lists'] });

      // Snapshot the previous value
      const previousLists = queryClient.getQueryData(['lists']);

      // Optimistically remove the list
      queryClient.setQueryData(['lists'], (old: PaginatedListsResponse | undefined) => {
        if (!old?.items) {
          return old;
        }
        return {
          ...old,
          items: old.items.filter((list: ListWithOwner) => list.id !== listId),
        };
      });

      // Return a context object with the snapshotted value
      return { previousLists };
    },
    onError: (_err, _listId, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousLists) {
        queryClient.setQueryData(['lists'], context.previousLists);
      }
      toast({
        title: 'Error',
        description: 'Failed to delete list. Please try again.',
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'List deleted',
        description: 'Your list has been removed',
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure server state
      void queryClient.invalidateQueries({ queryKey: ['lists'] });
      // Also invalidate related queries
      void queryClient.invalidateQueries({ queryKey: ['lists', 'count'] });
    },
  });

  const handleDelete = (list: ListWithDetails | ListWithOwner) => {
    if (
      confirm(
        'Are you sure you want to delete this list? This will also remove all wishes from the list.'
      )
    ) {
      deleteMutation.mutate(list.id);
    }
  };

  const handleEdit = (list: ListWithDetails | ListWithOwner) => {
    setEditingList(list as ListWithDetails);
  };

  const handleShare = (list: ListWithDetails | ListWithOwner) => {
    setSharingList(list as ListWithDetails);
  };

  return (
    <div className="relative min-h-screen">
      {/* Desktop Filter Panel - Sliding Overlay */}
      <div
        className={cn(
          'fixed left-0 top-16 z-30 h-[calc(100vh-4rem)] w-80 transform border-r bg-background shadow-xl transition-transform duration-300 ease-in-out lg:block',
          isDesktopFilterOpen ? 'translate-x-0' : '-translate-x-full',
          'hidden' // Hidden on mobile, only show on lg and up
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
            <ListFilterPanel
              search={search}
              visibility={visibility}
              ownership={ownership}
              itemCount={itemCount}
              sort={sort}
              onSearchChange={setSearch}
              onVisibilityChange={setVisibility}
              onOwnershipChange={setOwnership}
              onItemCountChange={setItemCount}
              onSortChange={setSort}
              onClearAll={clearAllFilters}
              activeFilterCount={activeFilterCount}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div
        className={cn('transition-all duration-300 ease-in-out', isDesktopFilterOpen && 'lg:ml-80')}
      >
        {/* Mobile Top Menu Row */}
        <div className="sticky top-0 z-30 flex items-center justify-between border-b bg-background px-4 py-1.5 md:hidden">
          {/* Left side - Filter button */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileFilterOpen(true)}
              aria-label="Filter lists"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>

          {/* Right side - Sort & View Toggle */}
          <div className="flex items-center gap-2">
            <ListSortToggle
              preference={sortPreference}
              onPreferenceChange={setSortPreference}
              isHydrated={isSortHydrated}
            />
            <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">My Lists</h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Organize your wishes into shareable lists
              </p>
            </div>
            <ThemeButton onClick={() => setShowCreateDialog(true)} className="hidden md:flex">
              <Plus className="mr-2 h-4 w-4" />
              Create List
            </ThemeButton>
          </div>

          {/* Desktop Filter Button & Controls - Hidden on mobile since mobile has filter in top menu */}
          <div className="mb-4 hidden items-center justify-between border-b pb-4 md:flex">
            <Button
              variant={isDesktopFilterOpen ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsDesktopFilterOpen(!isDesktopFilterOpen)}
              className="relative"
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-xs text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            <div className="flex items-center gap-2">
              <ListSortToggle
                preference={sortPreference}
                onPreferenceChange={setSortPreference}
                isHydrated={isSortHydrated}
              />
              <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
            </div>
          </div>

          {/* Lists Grid */}
          <div className="pb-24 md:pb-0">
            <ListGrid
              lists={sortedAndFilteredLists}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onShare={handleShare}
              isLoading={isLoading}
              viewMode={viewMode}
              currentUserId={session?.user?.id}
            />
          </div>

          {/* Create Dialog */}
          <Dialog open={showCreateDialog} onOpenChange={createCloseHandler.handleClose}>
            <DialogContent className="max-w-2xl" {...createCloseHandler.dialogProps}>
              <DialogHeader>
                <DialogTitle>Create New List</DialogTitle>
                <DialogDescription>
                  Create a new list to organize your wishes. You can share it with others later.
                </DialogDescription>
              </DialogHeader>
              <ListForm
                onSuccess={() => {
                  setShowCreateDialog(false);
                  setIsCreateFormDirty(false);
                  // Cache update is handled by ListForm optimistic update
                }}
                onCancel={() => {
                  setShowCreateDialog(false);
                  setIsCreateFormDirty(false);
                }}
                onDirtyStateChange={setIsCreateFormDirty}
              />
            </DialogContent>
          </Dialog>

          {/* Edit Dialog */}
          <Dialog open={!!editingList} onOpenChange={editCloseHandler.handleClose}>
            <DialogContent className="max-w-2xl" {...editCloseHandler.dialogProps}>
              <DialogHeader>
                <DialogTitle>Edit List</DialogTitle>
                <DialogDescription>Update your list details and settings.</DialogDescription>
              </DialogHeader>
              {editingList && (
                <ListForm
                  list={editingList}
                  onSuccess={() => {
                    setEditingList(null);
                    setIsEditFormDirty(false);
                    // Removed invalidation - ListForm handles cache updates with optimistic updates
                  }}
                  onCancel={() => {
                    setEditingList(null);
                    setIsEditFormDirty(false);
                  }}
                  onDirtyStateChange={setIsEditFormDirty}
                />
              )}
            </DialogContent>
          </Dialog>

          {/* Sharing Dialog */}
          {sharingList && (
            <ListSharingDialog
              list={sharingList}
              open={!!sharingList}
              onOpenChange={(open) => !open && setSharingList(null)}
            />
          )}
        </div>
      </div>

      {/* Mobile Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background shadow-md md:hidden">
        <div className="flex items-center justify-end px-4 py-1.5">
          <Button
            onClick={() => setShowCreateDialog(true)}
            size="lg"
            className="min-h-[44px] min-w-[130px]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create List
          </Button>
        </div>
      </div>

      {/* Mobile Filter Sheet */}
      <MobileListFilterSheet
        open={isMobileFilterOpen}
        onOpenChange={setIsMobileFilterOpen}
        search={search}
        visibility={visibility}
        ownership={ownership}
        itemCount={itemCount}
        sort={sort}
        onSearchChange={setSearch}
        onVisibilityChange={setVisibility}
        onOwnershipChange={setOwnership}
        onItemCountChange={setItemCount}
        onSortChange={setSort}
        onClearAll={clearAllFilters}
        activeFilterCount={activeFilterCount}
      />
    </div>
  );
}
