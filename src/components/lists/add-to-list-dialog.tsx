'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Plus } from 'lucide-react';

import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { listsApi } from '@/lib/api/lists';
import { ListWithOwner } from '@/lib/validators/api-responses/lists';

interface AddToListDialogProps {
  wishId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddToListDialog({ wishId, open, onOpenChange }: AddToListDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [addedLists, setAddedLists] = useState<Set<string>>(new Set());

  // Fetch user's lists
  const { data, isLoading } = useQuery({
    queryKey: ['lists'],
    queryFn: () => listsApi.getLists(),
    enabled: open,
  });

  // Add wish to list mutation
  const addToListMutation = useMutation({
    mutationFn: (listId: string) => listsApi.addWishToList(listId, { wishId }),
    onSuccess: (_, listId) => {
      setAddedLists((prev) => new Set(Array.from(prev).concat(listId)));
      void queryClient.invalidateQueries({ queryKey: ['lists', listId] });
      // Also invalidate wishes to show updated list associations
      void queryClient.invalidateQueries({ queryKey: ['wishes'] });
      void queryClient.invalidateQueries({ queryKey: ['wishes', wishId] });
      toast({
        title: 'Added to list',
        description: 'The wish has been added to the list',
      });
    },
    onError: (error: Error & { response?: { data?: { error?: string } } }, listId) => {
      // If it's already in the list, treat as success
      if (error.response?.data?.error?.includes('already in this list')) {
        setAddedLists((prev) => new Set(Array.from(prev).concat(listId)));
        toast({
          title: 'Already added',
          description: 'This wish is already in the list',
        });
        return;
      }

      const message = error.response?.data?.error || 'Failed to add wish to list';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    },
  });

  const handleAddToList = (list: ListWithOwner) => {
    if (!isWishInList(list)) {
      addToListMutation.mutate(list.id);
    }
  };

  const isWishInList = (list: ListWithOwner & { wishes?: Array<{ wish: { id: string } }> }) => {
    return list.wishes?.some((listWish) => listWish.wish.id === wishId) || addedLists.has(list.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to List</DialogTitle>
          <DialogDescription>Select which lists you want to add this wish to.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {isLoading && (
            <>
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-3">
                    <Skeleton className="h-4 w-3/4" />
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}

          {!isLoading && data?.items.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">No lists yet</p>
              <p className="mt-1 text-sm text-muted-foreground/70">
                Create a list first to add wishes to it
              </p>
            </div>
          )}

          {!isLoading &&
            data?.items.map((list) => {
              const isInList = isWishInList(
                list as ListWithOwner & { wishes?: Array<{ wish: { id: string } }> }
              );

              return (
                <Card
                  key={list.id}
                  className={`cursor-pointer transition-colors ${
                    isInList
                      ? 'border-success/30 bg-success/10 dark:border-success/40 dark:bg-success/5'
                      : 'hover:bg-accent/50'
                  }`}
                  onClick={() => handleAddToList(list as ListWithOwner)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="text-sm font-medium">{list.name}</h4>
                        {list.description && (
                          <p className="line-clamp-1 text-xs text-muted-foreground">
                            {list.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {list.visibility}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {list._count.wishes} wishes
                        </span>
                      </div>

                      <Button
                        size="sm"
                        variant={isInList ? 'default' : 'outline'}
                        disabled={addToListMutation.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToList(list as ListWithOwner);
                        }}
                      >
                        {isInList ? (
                          <>
                            <Check className="mr-1 h-3 w-3" />
                            Added
                          </>
                        ) : (
                          <>
                            <Plus className="mr-1 h-3 w-3" />
                            Add
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
