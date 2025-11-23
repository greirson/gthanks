'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Clock, X } from 'lucide-react';

import { memo } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { UserAvatar } from '@/components/ui/user-avatar';
import { GroupInvitationDetails } from '@/lib/services/group-types';

function UserInvitationsComponent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's pending invitations
  const {
    data: invitationsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['user-invitations'],
    queryFn: async () => {
      const response = await fetch('/api/user/invitations');
      if (!response.ok) {
        if (response.status === 404) {
          return []; // No invitations
        }
        throw new Error('Failed to fetch invitations');
      }
      const data = await response.json();
      // API returns { invitations: [...], pagination: {...} }, extract invitations array
      return (data.invitations || data) as GroupInvitationDetails[];
    },
  });

  // Ensure invitations is always an array
  const invitations = Array.isArray(invitationsData) ? invitationsData : [];

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

      return response.json() as Promise<{ success: boolean }>;
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

  if (isLoading) {
    return (
      <div className="space-y-3" role="status" aria-live="polite">
        <span className="sr-only">Loading invitations...</span>
        {Array.from({ length: 2 }, (_, i) => (
          <div
            key={i}
            className="flex animate-pulse items-center justify-between rounded-lg border bg-muted/50 p-4"
            data-testid="loading-skeleton"
            aria-hidden="true"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted"></div>
              <div className="space-y-2">
                <div className="h-4 w-32 rounded bg-muted"></div>
                <div className="h-3 w-24 rounded bg-muted"></div>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-8 rounded bg-muted"></div>
              <div className="h-8 w-20 rounded bg-muted"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 dark:border-destructive/40 dark:bg-destructive/5"
        role="alert"
      >
        <p className="text-sm text-destructive">
          Failed to load invitations. Please try again later.
        </p>
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Clock className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mb-2 text-lg font-medium text-foreground">No pending invitations</h3>
        <p className="text-sm text-muted-foreground">
          You don&apos;t have any group invitations at the moment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3" role="list">
      {invitations.map((invitation) => (
        <div
          key={invitation.id}
          className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
          role="listitem"
          aria-label={`Invitation from ${invitation.user.name || invitation.user.email} to join ${invitation.group.name}`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {/* Inviter Avatar */}
            <UserAvatar
              user={{
                ...invitation.user,
                email: invitation.user.email as string | null,
                avatarUrl: invitation.user.avatarUrl ?? null,
              }}
              size="sm"
              className="shrink-0"
              aria-label={`${invitation.user.name || invitation.user.email}'s avatar`}
            />

            {/* Group info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="truncate text-sm font-semibold text-foreground">
                  {invitation.group.name}
                </h4>
                <Badge
                  variant="outline"
                  className="shrink-0 bg-warning/20 px-2 py-0.5 text-xs text-warning-foreground dark:bg-warning/30"
                  aria-label="Invitation pending"
                >
                  <Clock className="mr-1 h-3 w-3" aria-hidden="true" />
                  Pending
                </Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Invited by {invitation.user.name || invitation.user.email}
                <span className="hidden md:inline">
                  {' '}
                  •{' '}
                  <time dateTime={new Date(invitation.createdAt).toISOString()}>
                    {new Date(invitation.createdAt).toLocaleDateString()}
                  </time>
                </span>
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="ml-3 flex shrink-0 gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeclineInvitation(invitation)}
              disabled={respondToInvitationMutation.isPending}
              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Decline invitation from ${invitation.user.name || invitation.user.email} to join ${invitation.group.name}`}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>

            <Button
              size="sm"
              onClick={() => handleAcceptInvitation(invitation)}
              disabled={respondToInvitationMutation.isPending}
              className="h-8 bg-success px-3 text-xs font-medium text-success-foreground hover:bg-success/90 dark:bg-success dark:text-success-foreground dark:hover:bg-success/80"
              aria-label={`Accept invitation from ${invitation.user.name || invitation.user.email} to join ${invitation.group.name}`}
            >
              <Check className="mr-1 h-4 w-4" aria-hidden="true" />
              Accept
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export const UserInvitations = memo(UserInvitationsComponent);
