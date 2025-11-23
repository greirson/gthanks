'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash, Users } from 'lucide-react';

import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/use-toast';
import { groupsApi } from '@/lib/api/groups';

interface ListGroupSharesProps {
  listId: string;
  onRemove?: () => void;
}

export function ListGroupShares({ listId, onRemove }: ListGroupSharesProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [groupToRemove, setGroupToRemove] = useState<{ id: string; name: string } | null>(null);

  // Fetch groups where this list is shared
  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['list-group-shares', listId],
    queryFn: () => groupsApi.getGroupsForList(listId),
  });

  // Remove list from group mutation
  const removeFromGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      await groupsApi.removeList(groupId, listId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['list-group-shares', listId] });
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
      onRemove?.();
      toast({
        title: 'Success!',
        description: 'List removed from group',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove list from group',
        variant: 'destructive',
      });
    },
  });

  const handleRemoveFromGroup = (groupId: string, groupName: string) => {
    setGroupToRemove({ id: groupId, name: groupName });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Shared with Groups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="flex animate-pulse items-center justify-between rounded bg-secondary p-2"
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-muted"></div>
                  <div className="h-4 w-24 rounded bg-muted"></div>
                </div>
                <div className="h-8 w-16 rounded bg-muted"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (groups.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Shared with Groups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-4 text-center text-muted-foreground">
            <Users className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p className="text-sm">This list is not shared with any groups.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Shared with Groups ({groups.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {groups.map((group) => (
              <div
                key={group.id}
                className="flex items-center justify-between rounded-lg bg-secondary p-3"
              >
                <div className="flex items-center gap-3">
                  {group.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={group.avatarUrl} alt={group.name} className="h-8 w-8 rounded-full" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}

                  <div>
                    <div className="font-medium">{group.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {group._count.userGroups} members
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {group.currentUserRole && (
                    <Badge variant="outline" className="text-xs">
                      {group.currentUserRole === 'admin' ? 'Admin' : 'Member'}
                    </Badge>
                  )}

                  {group.currentUserRole === 'admin' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFromGroup(group.id, group.name)}
                      disabled={removeFromGroupMutation.isPending}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Remove from Group Confirmation Dialog */}
      <ConfirmDialog
        open={!!groupToRemove}
        onOpenChange={() => setGroupToRemove(null)}
        title="Remove List from Group"
        description={`Are you sure you want to remove this list from "${groupToRemove?.name}"? This action cannot be undone.`}
        confirmText="Remove from Group"
        variant="destructive"
        onConfirm={() => {
          if (groupToRemove) {
            removeFromGroupMutation.mutate(groupToRemove.id);
            setGroupToRemove(null);
          }
        }}
      />
    </>
  );
}
