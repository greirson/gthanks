'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, MoreVertical, Plus, Trash } from 'lucide-react';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { ListWithOwner } from '@/lib/services/group-types';

import { SearchableListSelector } from './searchable-list-selector';
import { EmptyStateQuickAdd } from './empty-state-quick-add';

interface GroupListsProps {
  groupId: string;
  currentUserRole?: 'admin' | 'member';
  useSearchMode?: boolean;
}

export function GroupLists({ groupId, currentUserRole, useSearchMode = false }: GroupListsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newListIds, setNewListIds] = useState('');

  const isAdmin = currentUserRole === 'admin';

  // Determine if we should show the search selector
  const shouldShowSearch = useSearchMode;

  // Fetch group lists
  const { data: listsResponse, isLoading } = useQuery({
    queryKey: ['group-lists', groupId],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${groupId}/lists`, {
        // Add cache-busting headers to ensure fresh data
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch lists');
      }
      const data = (await response.json()) as { lists: ListWithOwner[]; hasMore: boolean };
      return data;
    },
    staleTime: 0, // Consider data stale immediately
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const lists = listsResponse?.lists || [];

  // Share lists with group mutation
  const shareListsMutation = useMutation({
    mutationFn: async (listIds: string[]) => {
      const response = await fetch(`/api/groups/${groupId}/lists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listIds }),
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error || 'Failed to share lists');
      }

      return response.json() as Promise<unknown>;
    },
    onSuccess: async () => {
      // Invalidate and refetch the group lists immediately
      await queryClient.invalidateQueries({ queryKey: ['group-lists', groupId] });
      // Also invalidate list search queries to update available lists
      await queryClient.invalidateQueries({ queryKey: ['list-search', groupId] });
      setNewListIds('');
      toast({
        title: 'Success!',
        description: 'Lists shared with group',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Remove list from group mutation
  const removeListMutation = useMutation({
    mutationFn: async (listId: string) => {
      const response = await fetch(`/api/groups/${groupId}/lists/${listId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error || 'Failed to remove list');
      }

      return response.json() as Promise<unknown>;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['group-lists', groupId] });
      // Also invalidate list search queries to update available lists
      await queryClient.invalidateQueries({ queryKey: ['list-search', groupId] });
      toast({
        title: 'Success!',
        description: 'List removed from group',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleShareLists = () => {
    const listIds = newListIds
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (listIds.length === 0) {
      return;
    }

    shareListsMutation.mutate(listIds);
  };

  const handleSearchListSelect = (listId: string) => {
    shareListsMutation.mutate([listId]);
  };

  const handleRemoveList = (listId: string) => {
    removeListMutation.mutate(listId);
  };

  const handleViewList = (listId: string) => {
    router.push(`/lists/${listId}`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Shared Lists</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="flex animate-pulse items-center justify-between rounded-md bg-secondary p-3"
              >
                <div className="space-y-1">
                  <div className="h-4 w-32 rounded bg-muted"></div>
                  <div className="h-3 w-24 rounded bg-muted"></div>
                </div>
                <div className="h-6 w-16 rounded bg-muted"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Shared Lists ({lists.length})</span>
          {isAdmin && !useSearchMode && (
            <div className="hidden items-center gap-2 md:flex">
              <Input
                placeholder="List IDs (comma-separated)"
                value={newListIds}
                onChange={(e) => setNewListIds(e.target.value)}
                className="w-48"
              />
              <Button
                onClick={handleShareLists}
                disabled={!newListIds.trim() || shareListsMutation.isPending}
                size="sm"
                className="min-h-[44px] min-w-[44px]"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardTitle>
      </CardHeader>

      {isAdmin && shouldShowSearch && (
        <CardContent className="pt-0">
          <SearchableListSelector groupId={groupId} onListSelect={handleSearchListSelect} />
        </CardContent>
      )}

      <CardContent>
        {lists.length === 0 ? (
          isAdmin ? (
            <EmptyStateQuickAdd groupId={groupId} />
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No lists shared with this group yet.
            </div>
          )
        ) : (
          <div className="space-y-3 pb-24 md:pb-0">
            {lists.map((list) => (
              <div
                key={list.id}
                className="flex items-center justify-between rounded-md bg-secondary p-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{list.name}</h4>
                    <Badge variant="outline" className="text-xs">
                      {list.visibility}
                    </Badge>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    by {list.user.name} • {list._count?.listWishes || 0} wishes
                  </div>
                  {list.description && (
                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                      {list.description}
                    </p>
                  )}
                </div>

                <div className="ml-4 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-[44px]"
                    onClick={() => handleViewList(list.id)}
                  >
                    <ExternalLink className="mr-1 h-4 w-4" />
                    View
                  </Button>

                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="min-h-[44px] min-w-[44px]"
                          aria-label="More options"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleRemoveList(list.id)}
                          className="text-destructive"
                          disabled={removeListMutation.isPending}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Remove from Group
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
