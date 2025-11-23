'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { GroupForm, GroupLists, GroupMemberManagement } from '@/components/groups';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { GroupAvatar } from '@/components/ui/group-avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { groupsApi } from '@/lib/api/groups';
import { GroupUpdateInput } from '@/lib/validators/group';

interface PageProps {
  params: { id: string };
}

export default function GroupDetailPage({ params }: PageProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  // Fetch lightweight group details for better performance
  const { data: group, isLoading } = useQuery({
    queryKey: ['groups', params.id, 'base'],
    queryFn: () => groupsApi.getGroupBaseInfo(params.id),
  });

  // Delete group mutation
  const deleteMutation = useMutation({
    mutationFn: () => groupsApi.deleteGroup(params.id),
    onSuccess: () => {
      toast({ title: 'Group deleted successfully' });
      // Invalidate queries to refetch the groups list and update dashboard counts
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
      void queryClient.invalidateQueries({ queryKey: ['groups', 'count'] });
      router.push('/groups'); // Redirect to the groups list page
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting group',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update group mutation
  const updateMutation = useMutation({
    mutationFn: (data: GroupUpdateInput) => groupsApi.updateGroup(params.id, data),
    onSuccess: () => {
      toast({ title: 'Group updated successfully' });
      // Invalidate queries to refetch group data
      void queryClient.invalidateQueries({ queryKey: ['groups', params.id, 'base'] });
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating group',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 rounded bg-muted sm:w-48"></div>
          <div className="h-16 rounded bg-muted sm:h-20"></div>
          <div className="h-64 rounded bg-muted sm:h-96"></div>
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="py-8 text-center sm:py-12">
          <h2 className="mb-2 text-xl font-bold text-foreground sm:text-2xl">Group not found</h2>
          <p className="mb-4 text-sm text-muted-foreground sm:text-base">
            The group you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to
            it.
          </p>
          <Button onClick={() => router.push('/groups')} className="w-full sm:w-auto">
            Back to Groups
          </Button>
        </div>
      </div>
    );
  }

  const isAdmin = group.currentUserRole === 'admin';

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="mb-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/groups')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Back to Groups</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <GroupAvatar group={group} size="xl" />

          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{group.name}</h1>
            {group.description && (
              <p className="mt-1 text-sm text-muted-foreground sm:text-base">{group.description}</p>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-4">
          <span className="text-xs text-muted-foreground sm:text-sm">
            {group._count.userGroups} {group._count.userGroups === 1 ? 'member' : 'members'}
          </span>

          <span className="text-xs text-muted-foreground sm:text-sm">
            {group._count.listGroups} {group._count.listGroups === 1 ? 'list' : 'lists'}
          </span>

          {group.currentUserRole && (
            <Badge variant="outline">
              {group.currentUserRole === 'admin' ? 'Administrator' : 'Member'}
            </Badge>
          )}
        </div>
      </div>

      {/* Tabs for different sections */}
      <Tabs defaultValue="members" className="w-full">
        <TabsList className={`mb-4 grid w-full sm:mb-0 ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="members" className="text-xs sm:text-sm">
            Members
          </TabsTrigger>
          <TabsTrigger value="lists" className="text-xs sm:text-sm">
            Lists
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="settings" className="text-xs sm:text-sm">
              Settings
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="members" className="mt-6">
          <GroupMemberManagement
            groupId={params.id}
            currentUserRole={group.currentUserRole || undefined}
          />
        </TabsContent>

        <TabsContent value="lists" className="mt-6">
          <GroupLists
            groupId={params.id}
            currentUserRole={group.currentUserRole || undefined}
            useSearchMode={true}
          />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="settings" className="mt-6">
            <div className="space-y-6">
              <div className="rounded-lg border bg-card p-6">
                <h3 className="mb-4 text-lg font-semibold">Group Settings</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Update your group details and settings below.
                </p>
                <GroupForm
                  group={group}
                  onSubmit={(data) => {
                    updateMutation.mutate(data as GroupUpdateInput);
                  }}
                  isLoading={updateMutation.isPending}
                />
              </div>

              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-6">
                <h3 className="mb-2 text-lg font-semibold text-destructive">Danger Zone</h3>
                <p className="mb-4 text-sm text-destructive">
                  Deleting this group will remove all member associations and shared lists. This
                  action cannot be undone.
                </p>
                <Button variant="destructive" onClick={() => setShowDeleteAlert(true)}>
                  Delete Group
                </Button>
              </div>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteAlert}
        onOpenChange={setShowDeleteAlert}
        title="Are you absolutely sure?"
        description={`This action cannot be undone. This will permanently delete the "${group?.name}" group and remove all member associations and shared lists.`}
        confirmText="Delete Group"
        variant="destructive"
        onConfirm={() => {
          deleteMutation.mutate();
        }}
      />
    </div>
  );
}
