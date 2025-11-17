'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Clock, Mail, MoreVertical, Send, X } from 'lucide-react';

import { useState } from 'react';

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
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { GroupInvitationDetails } from '@/lib/services/group-types';

// RFC 5322 compliant email validation (simplified)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface GroupInvitationsProps {
  groupId: string;
  currentUserRole?: 'admin' | 'member';
}

export function GroupInvitations({ groupId, currentUserRole }: GroupInvitationsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [inviteEmails, setInviteEmails] = useState('');
  const [isInviteFormOpen, setIsInviteFormOpen] = useState(false);

  const isAdmin = currentUserRole === 'admin';

  // Fetch group invitations
  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ['group-invitations', groupId],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${groupId}/invitations`);
      if (!response.ok) {
        throw new Error('Failed to fetch invitations');
      }
      return response.json() as Promise<GroupInvitationDetails[]>;
    },
    enabled: isAdmin, // Only admins can see invitations
  });

  // Send invitations mutation
  const sendInvitationsMutation = useMutation({
    mutationFn: async (emails: string[]) => {
      const response = await fetch(`/api/groups/${groupId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails }),
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error || 'Failed to send invitations');
      }

      return response.json() as Promise<unknown>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['group-invitations', groupId] });
      setInviteEmails('');
      setIsInviteFormOpen(false);
      toast({
        title: 'Success!',
        description: 'Invitations sent successfully',
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

  // Cancel invitation mutation
  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await fetch(`/api/groups/${groupId}/invitations/${invitationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error || 'Failed to cancel invitation');
      }

      return response.json() as Promise<unknown>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['group-invitations', groupId] });
      toast({
        title: 'Success!',
        description: 'Invitation cancelled',
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

  const handleSendInvitations = () => {
    // Parse and validate all email inputs
    const allInputs = inviteEmails.split(',').map(e => e.trim()).filter(e => e);
    const validEmails = allInputs.filter(email => EMAIL_REGEX.test(email));
    const invalidCount = allInputs.length - validEmails.length;

    // Check if we have any valid emails
    if (validEmails.length === 0) {
      toast({
        title: 'Invalid Email Format',
        description: allInputs.length > 0
          ? `${invalidCount} invalid email${invalidCount !== 1 ? 's' : ''} found. Please check the format (e.g., user@example.com)`
          : 'Please enter at least one email address',
        variant: 'destructive',
      });
      return;
    }

    // Show warning if some emails were filtered out
    if (invalidCount > 0) {
      toast({
        title: 'Some Emails Skipped',
        description: `${invalidCount} invalid email${invalidCount !== 1 ? 's were' : ' was'} removed. Proceeding with ${validEmails.length} valid email${validEmails.length !== 1 ? 's' : ''}.`,
      });
    }

    sendInvitationsMutation.mutate(validEmails);
  };

  const handleCancelInvitation = (invitationId: string) => {
    cancelInvitationMutation.mutate(invitationId);
  };

  const getStatusColor = (acceptedAt: Date | null) => {
    if (acceptedAt) {
      return 'bg-success/10 text-success';
    }
    return 'bg-warning/10 text-warning';
  };

  const getStatusIcon = (acceptedAt: Date | null) => {
    if (acceptedAt) {
      return <Check className="h-4 w-4" />;
    }
    return <Clock className="h-4 w-4" />;
  };

  const getStatusText = (acceptedAt: Date | null) => {
    if (acceptedAt) {
      return 'Accepted';
    }
    return 'Pending';
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invitations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            Only group administrators can manage invitations.
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Group Invitations</CardTitle>
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
          <span>Group Invitations ({invitations.length})</span>
          <Button onClick={() => setIsInviteFormOpen(!isInviteFormOpen)} size="sm">
            <Mail className="mr-2 h-4 w-4" />
            Invite Members
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Invite Form */}
        {isInviteFormOpen && (
          <div className="space-y-4 rounded-md bg-secondary p-4">
            <div>
              <Label htmlFor="invite-emails">Email Addresses</Label>
              <Input
                id="invite-emails"
                placeholder="user1@example.com, user2@example.com"
                value={inviteEmails}
                onChange={(e) => setInviteEmails(e.target.value)}
                className="mt-1"
              />
              <p className="mt-1 text-sm text-muted-foreground">
                Enter multiple email addresses separated by commas
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsInviteFormOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSendInvitations}
                disabled={!inviteEmails.trim() || sendInvitationsMutation.isPending}
              >
                <Send className="mr-2 h-4 w-4" />
                Send Invitations
              </Button>
            </div>
          </div>
        )}

        {/* Invitations List */}
        {invitations.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">No pending invitations.</div>
        ) : (
          <div className="space-y-3">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between rounded-md bg-secondary p-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{invitation.email}</span>
                    <Badge
                      variant="secondary"
                      className={`${getStatusColor(invitation.acceptedAt)} flex items-center gap-1`}
                    >
                      {getStatusIcon(invitation.acceptedAt)}
                      {getStatusText(invitation.acceptedAt)}
                    </Badge>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Invited by {invitation.inviter.name || invitation.inviter.email} •{' '}
                    {new Date(invitation.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="ml-4 flex items-center gap-2">
                  {!invitation.acceptedAt && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="More options">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleCancelInvitation(invitation.id)}
                          className="text-destructive"
                          disabled={cancelInvitationMutation.isPending}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Cancel Invitation
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
