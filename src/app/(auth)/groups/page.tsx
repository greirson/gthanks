'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Mail, Filter } from 'lucide-react';

import { useState } from 'react';

import { useRouter } from 'next/navigation';
import { ViewToggle } from '@/components/ui/view-toggle';

import { GroupForm, InvitationsModal } from '@/components/groups';
import { GroupGrid } from '@/components/groups/group-grid';
import { GroupControlsBar } from '@/components/groups/group-controls-bar';
import { GroupFilterPanel } from '@/components/groups/filters/GroupFilterPanel';
import { MobileGroupFilterSheet } from '@/components/groups/filters/MobileGroupFilterSheet';
import { useGroupFilters } from '@/components/groups/hooks/useGroupFilters';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ThemeButton } from '@/components/ui/theme-button';
import { useToast } from '@/components/ui/use-toast';
import { usePreventUnsavedClose } from '@/hooks/use-form-dirty-state';
import { groupsApi } from '@/lib/api/groups';
import { GroupWithCountsResponse } from '@/lib/types/api-responses';
import { GroupCreateInput, GroupUpdateInput } from '@/lib/validators/group';
import { cn } from '@/lib/utils';
import { useViewPreference } from '@/lib/utils/view-preferences';

export default function GroupsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupWithCountsResponse | null>(null);
  const [deletingGroup, setDeletingGroup] = useState<GroupWithCountsResponse | null>(null);
  const [isCreateFormDirty, setIsCreateFormDirty] = useState(false);
  const [isEditFormDirty, setIsEditFormDirty] = useState(false);

  // Filter panel states
  const [isDesktopFilterOpen, setIsDesktopFilterOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // View mode state - default to compact for better space efficiency
  const [viewMode, setViewMode, isHydrated] = useViewPreference('viewMode.groups', 'compact');

  // Unsaved close prevention for create dialog
  const createCloseHandler = usePreventUnsavedClose(isCreateFormDirty, () => {
    setShowCreateDialog(false);
    setIsCreateFormDirty(false);
  });

  // Unsaved close prevention for edit dialog
  const editCloseHandler = usePreventUnsavedClose(isEditFormDirty, () => {
    setEditingGroup(null);
    setIsEditFormDirty(false);
  });

  // Fetch user's groups
  const { data: groupsData } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupsApi.getGroups(),
  });

  const groups = groupsData?.items || [];

  // Fetch pending invitations for badge count
  const { data: invitationsData } = useQuery<unknown[]>({
    queryKey: ['user-invitations'],
    queryFn: async () => {
      const response = await fetch('/api/user/invitations');
      if (!response.ok) {
        if (response.status === 404) {
          return []; // No invitations
        }
        throw new Error('Failed to fetch invitations');
      }
      const data = (await response.json()) as
        | { invitations: unknown[] }
        | unknown[];
      // API returns { invitations: [...], pagination: {...} }, extract invitations array
      return 'invitations' in data ? data.invitations : data;
    },
  });

  const pendingInvitations = Array.isArray(invitationsData) ? invitationsData : [];

  // Fetch unique members for filtering
  const { data: uniqueMembersData } = useQuery<
    Array<{
      id: string;
      name: string | null;
      email: string;
      image?: string | null;
      groupCount?: number;
    }>
  >({
    queryKey: ['groups', 'members', 'unique'],
    queryFn: async () => {
      const response = await fetch('/api/groups/members/unique');
      if (!response.ok) {
        throw new Error('Failed to fetch members');
      }
      const data = (await response.json()) as
        | {
            members: Array<{
              id: string;
              name: string | null;
              email: string;
              image?: string | null;
              groupCount?: number;
            }>;
          }
        | undefined;
      return data?.members ?? [];
    },
    enabled: groups.length > 0,
  });

  const uniqueMembers = uniqueMembersData || [];

  // Use the filter hook
  const {
    filterState,
    setSearch,
    setSelectedMembers,
    setShowAdminOnly,
    resetFilters,
    filteredGroups,
    activeFilterCount,
  } = useGroupFilters(groups);

  // Create group mutation with optimistic updates
  const createGroupMutation = useMutation({
    mutationFn: groupsApi.createGroup,
    onMutate: async (newGroupData: GroupCreateInput) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['groups'] });

      // Snapshot the previous value
      const previousGroups = queryClient.getQueryData(['groups']);

      // Generate a temporary ID for optimistic update using a deterministic approach
      const tempId = `optimistic-${Date.now()}-${newGroupData.name.replace(/\s+/g, '-')}`;
      const now = new Date().toISOString();
      const optimisticGroup: GroupWithCountsResponse = {
        id: tempId,
        name: newGroupData.name,
        description: newGroupData.description || null,
        avatarUrl: newGroupData.avatarUrl || null,
        visibility: newGroupData.visibility || 'private',
        createdAt: now,
        updatedAt: now,
        _count: {
          members: 1, // Creator is a member
          lists: 0,
        },
      };

      // Optimistically add the new group
      queryClient.setQueryData(
        ['groups'],
        (oldData: { items: GroupWithCountsResponse[] } | undefined) => {
          if (!oldData) {
            return { items: [optimisticGroup], hasMore: false };
          }
          return {
            ...oldData,
            items: [optimisticGroup, ...oldData.items],
          };
        }
      );

      return { previousGroups, tempId };
    },
    onSuccess: (serverGroup, _, context) => {
      // Replace temporary group with server response
      queryClient.setQueryData(
        ['groups'],
        (oldData: { items: GroupWithCountsResponse[] } | undefined) => {
          if (!oldData) {
            return { items: [serverGroup], hasMore: false };
          }
          return {
            ...oldData,
            items: oldData.items.map((g) => (g.id === context?.tempId ? serverGroup : g)),
          };
        }
      );

      toast({
        title: 'Success!',
        description: 'Your group has been created',
      });
      setShowCreateDialog(false);
      setIsCreateFormDirty(false);

      // Force a refetch to ensure consistency
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (error: Error, _, context) => {
      // Rollback on error
      if (context?.previousGroups) {
        queryClient.setQueryData(['groups'], context.previousGroups);
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to create group',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  // Update group mutation with optimistic updates
  const updateGroupMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: GroupUpdateInput }) =>
      groupsApi.updateGroup(id, data),
    onMutate: async ({ id, data }: { id: string; data: GroupUpdateInput }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['groups'] });

      // Snapshot the previous value
      const previousGroups = queryClient.getQueryData(['groups']);

      // Optimistically update the group
      queryClient.setQueryData(
        ['groups'],
        (oldData: { items: GroupWithCountsResponse[] } | undefined) => {
          if (!oldData) {
            return oldData;
          }
          return {
            ...oldData,
            items: oldData.items.map((g: GroupWithCountsResponse) =>
              g.id === id ? { ...g, ...data, updatedAt: new Date().toISOString() } : g
            ),
          };
        }
      );

      return { previousGroups };
    },
    onSuccess: (serverGroup) => {
      // Update with server response to ensure consistency
      queryClient.setQueryData(
        ['groups'],
        (oldData: { items: GroupWithCountsResponse[] } | undefined) => {
          if (!oldData) {
            return oldData;
          }
          return {
            ...oldData,
            items: oldData.items.map((g: GroupWithCountsResponse) =>
              g.id === serverGroup.id ? serverGroup : g
            ),
          };
        }
      );

      toast({
        title: 'Success!',
        description: 'Your group has been updated',
      });
      setEditingGroup(null);
      setIsEditFormDirty(false);
    },
    onError: (error: Error, _, context) => {
      // Rollback on error
      if (context?.previousGroups) {
        queryClient.setQueryData(['groups'], context.previousGroups);
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to update group',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  // Delete group mutation with optimistic updates
  const deleteGroupMutation = useMutation({
    mutationFn: groupsApi.deleteGroup,
    onMutate: async (groupId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['groups'] });

      // Snapshot the previous value
      const previousGroups = queryClient.getQueryData(['groups']);

      // Optimistically remove the group from cache
      queryClient.setQueryData(
        ['groups'],
        (oldData: { items: GroupWithCountsResponse[] } | undefined) => {
          if (!oldData) {
            return oldData;
          }
          return {
            ...oldData,
            items: oldData.items.filter((g: GroupWithCountsResponse) => g.id !== groupId),
          };
        }
      );

      return { previousGroups };
    },
    onSuccess: () => {
      toast({
        title: 'Group deleted',
        description: 'The group has been permanently removed',
      });
    },
    onError: (error: Error, groupId: string, context) => {
      // Rollback on error
      if (context?.previousGroups) {
        queryClient.setQueryData(['groups'], context.previousGroups);
      }
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete group',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  const handleEdit = (group: GroupWithCountsResponse) => {
    setEditingGroup(group);
  };

  const handleDelete = (group: GroupWithCountsResponse) => {
    setDeletingGroup(group);
  };

  const handleManage = (group: GroupWithCountsResponse) => {
    // Navigate to group detail page
    router.push(`/groups/${group.id}`);
  };

  return (
    <>
      {/* Mobile Top Menu Row - Sticky below header */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b bg-background px-4 py-1.5 md:hidden">
        {/* Left side - Filter button */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileFilterOpen(true)}
            aria-label="Filter groups"
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        {/* Right side - View Toggle */}
        <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      </div>

      {/* Mobile Bottom Bar - Fixed to bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background shadow-md md:hidden">
        <div className="flex items-center justify-between px-4 py-1.5">
          {/* Left side - Invitations button with badge */}
          <div className="relative">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push('/groups/invitations')}
              aria-label="View group invitations"
            >
              <Mail className="h-4 w-4" />
            </Button>
            {pendingInvitations.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
                {pendingInvitations.length}
              </span>
            )}
          </div>

          {/* Right side - Create Group button */}
          <Button
            onClick={() => setShowCreateDialog(true)}
            size="lg"
            className="min-h-[44px] min-w-[130px]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Group
          </Button>
        </div>
      </div>

      {/* Mobile Filter Sheet */}
      <div className="md:hidden">
        <MobileGroupFilterSheet
          open={isMobileFilterOpen}
          onOpenChange={setIsMobileFilterOpen}
          search={filterState.search}
          selectedMembers={filterState.selectedMembers}
          availableMembers={uniqueMembers}
          showAdminOnly={filterState.showAdminOnly}
          onSearchChange={setSearch}
          onMembersChange={setSelectedMembers}
          onShowAdminOnlyChange={setShowAdminOnly}
          onClearAll={resetFilters}
          activeFilterCount={activeFilterCount}
        />
      </div>

      {/* Desktop Layout with Sliding Filter Panel */}
      <div className="relative">
        {/* Filter Panel - Sliding Overlay (Desktop Only) */}
        <div className="hidden md:block">
          <div
            className={cn(
              'fixed left-0 top-16 z-30 h-[calc(100vh-4rem)] w-80 transform border-r bg-background shadow-xl transition-transform duration-300 ease-in-out',
              isDesktopFilterOpen ? 'translate-x-0' : '-translate-x-full'
            )}
          >
            <div className="flex h-full flex-col">
              {/* Panel Header */}
              <div className="flex items-center justify-between border-b p-4">
                <h2 className="text-lg font-semibold">Filters</h2>
                <Button variant="ghost" size="icon" onClick={() => setIsDesktopFilterOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Filter Panel Content */}
              <div className="flex-1 overflow-y-auto p-4">
                <GroupFilterPanel
                  search={filterState.search}
                  selectedMembers={filterState.selectedMembers}
                  availableMembers={uniqueMembers}
                  showAdminOnly={filterState.showAdminOnly}
                  onSearchChange={setSearch}
                  onMembersChange={setSelectedMembers}
                  onShowAdminOnlyChange={setShowAdminOnly}
                  onClearAll={resetFilters}
                  activeFilterCount={activeFilterCount}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area - Shifts when filter panel is open */}
        <div
          className={cn(
            'pb-24 transition-all duration-300 ease-in-out md:pb-0',
            isDesktopFilterOpen ? 'lg:ml-80' : 'lg:ml-0'
          )}
        >
          <div className="container mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold sm:text-3xl">Groups</h1>
                  <p className="mt-1 text-sm text-muted-foreground sm:mt-2 sm:text-base">
                    Create and manage family groups for sharing wishlists
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                  <InvitationsModal className="hidden sm:flex sm:w-auto" />
                  <ThemeButton
                    onClick={() => setShowCreateDialog(true)}
                    className="hidden w-full sm:w-auto md:flex"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Group
                  </ThemeButton>
                </div>
              </div>
            </div>

            {/* Controls Bar - Desktop Only */}
            <div className="hidden md:block">
              <GroupControlsBar
                isHydrated={isHydrated}
                onToggleFilters={() => {
                  if (window.innerWidth >= 1024) {
                    setIsDesktopFilterOpen(!isDesktopFilterOpen);
                  } else {
                    setIsMobileFilterOpen(true);
                  }
                }}
                isFiltersOpen={isDesktopFilterOpen}
                filterCount={activeFilterCount}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
            </div>

            {/* Groups Grid with view mode support */}
            <div className="mb-6 sm:mb-8">
              <GroupGrid
                groups={filteredGroups}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onManage={handleManage}
                viewMode={viewMode}
                isFilterOpen={isDesktopFilterOpen}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Create Group Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={createCloseHandler.handleClose}>
        <DialogContent className="w-full max-w-2xl sm:w-[90vw]" {...createCloseHandler.dialogProps}>
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>
              Create a new group to share wishlists with your family and friends.
            </DialogDescription>
          </DialogHeader>
          <GroupForm
            onSubmit={(data) => {
              createGroupMutation.mutate(data as GroupCreateInput);
            }}
            isLoading={createGroupMutation.isPending}
            onCancel={() => {
              setShowCreateDialog(false);
              setIsCreateFormDirty(false);
            }}
            onDirtyStateChange={setIsCreateFormDirty}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={!!editingGroup} onOpenChange={editCloseHandler.handleClose}>
        <DialogContent className="w-full max-w-2xl sm:w-[90vw]" {...editCloseHandler.dialogProps}>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription>
              Update your group&apos;s information and settings.
            </DialogDescription>
          </DialogHeader>
          {editingGroup && (
            <GroupForm
              group={editingGroup}
              onSubmit={(data) => {
                updateGroupMutation.mutate({ id: editingGroup.id, data: data as GroupUpdateInput });
              }}
              isLoading={updateGroupMutation.isPending}
              onCancel={() => {
                setEditingGroup(null);
                setIsEditFormDirty(false);
              }}
              onDirtyStateChange={setIsEditFormDirty}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deletingGroup}
        onOpenChange={() => setDeletingGroup(null)}
        title="Are you absolutely sure?"
        description={
          deletingGroup
            ? `This action cannot be undone. This will permanently delete the "${deletingGroup.name}" group and remove all member associations and shared lists.`
            : ''
        }
        confirmText="Delete Group"
        variant="destructive"
        onConfirm={() => {
          if (deletingGroup) {
            deleteGroupMutation.mutate(deletingGroup.id);
            setDeletingGroup(null);
          }
        }}
      />
    </>
  );
}
