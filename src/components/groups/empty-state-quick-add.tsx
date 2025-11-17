'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { listsApi } from '@/lib/api/lists';
import { groupsApi } from '@/lib/api/groups';

interface EmptyStateQuickAddProps {
  groupId: string;
}

export function EmptyStateQuickAdd({ groupId }: EmptyStateQuickAddProps) {
  const queryClient = useQueryClient();

  // Fetch user's lists
  const {
    data: userListsData,
    isLoading: isLoadingUserLists,
    error: userListsError,
  } = useQuery({
    queryKey: ['user-lists'],
    queryFn: () => listsApi.getLists({ limit: 50 }), // Get more than 6 to ensure we have options after filtering
  });

  // Fetch already-shared lists for this group
  const {
    data: groupListsData,
    isLoading: isLoadingGroupLists,
    error: groupListsError,
  } = useQuery({
    queryKey: ['group-lists', groupId],
    queryFn: () => groupsApi.getLists(groupId),
  });

  // Share list mutation
  const shareListMutation = useMutation({
    mutationFn: async (listId: string) => {
      await groupsApi.shareLists(groupId, { listIds: [listId] });
    },
    onSuccess: () => {
      // Invalidate group lists to refetch
      void queryClient.invalidateQueries({ queryKey: ['group-lists', groupId] });
      toast({
        title: 'List added',
        description: 'Your list has been shared with this group.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to add list',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Loading state
  if (isLoadingUserLists || isLoadingGroupLists) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (userListsError || groupListsError) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
        <p className="text-sm text-destructive">
          Failed to load lists. Please refresh the page and try again.
        </p>
      </div>
    );
  }

  const userLists = userListsData?.items || [];
  const sharedListIds = new Set(groupListsData?.lists.map((list) => list.id) || []);

  // Filter out already-shared lists and take top 6
  const availableLists = userLists.filter((list) => !sharedListIds.has(list.id)).slice(0, 6);

  // Empty state: user has 0 lists
  if (userLists.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          You don&apos;t have any lists yet. Create a list first, then come back to share it with
          your group.
        </p>
      </div>
    );
  }

  // All lists are already shared
  if (availableLists.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          All your lists are already shared with this group.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Quick Add</h3>
        <p className="text-sm text-muted-foreground">
          Add your lists to this group with one click
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {availableLists.map((list) => (
          <div
            key={list.id}
            className="flex flex-col gap-2 rounded-lg border bg-card p-3 transition-shadow hover:shadow-md"
          >
            <div className="flex-1">
              <h4 className="line-clamp-1 text-sm font-medium" title={list.name}>
                {list.name}
              </h4>
              <p className="text-xs text-muted-foreground">
                {list._count?.wishes || 0} {list._count?.wishes === 1 ? 'wish' : 'wishes'}
              </p>
            </div>

            <Badge variant="outline" className="w-fit text-xs capitalize">
              {list.visibility}
            </Badge>

            <Button
              onClick={() => shareListMutation.mutate(list.id)}
              disabled={shareListMutation.isPending}
              size="sm"
              className="w-full min-h-[44px] touch-manipulation"
              data-testid={`quick-add-list-${list.id}`}
            >
              {shareListMutation.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-1 h-4 w-4" />
              )}
              Add
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
