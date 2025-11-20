'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogHeader } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { WishForm } from '@/components/wishes/wish-form';
import { WishesDisplay } from '@/components/wishes/wishes-display';
import { wishesApi } from '@/lib/api/wishes';
import { Wish } from '@/lib/validators/api-responses/wishes';

interface AddWishTabDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string;
  availableWishes: Wish[];
  alreadyAddedWishes: Wish[];
  onSuccess: () => void;
  isDirty?: boolean;
  setIsDirty?: (dirty: boolean) => void;
}

export function AddWishTabDialog({
  open,
  onOpenChange,
  listId,
  availableWishes,
  alreadyAddedWishes,
  onSuccess,
  isDirty: _isDirty = false,
  setIsDirty,
}: AddWishTabDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Track component mount state to prevent state updates after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Tab state
  const [activeTab, setActiveTab] = useState<'create-new' | 'add-existing'>('create-new');

  // Search state for filtering wishes
  const [searchQuery, setSearchQuery] = useState('');

  // Selection state for existing wishes
  const [selectedWishIds, setSelectedWishIds] = useState<Set<string>>(new Set());

  // Success state for inline message
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Bulk add mutation
  const addExistingMutation = useMutation({
    mutationFn: (wishIds: string[]) => wishesApi.bulkAddToList(wishIds, listId),
    onSuccess: (result) => {
      const count = result.added || selectedWishIds.size;
      const message = `${count} ${count === 1 ? 'wish' : 'wishes'} added to list`;

      // Show toast
      toast({
        title: 'Success',
        description: message,
      });

      // Show inline success message
      setSuccessMessage(message);
      setShowSuccess(true);

      // Auto-close after 1 second (with mounted check)
      setTimeout(() => {
        if (mountedRef.current) {
          setShowSuccess(false);
          setSelectedWishIds(new Set());
          onSuccess();
        }
      }, 1000);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add wishes to list',
        variant: 'destructive',
      });
    },
  });

  // Combined wishes for display (available + already added)
  const allWishesForTab = useMemo(() => {
    return [
      ...availableWishes.map((w) => ({ ...w, isAvailable: true })),
      ...alreadyAddedWishes.map((w) => ({ ...w, isAvailable: false })),
    ];
  }, [availableWishes, alreadyAddedWishes]);

  // Filter wishes based on search query (applies to ALL wishes)
  const filteredDisplayWishes = useMemo(() => {
    if (!searchQuery.trim()) {
      return allWishesForTab;
    }
    const query = searchQuery.toLowerCase();
    return allWishesForTab.filter((wish) => wish.title.toLowerCase().includes(query));
  }, [allWishesForTab, searchQuery]);

  // Filter only available wishes (for selection)
  const filteredAvailableWishes = useMemo(() => {
    return filteredDisplayWishes.filter((w) => w.isAvailable);
  }, [filteredDisplayWishes]);

  // Toggle selection handler
  const handleToggleSelection = useCallback((wishId: string) => {
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

  // Select all handler
  const handleSelectAll = useCallback(() => {
    const allAvailableIds = new Set(filteredAvailableWishes.map((w) => w.id));
    setSelectedWishIds(allAvailableIds);
  }, [filteredAvailableWishes]);

  // Clear selection handler
  const handleClearSelection = useCallback(() => {
    setSelectedWishIds(new Set());
  }, []);

  // Add selected wishes handler
  const handleAddSelected = () => {
    if (selectedWishIds.size === 0) {
      return;
    }
    addExistingMutation.mutate(Array.from(selectedWishIds));
  };

  // Handle wish form success
  const handleWishFormSuccess = () => {
    onSuccess();
    void queryClient.invalidateQueries({ queryKey: ['wishes'] });
  };

  // Reset state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state
      setActiveTab('create-new');
      setSearchQuery('');
      setSelectedWishIds(new Set());
      setShowSuccess(false);
      setSuccessMessage('');
    }
    onOpenChange(newOpen);
  };

  // Check if any wishes are available
  const hasAvailableWishes = availableWishes.length > 0;
  const hasFilteredWishes = filteredDisplayWishes.some((w) => w.isAvailable);
  const allSelected =
    filteredAvailableWishes.length > 0 &&
    filteredAvailableWishes.every((wish) => selectedWishIds.has(wish.id));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <h2 className="text-lg font-semibold">Add Wish to List</h2>
          <p className="text-sm text-muted-foreground">
            Create a new wish or add existing wishes from your collection.
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create-new">Create New</TabsTrigger>
            <TabsTrigger value="add-existing">Add Existing</TabsTrigger>
          </TabsList>

          <TabsContent value="create-new" className="mt-4">
            <DialogBody>
              <WishForm
                defaultListId={listId}
                showListSelection={true}
                onSuccess={handleWishFormSuccess}
                onCancel={() => handleOpenChange(false)}
                onDirtyStateChange={setIsDirty}
              />
            </DialogBody>
          </TabsContent>

          <TabsContent value="add-existing" className="mt-4">
            <DialogBody>
              {/* Success message */}
              {showSuccess && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* Search input */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search wishes by title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Empty states */}
              {!hasAvailableWishes && (
                <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed p-8 text-center">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      All your wishes are already on this list
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Switch to &quot;Create New&quot; to add a new wish
                    </p>
                  </div>
                </div>
              )}

              {hasAvailableWishes && !hasFilteredWishes && (
                <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed p-8 text-center">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      No wishes match your search
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Try a different search term
                    </p>
                  </div>
                </div>
              )}

              {/* Wishes display */}
              {hasFilteredWishes && (
                <>
                  {/* Selection controls */}
                  <div className="mb-3 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {selectedWishIds.size} of {filteredAvailableWishes.length} selected
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={allSelected ? handleClearSelection : handleSelectAll}
                      >
                        {allSelected ? 'Deselect All' : 'Select All'}
                      </Button>
                    </div>
                  </div>

                  {/* Wishes grid */}
                  <div className="max-h-[400px] overflow-y-auto rounded-lg border">
                    <div className="p-4">
                      <WishesDisplay
                        wishes={filteredDisplayWishes.map((w) => ({
                          ...w,
                          // Disable already-added wishes for selection
                          isOwner: w.isAvailable,
                        }))}
                        viewMode="grid"
                        isSelectionMode={true}
                        selectedWishIds={selectedWishIds}
                        onToggleSelection={(wishId) => {
                          // Only allow selection of available wishes
                          const wish = filteredDisplayWishes.find((w) => w.id === wishId);
                          if (wish && wish.isAvailable) {
                            handleToggleSelection(wishId);
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="mt-4 flex justify-end gap-2">
                    <Button variant="outline" onClick={() => handleOpenChange(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddSelected}
                      disabled={selectedWishIds.size === 0 || addExistingMutation.isPending}
                    >
                      {addExistingMutation.isPending
                        ? 'Adding...'
                        : `Add Selected (${selectedWishIds.size})`}
                    </Button>
                  </div>
                </>
              )}
            </DialogBody>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
