'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Check, FolderMinus, FolderPlus, Trash2, X } from 'lucide-react';

import { useEffect, useState } from 'react';

import { ListSelector } from '@/components/lists/list-selector';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RemoveOptionsDialog } from '@/components/wishes/remove-options-dialog';
import { Progress } from '@/components/ui/progress';
import { ThemeButton } from '@/components/ui/theme-button';
import { useToast } from '@/components/ui/use-toast';
import {
  BulkOperationDetails,
  type BulkOperationResult,
} from '@/components/wishes/bulk-operation-details';
import { listsApi } from '@/lib/api/lists';
import { wishesApi } from '@/lib/api/wishes';
import { ListWithOwner } from '@/lib/validators/api-responses/lists';

interface BulkActionsBarProps {
  selectedCount: number;
  selectedWishIds: string[];
  onSelectAll: () => void;
  onClearSelection: () => void;
  onClose: () => void;
  listId?: string; // Optional: when provided, shows list-specific removal option
}

interface ProgressState {
  current: number;
  total: number;
  operation: 'deleting' | 'adding' | 'removing' | null;
}

export function BulkActionsBar({
  selectedCount,
  selectedWishIds,
  onSelectAll,
  onClearSelection,
  onClose,
  listId,
}: BulkActionsBarProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showListSelector, setShowListSelector] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ProgressState>({
    current: 0,
    total: 0,
    operation: null,
  });
  const [operationResult, setOperationResult] = useState<BulkOperationResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  // Reset progress when processing is done
  useEffect(() => {
    if (!isProcessing) {
      setProgress({ current: 0, total: 0, operation: null });
    }
  }, [isProcessing]);

  // Simulate progress updates for better UX
  const simulateProgress = (
    operation: 'deleting' | 'adding' | 'removing',
    total: number,
    duration: number = 1000
  ) => {
    setProgress({ current: 0, total, operation });
    const increment = total / 10; // Update progress in 10 steps
    const interval = duration / 10;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= total) {
        current = total;
        clearInterval(timer);
      }
      setProgress((prev: ProgressState) => ({ ...prev, current: Math.floor(current) }));
    }, interval);

    return () => clearInterval(timer);
  };

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: () => wishesApi.bulkDelete(selectedWishIds),
    onMutate: async () => {
      setIsProcessing(true);
      simulateProgress('deleting', selectedWishIds.length);
      await queryClient.cancelQueries({ queryKey: ['wishes'] });
    },
    onSuccess: (data) => {
      const deletedCount = data.deleted ?? 0;
      const result: BulkOperationResult = {
        operation: 'delete',
        total: selectedWishIds.length,
        successful: deletedCount,
        failed: selectedWishIds.length - deletedCount,
        errors: data.errors,
      };

      if (deletedCount === selectedWishIds.length) {
        toast({
          title: 'Wishes deleted',
          description: `Successfully deleted ${deletedCount} wishes`,
        });
      } else if (deletedCount > 0) {
        toast({
          title: 'Partial success',
          description: `Deleted ${deletedCount} of ${selectedWishIds.length} wishes. Click for details.`,
          variant: 'destructive',
        });
        setOperationResult(result);
        setShowDetails(true);
      } else {
        toast({
          title: 'Failed to delete wishes',
          description: 'No wishes were deleted. Click for details.',
          variant: 'destructive',
        });
        setOperationResult(result);
        setShowDetails(true);
      }
      onClearSelection();
    },
    onError: (error) => {
      // Handle 403 error with unauthorized wishes
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        const data = error.response.data as { unauthorized?: string[]; error?: string };
        if (data.unauthorized) {
          const unauthorizedIds = data.unauthorized;
          const result: BulkOperationResult = {
            operation: 'delete',
            total: selectedWishIds.length,
            successful: 0,
            failed: unauthorizedIds.length,
            unauthorizedIds,
            message: data.error,
          };

          toast({
            title: 'Permission denied',
            description: `You don't have permission to delete ${unauthorizedIds.length} wishes. Click for details.`,
            variant: 'destructive',
          });
          setOperationResult(result);
          setShowDetails(true);
          return;
        }
      }

      toast({
        title: 'Error',
        description: 'Failed to delete wishes. Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsProcessing(false);
      void queryClient.invalidateQueries({ queryKey: ['wishes'] });
      void queryClient.invalidateQueries({ queryKey: ['wishes', 'count'] });
    },
  });

  // Bulk add to list mutation
  const bulkAddToListMutation = useMutation({
    mutationFn: (listId: string) => wishesApi.bulkAddToList(selectedWishIds, listId),
    onMutate: () => {
      setIsProcessing(true);
      simulateProgress('adding', selectedWishIds.length);
    },
    onSuccess: (data) => {
      const addedCount = data.added ?? 0;
      const skippedCount = data.skipped ?? 0;
      const result: BulkOperationResult = {
        operation: 'add-to-list',
        total: selectedWishIds.length,
        successful: addedCount,
        failed: 0,
        skipped: skippedCount,
        message: data.message,
        errors: data.errors,
      };

      if (addedCount === selectedWishIds.length) {
        toast({
          title: 'Wishes added',
          description: `Successfully added ${addedCount} wishes to the list`,
        });
      } else if (skippedCount > 0 && addedCount > 0) {
        toast({
          title: 'Partial success',
          description: `Added ${addedCount} of ${selectedWishIds.length} wishes. ${skippedCount} already in list.`,
        });
        setOperationResult(result);
        setShowDetails(true);
      } else if (addedCount === 0 && skippedCount > 0) {
        toast({
          title: 'No changes made',
          description: `All ${skippedCount} wishes were already in the list`,
        });
      } else {
        toast({
          title: 'Wishes added',
          description: data.message || `Added ${data.added} wishes to list`,
        });
      }
      onClearSelection();
      setShowListSelector(false);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to add wishes to list. Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsProcessing(false);
      void queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });

  // Bulk remove from lists mutation
  const bulkRemoveFromListsMutation = useMutation({
    mutationFn: () => wishesApi.bulkRemoveFromLists(selectedWishIds),
    onMutate: () => {
      setIsProcessing(true);
      simulateProgress('removing', selectedWishIds.length);
    },
    onSuccess: (data) => {
      const message = data.message || `Removed ${data.removed} wish associations`;
      toast({
        title: 'Wishes removed from lists',
        description: message,
      });
      onClearSelection();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to remove wishes from lists. Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsProcessing(false);
      void queryClient.invalidateQueries({ queryKey: ['lists'] });
    },
  });

  // Bulk remove from specific list mutation
  const bulkRemoveFromListMutation = useMutation({
    mutationFn: () => {
      if (!listId) {
        throw new Error('List ID is required');
      }
      return listsApi.bulkRemoveFromList(listId, selectedWishIds);
    },
    onMutate: () => {
      setIsProcessing(true);
      simulateProgress('removing', selectedWishIds.length);
    },
    onSuccess: (data) => {
      const message = data.message || `Removed ${data.removed} wishes from list`;
      toast({
        title: 'Wishes removed from list',
        description: message,
      });
      onClearSelection();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to remove wishes from list. Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsProcessing(false);
      void queryClient.invalidateQueries({ queryKey: ['lists'] });
      void queryClient.invalidateQueries({ queryKey: ['lists', listId] });
    },
  });

  const handleBulkDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleRemove = () => {
    setShowRemoveDialog(true);
  };

  const handleListSelect = (list: ListWithOwner) => {
    bulkAddToListMutation.mutate(list.id);
  };

  // Progress display component
  const ProgressDisplay = () => {
    if (!isProcessing || !progress.operation) {
      return null;
    }

    const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
    const operationTextMap = {
      deleting: 'Deleting',
      adding: 'Adding to list',
      removing: 'Removing from lists',
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

  // No longer preventing scroll on mobile - users need to scroll to select more items

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      {/* Floating Toolbar - Fixed to Bottom on All Screen Sizes */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 shadow-lg backdrop-blur duration-300 animate-in slide-in-from-bottom"
        role="toolbar"
        aria-label="Bulk actions toolbar"
      >
        <ProgressDisplay />
        <div className="flex items-center gap-2 px-3 py-2">
          {/* Selection Info */}
          <span className="text-sm font-medium text-muted-foreground">{selectedCount}</span>

          {/* Compact Action Buttons - Icon only on mobile */}
          <div className="flex flex-1 items-center justify-center gap-1">
            <ThemeButton
              size="sm"
              variant="ghost"
              onClick={onSelectAll}
              disabled={isProcessing}
              className="h-11 w-11 p-0"
              title="Select All"
            >
              <Check className="h-5 w-5" />
            </ThemeButton>
            <ThemeButton
              size="sm"
              variant="ghost"
              onClick={onClearSelection}
              disabled={isProcessing}
              className="h-11 w-11 p-0"
              title="Clear Selection"
            >
              <X className="h-5 w-5" />
            </ThemeButton>
            <div className="mx-1 h-6 w-px bg-border" /> {/* Separator */}
            <ThemeButton
              size="sm"
              variant="ghost"
              onClick={() => setShowListSelector(true)}
              disabled={isProcessing}
              className="h-11 w-11 p-0"
              title="Add to List"
            >
              <FolderPlus className="h-5 w-5" />
            </ThemeButton>
            <ThemeButton
              size="sm"
              variant="ghost"
              onClick={handleRemove}
              disabled={isProcessing}
              className="h-11 w-11 p-0"
              title="Remove"
            >
              <FolderMinus className="h-5 w-5" />
            </ThemeButton>
            <ThemeButton
              size="sm"
              variant="ghost"
              onClick={handleBulkDelete}
              disabled={isProcessing}
              className="h-11 w-11 p-0 text-destructive hover:bg-destructive/10"
              title="Delete Selected"
            >
              <Trash2 className="h-5 w-5" />
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

      {/* List Selector Dialog */}
      <Dialog open={showListSelector} onOpenChange={setShowListSelector}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select a List</DialogTitle>
            <DialogDescription>
              Choose a list to add or remove the selected wishes.
            </DialogDescription>
          </DialogHeader>
          <ListSelector onSelect={handleListSelect} onCancel={() => setShowListSelector(false)} />
        </DialogContent>
      </Dialog>

      {/* Bulk Operation Details Dialog */}
      <BulkOperationDetails
        result={operationResult}
        open={showDetails}
        onOpenChange={setShowDetails}
      />

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete Wishes"
        description={`Are you sure you want to delete ${selectedCount} wish${selectedCount === 1 ? '' : 'es'}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => {
          setShowDeleteConfirm(false);
          bulkDeleteMutation.mutate();
        }}
        variant="destructive"
      />

      <RemoveOptionsDialog
        open={showRemoveDialog}
        onOpenChange={setShowRemoveDialog}
        selectedCount={selectedCount}
        listId={listId}
        onRemoveFromList={() => bulkRemoveFromListMutation.mutate()}
        onRemoveFromAllLists={() => bulkRemoveFromListsMutation.mutate()}
        isRemoving={isProcessing}
      />
    </>
  );
}
