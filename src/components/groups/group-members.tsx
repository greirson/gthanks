'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Crown, MoreVertical, UserMinus, UserPlus } from 'lucide-react';

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
import { useToast } from '@/components/ui/use-toast';
import { UserAvatar } from '@/components/ui/user-avatar';
import { apiGet } from '@/lib/api-client';
import { GroupMembersResponseSchema } from '@/lib/validators/api-responses';
import { getRoleColor } from '@/lib/utils/visibility-badges';

interface GroupMembersProps {
  groupId: string;
  currentUserRole?: 'admin' | 'member';
}

export function GroupMembers({ groupId, currentUserRole }: GroupMembersProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newMemberEmail, setNewMemberEmail] = useState('');

  const isAdmin = currentUserRole === 'admin';

  // Fetch group members
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      return apiGet(`/api/groups/${groupId}/members`, GroupMembersResponseSchema);
    },
  });

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await fetch(`/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: 'member' }),
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error || 'Failed to add member');
      }

      return response.json() as Promise<unknown>;
    },
    onSuccess: () => {
      // Comprehensive cache invalidation for immediate updates
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['group-members', groupId] }),
        queryClient.invalidateQueries({ queryKey: ['groups'] }),
        queryClient.invalidateQueries({ queryKey: ['groups', 'count'] }),
        queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'base'] }),
      ]);

      setNewMemberEmail('');
      toast({
        title: 'Success!',
        description: 'Member added to group',
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
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error || 'Failed to remove member');
      }

      return response.json() as Promise<unknown>;
    },
    onSuccess: () => {
      // Comprehensive cache invalidation for immediate updates
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['group-members', groupId] }),
        queryClient.invalidateQueries({ queryKey: ['groups'] }),
        queryClient.invalidateQueries({ queryKey: ['groups', 'count'] }),
        queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'base'] }),
      ]);

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

  const handleAddMember = () => {
    if (!newMemberEmail.trim()) {
      return;
    }
    addMemberMutation.mutate(newMemberEmail.trim());
  };

  const handleRemoveMember = (userId: string) => {
    removeMemberMutation.mutate(userId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Group Members</CardTitle>
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Group Members ({members.length})</span>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Input
                type="email"
                placeholder="Email address"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                className="w-64"
              />
              <Button
                onClick={handleAddMember}
                disabled={!newMemberEmail.trim() || addMemberMutation.isPending}
                size="sm"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Add Member
              </Button>
            </div>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent>
        {members.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No members in this group yet.
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.userId}
                className="flex items-center justify-between rounded-md bg-secondary p-3"
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
                  <Badge
                    variant="secondary"
                    className={`${getRoleColor(member.role, 'default')} flex items-center gap-1`}
                  >
                    {member.role === 'admin' && <Crown className="h-3 w-3" />}
                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                  </Badge>

                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label="More options">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleRemoveMember(member.userId)}
                          className="text-destructive"
                          disabled={removeMemberMutation.isPending}
                        >
                          <UserMinus className="mr-2 h-4 w-4" />
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
