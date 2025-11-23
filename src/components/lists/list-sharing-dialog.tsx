'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { Check, Copy, Plus, Share, Trash, Mail, Users } from 'lucide-react';
import { useSession } from 'next-auth/react';

import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmailInput, isValidEmail } from '@/components/ui/email-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useToast } from '@/components/ui/use-toast';
import { groupsApi } from '@/lib/api/groups';
import { listsApi } from '@/lib/api/lists';
import { ListWithDetails } from '@/lib/services/list-service';

interface ListSharingDialogProps {
  list: ListWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CoManagerWithDetails {
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  addedAt: string;
  addedBy: {
    id: string;
    name: string | null;
  };
}

interface AccessItem {
  type: 'owner' | 'user' | 'group';
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string | null;
  role: string;
  memberCount?: number;
  isYou: boolean;
  canRemove: boolean;
}

export function ListSharingDialog({ list, open, onOpenChange }: ListSharingDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [groupToRemove, setGroupToRemove] = useState<{ id: string; name: string } | null>(null);
  const [coManagerEmail, setCoManagerEmail] = useState('');
  const [coManagerToRemove, setCoManagerToRemove] = useState<{
    userId: string;
    name: string;
  } | null>(null);
  const [visibility, setVisibility] = useState<'private' | 'public' | 'password'>(
    list.visibility as 'private' | 'public' | 'password'
  );
  const [password, setPassword] = useState('');
  const [fullShareUrl, setFullShareUrl] = useState<string>('');
  const [fullVanityUrl, setFullVanityUrl] = useState<string>('');

  // Hydrate full URLs after mount to avoid hydration mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (list.shareToken) {
        setFullShareUrl(`${window.location.origin}/share/${list.shareToken}`);
      }
      if (session?.user?.username && list.slug) {
        setFullVanityUrl(`${window.location.origin}/${session.user.username}/${list.slug}`);
      }
    }
  }, [list.shareToken, list.slug, session?.user?.username]);

  // Fetch user's groups
  const { data: groupsData } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupsApi.getGroups(),
    enabled: open,
  });

  const groups = groupsData?.items || [];

  // All groups where user is a member can be used for sharing
  const shareableGroups = groups; // Members can now share their lists with any group they belong to

  // Fetch groups where this list is shared
  const { data: sharedGroups = [], isLoading: isLoadingSharedGroups } = useQuery({
    queryKey: ['list-group-shares', list.id],
    queryFn: () => groupsApi.getGroupsForList(list.id),
    enabled: open && list.isOwner,
  });

  // Fetch co-managers for this list
  const { data: coManagersData, isLoading: isLoadingCoManagers } = useQuery({
    queryKey: ['list-admins', list.id],
    queryFn: async () => {
      const response = await fetch(`/api/lists/${list.id}/admins`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch co-managers');
      }
      const data = (await response.json()) as { admins: CoManagerWithDetails[] };
      return data.admins || [];
    },
    enabled: open && list.isOwner,
  });

  const coManagers = useMemo<CoManagerWithDetails[]>(() => coManagersData || [], [coManagersData]);

  // Unified access list combining owner, co-managers, and groups
  const accessItems = useMemo(() => {
    const items: AccessItem[] = [];

    // Owner (always first)
    items.push({
      type: 'owner',
      id: list.user.id,
      name: list.user.name || 'Unknown',
      email: list.user.email || undefined,
      avatarUrl: list.user.avatarUrl,
      role: 'Owner',
      isYou: list.user.id === session?.user?.id,
      canRemove: false,
    });

    // Co-managers
    coManagers.forEach((admin) => {
      items.push({
        type: 'user',
        id: admin.userId,
        name: admin.user.name || 'Unknown',
        email: admin.user.email || undefined,
        avatarUrl: admin.user.image,
        role: 'Co-manager',
        isYou: admin.userId === session?.user?.id,
        canRemove: Boolean(list.isOwner && admin.userId !== session?.user?.id),
      });
    });

    // Groups
    sharedGroups.forEach((group) => {
      items.push({
        type: 'group',
        id: group.id,
        name: group.name,
        memberCount: group._count?.members || 0,
        role: 'Shared',
        isYou: false,
        canRemove: Boolean(list.isOwner && group.currentUserRole === 'admin'),
      });
    });

    return items;
  }, [list, coManagers, sharedGroups, session?.user?.id]);

  // Update visibility mutation
  const updateVisibilityMutation = useMutation({
    mutationFn: async (data: {
      visibility: 'private' | 'public' | 'password';
      password?: string | null;
    }) => {
      return listsApi.updateList(list.id, data);
    },
    onSuccess: (updatedList) => {
      void queryClient.invalidateQueries({ queryKey: ['lists'] });
      void queryClient.invalidateQueries({ queryKey: ['lists', list.id] });
      // Update local state to match server
      setVisibility(updatedList.visibility);
      if (updatedList.visibility !== 'password') {
        setPassword('');
      }
      toast({
        title: 'Success!',
        description: 'Visibility settings updated',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update visibility',
        variant: 'destructive',
      });
    },
  });

  // Share with groups mutation
  const shareWithGroupsMutation = useMutation({
    mutationFn: async (groupIds: string[]) => {
      // Share the list with each selected group
      await Promise.all(
        groupIds.map((groupId) => groupsApi.shareLists(groupId, { listIds: [list.id] }))
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
      void queryClient.invalidateQueries({ queryKey: ['list-group-shares', list.id] });
      // Also invalidate list queries to update sharing indicators
      void queryClient.invalidateQueries({ queryKey: ['lists'] });
      void queryClient.invalidateQueries({ queryKey: ['lists', list.id] });
      setSelectedGroupIds([]);
      toast({
        title: 'Success!',
        description: 'List shared with selected groups',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to share list',
        variant: 'destructive',
      });
    },
  });

  // Remove list from group mutation
  const removeFromGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      await groupsApi.removeList(groupId, list.id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['list-group-shares', list.id] });
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
      void queryClient.invalidateQueries({ queryKey: ['lists'] });
      void queryClient.invalidateQueries({ queryKey: ['lists', list.id] });
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

  // Add co-manager mutation
  const addCoManagerMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await fetch(`/api/lists/${list.id}/admins`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        throw new Error(errorData.error || 'Failed to add co-manager');
      }

      return response.json() as Promise<CoManagerWithDetails>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['list-admins', list.id] });
      void queryClient.invalidateQueries({ queryKey: ['lists'] });
      void queryClient.invalidateQueries({ queryKey: ['lists', list.id] });
      setCoManagerEmail('');
      toast({
        title: 'Success!',
        description: 'Co-manager added successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add co-manager',
        variant: 'destructive',
      });
    },
  });

  // Remove co-manager mutation
  const removeCoManagerMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/lists/${list.id}/admins/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        throw new Error(errorData.error || 'Failed to remove co-manager');
      }

      return response.json() as Promise<{ success: boolean }>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['list-admins', list.id] });
      void queryClient.invalidateQueries({ queryKey: ['lists'] });
      void queryClient.invalidateQueries({ queryKey: ['lists', list.id] });
      toast({
        title: 'Success!',
        description: 'Co-manager removed successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove co-manager',
        variant: 'destructive',
      });
    },
  });

  const [copyTokenSuccess, setCopyTokenSuccess] = useState(false);
  const [copyVanitySuccess, setCopyVanitySuccess] = useState(false);

  const handleCopyShareLink = async () => {
    if (!list.shareToken) {
      toast({
        title: 'No share link',
        description: 'This list is not configured for public sharing',
        variant: 'destructive',
      });
      return;
    }

    const shareUrl = `${window.location.origin}/share/${list.shareToken}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyTokenSuccess(true);
      setTimeout(() => setCopyTokenSuccess(false), 2000);
      toast({
        title: 'Share link copied',
        description: 'The share link has been copied to your clipboard',
      });
    } catch (err) {
      console.error('Failed to copy:', err);
      toast({
        title: 'Copy failed',
        description: 'Failed to copy share link to clipboard',
        variant: 'destructive',
      });
    }
  };

  const handleCopyVanityUrl = async () => {
    // Use session username since vanity URLs are only for current user's lists
    const username = session?.user?.username;

    if (!username || !list.slug) {
      toast({
        title: 'No vanity URL',
        description: 'This list does not have a custom URL',
        variant: 'destructive',
      });
      return;
    }

    const vanityUrl = `${window.location.origin}/${username}/${list.slug}`;

    try {
      await navigator.clipboard.writeText(vanityUrl);
      setCopyVanitySuccess(true);
      setTimeout(() => setCopyVanitySuccess(false), 2000);
      toast({
        title: 'Vanity URL copied',
        description: 'The custom URL has been copied to your clipboard',
      });
    } catch (err) {
      console.error('Failed to copy:', err);
      toast({
        title: 'Copy failed',
        description: 'Failed to copy vanity URL to clipboard',
        variant: 'destructive',
      });
    }
  };

  const handleVisibilityChange = (newVisibility: 'private' | 'public' | 'password') => {
    setVisibility(newVisibility);

    // If not password, update immediately
    if (newVisibility !== 'password') {
      updateVisibilityMutation.mutate({ visibility: newVisibility, password: null });
    }
    // If password, wait for user to enter password
  };

  const handlePasswordSubmit = () => {
    if (visibility === 'password' && !password.trim()) {
      toast({
        title: 'Password required',
        description: 'Please enter a password for password-protected visibility',
        variant: 'destructive',
      });
      return;
    }

    updateVisibilityMutation.mutate({
      visibility,
      password: visibility === 'password' ? password : null,
    });
  };

  const handleShareWithGroups = () => {
    if (selectedGroupIds.length === 0) {
      toast({
        title: 'No groups selected',
        description: 'Please select at least one group to share with',
        variant: 'destructive',
      });
      return;
    }

    shareWithGroupsMutation.mutate(selectedGroupIds);
  };

  const handleRemoveFromGroup = (groupId: string, groupName: string) => {
    setGroupToRemove({ id: groupId, name: groupName });
  };

  const handleAddCoManager = () => {
    if (!coManagerEmail.trim()) {
      toast({
        title: 'Email required',
        description: 'Please enter an email address',
        variant: 'destructive',
      });
      return;
    }

    if (!isValidEmail(coManagerEmail)) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    addCoManagerMutation.mutate(coManagerEmail.trim());
  };

  const handleRemoveCoManager = (userId: string, name: string) => {
    setCoManagerToRemove({ userId, name });
  };

  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share className="h-5 w-5" />
            Manage Access
          </DialogTitle>
          <DialogDescription>
            Control who can view &quot;{list.name}&quot; by sharing with groups or co-managers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Who Can See This - Unified access list */}
          {list.isOwner && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Who Can See This</CardTitle>
                <div className="space-y-3 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="visibility">Visibility</Label>
                    <Select value={visibility} onValueChange={handleVisibilityChange}>
                      <SelectTrigger id="visibility">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">Private - Only you and co-managers</SelectItem>
                        <SelectItem value="public">Public - Anyone with link</SelectItem>
                        <SelectItem value="password">Password Protected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {visibility === 'password' && (
                    <div className="space-y-2">
                      <Label htmlFor="list-password">Password</Label>
                      <div className="flex gap-2">
                        <Input
                          id="list-password"
                          type="password"
                          placeholder="Enter password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          disabled={updateVisibilityMutation.isPending}
                        />
                        <Button
                          size="sm"
                          onClick={handlePasswordSubmit}
                          disabled={updateVisibilityMutation.isPending || !password.trim()}
                        >
                          {updateVisibilityMutation.isPending ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Anyone with the link and this password can view the list
                      </p>
                    </div>
                  )}

                  {/* Share Links - Show when list is public or password protected */}
                  {(visibility === 'public' || visibility === 'password') && list.shareToken && (
                    <div className="space-y-3 border-t pt-4">
                      <Label>Share Links</Label>

                      {/* Token URL */}
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Standard Link</p>
                        <div className="flex gap-2">
                          <Input
                            value={fullShareUrl || `/share/${list.shareToken}`}
                            readOnly
                            className="text-sm transition-opacity duration-75"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleCopyShareLink()}
                            className="flex-shrink-0"
                          >
                            {copyTokenSuccess ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Vanity URL - Only show if user has username and list has slug */}
                      {session?.user?.username && list.slug ? (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">Custom URL</p>
                          <div className="flex gap-2">
                            <Input
                              value={fullVanityUrl || `/${session.user.username}/${list.slug}`}
                              readOnly
                              className="text-sm transition-opacity duration-75"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void handleCopyVanityUrl()}
                              className="flex-shrink-0"
                            >
                              {copyVanitySuccess ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Easier to remember and share
                          </p>
                        </div>
                      ) : (
                        <>
                          {!session?.user?.username && (
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950">
                              <p className="text-xs text-blue-800 dark:text-blue-200">
                                💡 Want a custom URL? Set your username in{' '}
                                <a href="/profile" className="font-medium underline">
                                  Profile Settings
                                </a>
                                , then edit this list to add a custom slug.
                              </p>
                            </div>
                          )}
                          {session?.user?.username && !list.slug && (
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950">
                              <p className="text-xs text-blue-800 dark:text-blue-200">
                                💡 Want a custom URL? Edit this list and add a custom slug in the
                                form.
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingCoManagers || isLoadingSharedGroups ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex animate-pulse items-center justify-between rounded-lg bg-secondary p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-muted"></div>
                          <div className="space-y-1">
                            <div className="h-4 w-32 rounded bg-muted"></div>
                            <div className="h-3 w-24 rounded bg-muted"></div>
                          </div>
                        </div>
                        <div className="h-8 w-16 rounded bg-muted"></div>
                      </div>
                    ))}
                  </div>
                ) : accessItems.length === 1 ? (
                  <div className="space-y-4">
                    {/* Show owner when list is private */}
                    {accessItems.map((item) => (
                      <div
                        key={`${item.type}-${item.id}`}
                        className="flex items-center justify-between rounded-lg bg-secondary p-3"
                      >
                        <div className="flex items-center gap-3">
                          {item.type === 'group' ? (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                              <Users className="h-5 w-5 text-muted-foreground" />
                            </div>
                          ) : (
                            <UserAvatar
                              user={{
                                id: item.id,
                                name: item.name,
                                email: item.email || null,
                                avatarUrl: item.avatarUrl ?? null,
                              }}
                              size="md"
                            />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{item.name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {item.role}
                              </Badge>
                              {item.isYou && (
                                <Badge variant="outline" className="text-xs">
                                  You
                                </Badge>
                              )}
                            </div>
                            {item.email && (
                              <div className="text-sm text-muted-foreground">{item.email}</div>
                            )}
                            {item.memberCount !== undefined && (
                              <div className="text-sm text-muted-foreground">
                                {item.memberCount} {item.memberCount === 1 ? 'member' : 'members'}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <p className="text-center text-sm text-muted-foreground">
                      This list is private. Add people or groups below to share it.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {accessItems.map((item) => (
                      <div
                        key={`${item.type}-${item.id}`}
                        className="flex items-center justify-between rounded-lg bg-secondary p-3"
                      >
                        <div className="flex items-center gap-3">
                          {item.type === 'group' ? (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                              <Users className="h-5 w-5 text-muted-foreground" />
                            </div>
                          ) : (
                            <UserAvatar
                              user={{
                                id: item.id,
                                name: item.name,
                                email: item.email || null,
                                avatarUrl: item.avatarUrl ?? null,
                              }}
                              size="md"
                            />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{item.name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {item.role}
                              </Badge>
                              {item.isYou && (
                                <Badge variant="outline" className="text-xs">
                                  You
                                </Badge>
                              )}
                            </div>
                            {item.email && (
                              <div className="text-sm text-muted-foreground">{item.email}</div>
                            )}
                            {item.memberCount !== undefined && (
                              <div className="text-sm text-muted-foreground">
                                {item.memberCount} {item.memberCount === 1 ? 'member' : 'members'}
                              </div>
                            )}
                          </div>
                        </div>

                        {item.canRemove && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (item.type === 'user') {
                                handleRemoveCoManager(item.id, item.name);
                              } else if (item.type === 'group') {
                                handleRemoveFromGroup(item.id, item.name);
                              }
                            }}
                            disabled={
                              removeCoManagerMutation.isPending || removeFromGroupMutation.isPending
                            }
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Add Access - Unified section for adding co-managers and sharing with groups */}
          {list.isOwner && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add Access</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Add Co-manager */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Add Co-manager</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Co-managers can add or remove wishes from this list, but cannot delete the
                      list or change sharing settings.
                    </p>
                    <div className="flex gap-2">
                      <EmailInput
                        value={coManagerEmail}
                        onChange={setCoManagerEmail}
                        onSubmit={handleAddCoManager}
                        placeholder="Enter email address"
                        disabled={addCoManagerMutation.isPending}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleAddCoManager}
                        disabled={!coManagerEmail.trim() || addCoManagerMutation.isPending}
                        size="sm"
                      >
                        {addCoManagerMutation.isPending ? (
                          'Adding...'
                        ) : (
                          <>
                            <Plus className="mr-2 h-4 w-4" />
                            Add
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Share with Groups */}
                  <div className="space-y-3 border-t pt-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Share with Groups</span>
                    </div>

                    {shareableGroups.length === 0 ? (
                      <div className="py-4 text-center text-muted-foreground">
                        <Users className="mx-auto mb-2 h-8 w-8 opacity-50" />
                        <p className="text-sm">You&apos;re not part of any groups yet.</p>
                        <p className="text-xs">
                          Create or join a group to share lists with family and friends.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {shareableGroups
                            .filter((group) => !sharedGroups.find((sg) => sg.id === group.id))
                            .map((group) => (
                              <div
                                key={group.id}
                                role="button"
                                tabIndex={0}
                                className={`cursor-pointer rounded-lg border-2 p-3 transition-colors ${
                                  selectedGroupIds.includes(group.id)
                                    ? 'border-info bg-info/10 dark:border-info/70 dark:bg-info/5'
                                    : 'border-border hover:border-border/80'
                                } `}
                                onClick={() => toggleGroupSelection(group.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    toggleGroupSelection(group.id);
                                  }
                                }}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex min-w-0 flex-1 items-center gap-2">
                                    {group.avatarUrl ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={group.avatarUrl}
                                        alt={group.name}
                                        className="h-8 w-8 flex-shrink-0 rounded-full"
                                      />
                                    ) : (
                                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                    )}

                                    <div className="min-w-0 flex-1">
                                      <div className="truncate font-medium">{group.name}</div>
                                      <div className="text-xs text-muted-foreground">
                                        {group._count.members} members
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex flex-shrink-0 items-center gap-2">
                                    {group.currentUserRole && (
                                      <Badge variant="outline" className="text-xs">
                                        {group.currentUserRole === 'admin' ? 'Admin' : 'Member'}
                                      </Badge>
                                    )}
                                    {selectedGroupIds.includes(group.id) && (
                                      <Check className="h-4 w-4 text-info" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>

                        {shareableGroups.filter(
                          (group) => !sharedGroups.find((sg) => sg.id === group.id)
                        ).length === 0 && (
                          <p className="py-4 text-center text-sm text-muted-foreground">
                            All your groups already have access to this list.
                          </p>
                        )}

                        {shareableGroups.filter(
                          (group) => !sharedGroups.find((sg) => sg.id === group.id)
                        ).length > 0 && (
                          <Button
                            onClick={handleShareWithGroups}
                            disabled={
                              selectedGroupIds.length === 0 || shareWithGroupsMutation.isPending
                            }
                            className="w-full"
                          >
                            {shareWithGroupsMutation.isPending ? (
                              'Sharing...'
                            ) : (
                              <>
                                <Plus className="mr-2 h-4 w-4" />
                                Share with {selectedGroupIds.length}{' '}
                                {selectedGroupIds.length === 1 ? 'Group' : 'Groups'}
                              </>
                            )}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Remove from Group Confirm Dialog */}
        <ConfirmDialog
          open={!!groupToRemove}
          onOpenChange={(open) => !open && setGroupToRemove(null)}
          title="Remove List from Group"
          description={`Are you sure you want to remove this list from "${groupToRemove?.name}"? Members of this group will no longer be able to see this list.`}
          confirmText="Remove"
          variant="destructive"
          onConfirm={() => {
            if (groupToRemove) {
              removeFromGroupMutation.mutate(groupToRemove.id);
              setGroupToRemove(null);
            }
          }}
        />

        {/* Remove Co-manager Confirm Dialog */}
        <ConfirmDialog
          open={!!coManagerToRemove}
          onOpenChange={(open) => !open && setCoManagerToRemove(null)}
          title="Remove Co-manager"
          description={`Are you sure you want to remove "${coManagerToRemove?.name}" as a co-manager? They will no longer be able to edit this list.`}
          confirmText="Remove"
          variant="destructive"
          onConfirm={() => {
            if (coManagerToRemove) {
              removeCoManagerMutation.mutate(coManagerToRemove.userId);
              setCoManagerToRemove(null);
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
