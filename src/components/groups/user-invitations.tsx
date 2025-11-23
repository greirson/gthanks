'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, ChevronRight, Clock, Users, X } from 'lucide-react';

import { memo, useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { UserAvatar } from '@/components/ui/user-avatar';
import { GroupInvitationDetails } from '@/lib/services/group-types';
import { cn } from '@/lib/utils';

function UserInvitationsComponent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState<boolean | null>(null);
  const [hasManuallyToggled, setHasManuallyToggled] = useState(false);

  // Fetch user's pending invitations
  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ['user-invitations'],
    queryFn: async () => {
      const response = await fetch('/api/user/invitations');
      if (!response.ok) {
        if (response.status === 404) {
          return []; // No invitations
        }
        throw new Error('Failed to fetch invitations');
      }
      return response.json() as Promise<GroupInvitationDetails[]>;
    },
  });

  // Respond to invitation mutation
  const respondToInvitationMutation = useMutation({
    mutationFn: async ({
      invitationId,
      action,
      groupId,
    }: {
      invitationId: string;
      action: 'accept' | 'decline';
      groupId: string;
    }) => {
      const response = await fetch(`/api/groups/${groupId}/invitations/${invitationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error || `Failed to ${action} invitation`);
      }

      return response.json() as Promise<unknown>;
    },
    onMutate: async ({ invitationId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['user-invitations'] });

      // Snapshot the previous value
      const previousInvitations = queryClient.getQueryData<GroupInvitationDetails[]>([
        'user-invitations',
      ]);

      // Optimistically update by removing the invitation
      queryClient.setQueryData<GroupInvitationDetails[]>(['user-invitations'], (old) => {
        return old ? old.filter((inv) => inv.id !== invitationId) : [];
      });

      // Return a context object with the snapshotted value
      return { previousInvitations };
    },
    onError: (error: Error, _, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousInvitations) {
        queryClient.setQueryData(['user-invitations'], context.previousInvitations);
      }

      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: (_, __, { groupId }) => {
      // Always refetch after error or success
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user-invitations'] }),
        queryClient.invalidateQueries({ queryKey: ['groups'] }),
        queryClient.invalidateQueries({ queryKey: ['groups', 'count'] }),
        queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'base'] }),
        queryClient.invalidateQueries({ queryKey: ['group-members', groupId] }),
      ]);
    },
    onSuccess: (_, { action }) => {
      toast({
        title: 'Success!',
        description: `Invitation ${action}ed successfully`,
      });
    },
  });

  const handleAcceptInvitation = (invitation: GroupInvitationDetails) => {
    respondToInvitationMutation.mutate({
      invitationId: invitation.id,
      action: 'accept',
      groupId: invitation.groupId,
    });
  };

  const handleDeclineInvitation = (invitation: GroupInvitationDetails) => {
    respondToInvitationMutation.mutate({
      invitationId: invitation.id,
      action: 'decline',
      groupId: invitation.groupId,
    });
  };

  // Auto-expand/collapse based on invitations
  useEffect(() => {
    if (isExpanded === null && !hasManuallyToggled) {
      // Auto-expand if there are invitations, collapse if empty
      setIsExpanded(invitations.length > 0);
    }
  }, [invitations.length, isExpanded, hasManuallyToggled]);

  // Reset expanded state when invitations change (e.g., after accepting/declining)
  useEffect(() => {
    if (!hasManuallyToggled) {
      if (invitations.length > 0 && isExpanded === false) {
        setIsExpanded(true);
      } else if (invitations.length === 0 && isExpanded === true) {
        setIsExpanded(false);
      }
    }
  }, [invitations.length, isExpanded, hasManuallyToggled]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="cursor-pointer">
          <CardTitle className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4" />
            <Users className="h-5 w-5" />
            Group Invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 2 }, (_, i) => (
              <div
                key={i}
                className="flex animate-pulse items-center justify-between rounded-md bg-muted/50 p-3"
                data-testid="loading-skeleton"
              >
                <div className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-full bg-muted"></div>
                  <div className="space-y-1">
                    <div className="h-4 w-32 rounded bg-muted"></div>
                    <div className="h-3 w-24 rounded bg-muted"></div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-8 w-8 rounded bg-muted"></div>
                  <div className="h-8 w-8 rounded bg-muted"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (invitations.length === 0) {
    return (
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => {
            setIsExpanded(!isExpanded);
            setHasManuallyToggled(true);
          }}
        >
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <Users className="h-5 w-5" />
              Group Invitations
            </div>
          </CardTitle>
        </CardHeader>
        {isExpanded && (
          <CardContent>
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-medium text-foreground">No pending invitations</h3>
              <p className="text-muted-foreground">
                You don&apos;t have any group invitations at the moment.
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        className="cursor-pointer"
        onClick={() => {
          setIsExpanded(!isExpanded);
          setHasManuallyToggled(true);
        }}
        role="button"
        aria-label={`Group invitations, ${invitations.length} pending`}
      >
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <Users className="h-5 w-5" />
            Group Invitations ({invitations.length})
          </div>
          {!isExpanded && invitations.length > 0 && (
            <Badge className="bg-warning/20 text-warning-foreground dark:bg-warning/30">
              {invitations.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent
          className={cn('transition-all duration-200', isExpanded ? 'opacity-100' : 'opacity-0')}
        >
          <div className="space-y-1">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between rounded-md border bg-accent/50 p-2 transition-colors hover:bg-accent"
                role="group"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {/* Inviter Avatar */}
                  <UserAvatar
                    user={{
                      ...invitation.user,
                      email: invitation.user.email as string | null,
                      avatarUrl: invitation.user.avatarUrl ?? null,
                    }}
                    size="sm"
                    className="shrink-0"
                  />

                  {/* Group name with truncation */}
                  <h4 className="max-w-[150px] truncate text-sm font-medium sm:max-w-[200px]">
                    {invitation.group.name}
                  </h4>

                  {/* Pending badge - smaller */}
                  <Badge
                    variant="outline"
                    className="h-5 shrink-0 bg-warning/20 px-1.5 py-0.5 text-xs text-warning-foreground dark:bg-warning/30"
                  >
                    <Clock className="mr-0.5 h-2.5 w-2.5" />
                    Pending
                  </Badge>

                  {/* Inviter info - compressed */}
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    from {invitation.user.name || invitation.user.email}
                  </span>

                  {/* Date - only on larger screens */}
                  <span className="hidden text-xs text-muted-foreground md:inline">
                    • {new Date(invitation.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Action buttons - smaller but maintaining touch targets */}
                <div className="ml-2 flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeclineInvitation(invitation)}
                    disabled={respondToInvitationMutation.isPending}
                    className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                    <span className="sr-only">Decline</span>
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => handleAcceptInvitation(invitation)}
                    disabled={respondToInvitationMutation.isPending}
                    className="h-7 bg-success px-2 text-xs text-success-foreground hover:bg-success/90 dark:bg-success dark:text-success-foreground dark:hover:bg-success/80"
                  >
                    <Check className="mr-0.5 h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Accept</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export const UserInvitations = memo(UserInvitationsComponent);
