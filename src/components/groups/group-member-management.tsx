'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Crown, Mail, MoreVertical, UserMinus, UserPlus, X } from 'lucide-react';

import { useMemo, useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { UserAvatar } from '@/components/ui/user-avatar';
import { GroupInvitationDetails, GroupMemberDetails } from '@/lib/services/group-types';

/**
 * Props for the GroupMemberManagement component
 */
interface GroupMemberManagementProps {
  /** The ID of the group to manage members for */
  groupId: string;
  /** The current user's role in the group - determines available actions */
  currentUserRole?: 'admin' | 'member';
}

/**
 * Unified member management component for groups
 *
 * This component replaces the previous tab-based interface, providing a single
 * unified view for managing both current members and pending invitations.
 *
 * Features:
 * - Smart email input with auto-detection of existing users vs new invitations
 * - Real-time display of pending invitations alongside current members
 * - Inline role management with single-click promote/demote for admins
 * - Accessible interface with proper ARIA labels and keyboard navigation
 *
 * @param {GroupMemberManagementProps} props - Component props
 * @returns {JSX.Element} The unified member management interface
 *
 * @example
 * ```tsx
 * // For admin users
 * <GroupMemberManagement groupId="group-123" currentUserRole="admin" />
 *
 * // For regular members (read-only view)
 * <GroupMemberManagement groupId="group-123" currentUserRole="member" />
 * ```
 */
export function GroupMemberManagement({ groupId, currentUserRole }: GroupMemberManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [ariaAnnouncement, setAriaAnnouncement] = useState<string>('');
  const [networkError, setNetworkError] = useState<string | null>(null);

  const isAdmin = currentUserRole === 'admin';

  // Fetch group members
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${groupId}/members`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch members');
      }
      return response.json() as Promise<GroupMemberDetails[]>;
    },
  });

  // Fetch group invitations (admin only)
  const { data: invitations = [], isLoading: invitationsLoading } = useQuery({
    queryKey: ['group-invitations', groupId],
    queryFn: async () => {
      const response = await fetch(`/api/groups/${groupId}/invitations`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch invitations');
      }
      const data = (await response.json()) as { invitations: GroupInvitationDetails[] };
      return data.invitations || [];
    },
    enabled: isAdmin,
  });

  // Add member/send invitation mutation - UPDATED TO USE INVITATIONS ENDPOINT
  const addMemberMutation = useMutation({
    mutationFn: async (email: string) => {
      // Use the invitations endpoint for ALL users (consent-based flow)
      const response = await fetch(`/api/groups/${groupId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: [email.trim()] }), // Changed to emails array format
        credentials: 'include',
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error || 'Failed to send invitation');
      }

      return response.json() as Promise<{
        sent: number;
        skipped: string[];
        total: number;
      }>;
    },
    onSuccess: (data, email) => {
      void queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
      void queryClient.invalidateQueries({ queryKey: ['group-invitations', groupId] });
      void queryClient.invalidateQueries({ queryKey: ['user-invitations'] }); // Add this to update badge
      setEmailInput('');
      setEmailError(null);
      setNetworkError(null);

      // Handle the new response format
      if (data.sent > 0) {
        toast({
          title: 'Invitation sent',
          description: `Invitation sent to ${email}. They will receive an email and must accept to join.`,
        });
        setAriaAnnouncement(`Invitation sent to ${email}`);
      } else if (data.skipped?.includes(email)) {
        toast({
          title: 'Already invited',
          description: `${email} already has a pending invitation or is already a member.`,
        });
        setAriaAnnouncement(`${email} already invited or is a member`);
      }
    },
    onError: (error: Error) => {
      setNetworkError('Failed to send invitation. Please try again.');
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update member role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'member' }) => {
      const response = await fetch(`/api/groups/${groupId}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error || 'Failed to update role');
      }

      return response.json() as Promise<unknown>;
    },
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });

      // Find the member to get their name for the announcement
      const member = members.find((m) => m.userId === variables.userId);
      if (member && member.user) {
        const userName = member.user.name || member.user.email;
        const action = variables.role === 'admin' ? 'promoted to admin' : 'demoted to member';
        setAriaAnnouncement(`${userName} ${action}`);
      }

      toast({
        title: 'Success!',
        description: 'Member role updated',
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

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/groups/${groupId}/members/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error || 'Failed to remove member');
      }

      return response.json() as Promise<unknown>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
      toast({
        title: 'Success!',
        description: 'Member removed from group',
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
        credentials: 'include',
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

  // Smart email detection
  const emailStatus = useMemo(() => {
    if (!emailInput || !emailInput.includes('@')) {
      return null;
    }

    // Check if email belongs to existing member
    const existingMember = Array.isArray(members)
      ? members.find((member) => member.user?.email?.toLowerCase() === emailInput.toLowerCase())
      : undefined;
    if (existingMember) {
      return { type: 'existing-member' as const, message: 'Already a member' };
    }

    // Check if email has pending invitation
    const pendingInvitation = Array.isArray(invitations)
      ? invitations.find(
          (inv) => inv.email?.toLowerCase() === emailInput.toLowerCase() && !inv.acceptedAt
        )
      : undefined;
    if (pendingInvitation) {
      return { type: 'pending-invitation' as const, message: 'Invitation already sent' };
    }

    // All emails will go through invitation flow now
    return { type: 'new-invitation' as const, message: 'Will send invitation' };
  }, [emailInput, members, invitations]);

  const handleAddMember = () => {
    if (!emailInput.trim() || !emailInput.includes('@')) {
      setEmailError('Please enter a valid email address');
      return;
    }

    // Don't add if already a member or has pending invitation
    if (emailStatus?.type === 'existing-member' || emailStatus?.type === 'pending-invitation') {
      return;
    }

    addMemberMutation.mutate(emailInput.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddMember();
    }
  };

  const handleUpdateRole = (userId: string, newRole: 'admin' | 'member') => {
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  const handleRemoveMember = (userId: string) => {
    removeMemberMutation.mutate(userId);
  };

  const handleCancelInvitation = (invitationId: string) => {
    cancelInvitationMutation.mutate(invitationId);
  };

  const isLoading = membersLoading || (isAdmin && invitationsLoading);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="flex animate-pulse items-center justify-between rounded-md bg-secondary p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted"></div>
                  <div className="space-y-1">
                    <div className="h-4 w-24 rounded bg-muted"></div>
                    <div className="h-3 w-32 rounded bg-muted"></div>
                  </div>
                </div>
                <div className="h-6 w-16 rounded bg-muted"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingInvitations =
    isAdmin && Array.isArray(invitations) ? invitations.filter((inv) => !inv.acceptedAt) : [];
  const totalCount = (Array.isArray(members) ? members.length : 0) + pendingInvitations.length;

  // Check if current user is the last admin
  const adminCount = Array.isArray(members) ? members.filter((m) => m.role === 'admin').length : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Members ({totalCount})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ARIA Live Region for announcements */}
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {ariaAnnouncement}
        </div>

        {/* Network error alert */}
        {networkError && (
          <Alert variant="destructive" data-testid="error-alert">
            <AlertDescription>{networkError}</AlertDescription>
          </Alert>
        )}

        {/* Add member input - admin only */}
        {isAdmin && (
          <div className="space-y-2" data-testid="add-member-section">
            <div className="flex items-center gap-2">
              <Input
                type="email"
                placeholder="Enter email address"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  // Validate email on change
                  if (e.target.value && !e.target.value.includes('@')) {
                    setEmailError('Please enter a valid email address');
                  } else {
                    setEmailError(null);
                  }
                }}
                onKeyDown={handleKeyDown}
                onBlur={() => {
                  // Validate on blur
                  if (emailInput && !emailInput.includes('@')) {
                    setEmailError('Please enter a valid email address');
                  }
                }}
                className="flex-1"
                data-testid="member-email-input"
              />
              <Button
                onClick={handleAddMember}
                disabled={
                  !emailInput.trim() ||
                  !emailInput.includes('@') ||
                  !!emailError ||
                  addMemberMutation.isPending ||
                  emailStatus?.type === 'existing-member' ||
                  emailStatus?.type === 'pending-invitation'
                }
                size="sm"
                className="min-h-[44px] min-w-[44px]"
                data-testid="add-member-button"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>
            {emailError && (
              <p className="text-sm text-destructive" data-testid="email-error">
                {emailError}
              </p>
            )}
            {emailStatus && !emailError && (
              <p className="text-sm text-muted-foreground" data-testid="email-status">
                {emailStatus.message}
              </p>
            )}
          </div>
        )}

        {/* Members and invitations list */}
        <div className="space-y-3">
          {/* Current members */}
          {Array.isArray(members) &&
            members.map((member) =>
              member?.user ? (
                <div
                  key={member.userId}
                  className="flex items-center justify-between rounded-md bg-secondary p-3"
                  data-testid={`member-${member.userId}`}
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      user={{
                        id: member.user.id,
                        name: member.user.name || null,
                        email: member.user.email,
                        avatarUrl: member.user.avatarUrl || null,
                      }}
                      size="lg"
                    />
                    <div>
                      <div className="font-medium">{member.user.name || 'Unnamed User'}</div>
                      <div className="text-sm text-muted-foreground">{member.user.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {member.role === 'admin' && (
                      <Badge
                        variant="secondary"
                        className="bg-primary/10 text-primary"
                        data-testid="role-badge"
                      >
                        <Crown className="mr-1 h-3 w-3" />
                        Admin
                      </Badge>
                    )}

                    {isAdmin && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="min-h-[44px] min-w-[44px]"
                            aria-label="More options"
                            data-testid="member-actions-button"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {member.role === 'member' ? (
                            <DropdownMenuItem
                              onClick={() => handleUpdateRole(member.userId, 'admin')}
                              disabled={updateRoleMutation.isPending}
                              data-testid="action-make-admin"
                            >
                              <Crown className="mr-2 h-4 w-4" />
                              Make Admin
                            </DropdownMenuItem>
                          ) : (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div>
                                    <DropdownMenuItem
                                      onClick={() => handleUpdateRole(member.userId, 'member')}
                                      disabled={updateRoleMutation.isPending || adminCount === 1}
                                      data-testid="action-remove-admin"
                                      onSelect={(e) => {
                                        if (adminCount === 1) {
                                          e.preventDefault();
                                        }
                                      }}
                                    >
                                      <UserMinus className="mr-2 h-4 w-4" />
                                      Remove Admin
                                    </DropdownMenuItem>
                                  </div>
                                </TooltipTrigger>
                                {adminCount === 1 && (
                                  <TooltipContent>
                                    <p>Cannot remove the last admin</p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleRemoveMember(member.userId)}
                            className="text-destructive"
                            disabled={removeMemberMutation.isPending}
                          >
                            <X className="mr-2 h-4 w-4" />
                            Remove from Group
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ) : null
            )}

          {/* Pending invitations */}
          {isAdmin &&
            pendingInvitations.length > 0 &&
            pendingInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between rounded-md bg-secondary p-3"
                data-testid={`invitation-${invitation.email}`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-medium">{invitation.email}</div>
                    <div className="text-sm text-muted-foreground">
                      Invited by {invitation.user?.name || invitation.user?.email || 'Unknown'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-warning/10 text-warning">
                    <Clock className="mr-1 h-3 w-3" />
                    Pending
                  </Badge>

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
                        onClick={() => handleCancelInvitation(invitation.id)}
                        className="text-destructive"
                        disabled={cancelInvitationMutation.isPending}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Cancel Invitation
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
