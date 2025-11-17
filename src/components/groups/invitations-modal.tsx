'use client';

import { useState } from 'react';
import { UserInvitations } from './user-invitations-accessible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Mail } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/use-toast';

interface InvitationsModalProps {
  className?: string;
}

export function InvitationsModal({ className }: InvitationsModalProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for pending invitations count
  const { data: invitationsData } = useQuery({
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
      return data.invitations || data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Query for user preferences
  const { data: preferencesData } = useQuery({
    queryKey: ['user-preferences'],
    queryFn: async () => {
      const response = await fetch('/api/user/preferences');
      if (!response.ok) {
        throw new Error('Failed to fetch preferences');
      }
      return response.json();
    },
  });

  // Mutation for updating auto-accept preference
  const updatePreferencesMutation = useMutation({
    mutationFn: async (autoAcceptGroupInvitations: boolean) => {
      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoAcceptGroupInvitations }),
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }

      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['user-preferences'] });
      toast({
        title: 'Preferences updated',
        description: 'Your auto-accept setting has been saved.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update preferences. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Ensure invitations is always an array and count pending
  const invitations = Array.isArray(invitationsData) ? invitationsData : [];
  const pendingCount = invitations.length;

  const autoAcceptEnabled = preferencesData?.preferences?.autoAcceptGroupInvitations ?? false;

  const handleAutoAcceptToggle = (checked: boolean) => {
    updatePreferencesMutation.mutate(checked);
  };

  return (
    <>
      {/* Trigger Button */}
      <Button variant="outline" size="default" onClick={() => setOpen(true)} className={className}>
        <Mail className="mr-2 h-4 w-4" />
        My Invitations
        {pendingCount > 0 && (
          <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {pendingCount}
          </span>
        )}
      </Button>

      {/* Modal Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Group Invitations</DialogTitle>
            <DialogDescription>
              {pendingCount > 0
                ? `You have ${pendingCount} pending invitation${pendingCount !== 1 ? 's' : ''}`
                : 'No pending invitations'}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6">
            <UserInvitations />
          </div>

          {/* Auto-accept toggle */}
          <div className="mt-6 rounded-lg border bg-muted/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="auto-accept" className="text-sm font-medium">
                  Automatically accept group invitations
                </Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  When enabled, you&apos;ll be automatically added to groups when invited
                </p>
              </div>
              <Switch
                id="auto-accept"
                checked={autoAcceptEnabled}
                onCheckedChange={handleAutoAcceptToggle}
                disabled={updatePreferencesMutation.isPending}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
