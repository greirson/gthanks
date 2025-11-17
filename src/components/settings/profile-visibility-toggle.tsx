'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { vanityApi } from '@/lib/api/vanity';

interface ProfileVisibilityToggleProps {
  username?: string | null;
  initialValue: boolean;
}

export function ProfileVisibilityToggle({ username, initialValue }: ProfileVisibilityToggleProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { update: updateSession } = useSession();
  const [isEnabled, setIsEnabled] = useState(initialValue);
  const [fullProfileUrl, setFullProfileUrl] = useState<string | null>(null);

  // Hydrate full URL after mount to avoid hydration mismatch
  useEffect(() => {
    if (typeof window !== 'undefined' && username) {
      setFullProfileUrl(`${window.location.origin}/${username}`);
    }
  }, [username]);

  const toggleMutation = useMutation({
    mutationFn: vanityApi.setProfileVisibility,
    onMutate: async (newValue) => {
      // Optimistically update UI
      setIsEnabled(newValue);
    },
    onSuccess: async (data) => {
      // Update session
      await updateSession({ showPublicProfile: data.user.showPublicProfile });

      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: ['user'] });

      toast({
        title: 'Profile visibility updated',
        description: data.user.showPublicProfile
          ? 'Your public profile is now visible'
          : 'Your public profile is now hidden',
      });
    },
    onError: (error: Error, previousValue) => {
      // Revert optimistic update
      setIsEnabled(!previousValue);

      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile visibility',
        variant: 'destructive',
      });
    },
  });

  const handleToggle = (checked: boolean) => {
    toggleMutation.mutate(checked);
  };

  // Can't enable without username
  if (!username) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-muted-foreground">Public Profile</Label>
            <p className="text-sm text-muted-foreground">
              Set a username first to enable your public profile.
            </p>
          </div>
          <Switch checked={false} disabled />
        </div>
      </div>
    );
  }

  // Display full URL if available, fallback to relative path for SSR
  const displayUrl = fullProfileUrl || `/${username}`;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1 flex-1">
          <Label htmlFor="profile-visibility">Public Profile</Label>
          <p className="text-sm text-muted-foreground">
            Allow others to view your public profile and lists
          </p>
        </div>
        <Switch
          id="profile-visibility"
          checked={isEnabled}
          onCheckedChange={handleToggle}
          disabled={toggleMutation.isPending}
        />
      </div>

      {isEnabled && (
        <div className="rounded-lg border bg-muted/50 p-3">
          <div className="flex items-start gap-2">
            <Eye className="h-4 w-4 flex-shrink-0 text-green-600 dark:text-green-400 mt-0.5" />
            <div className="space-y-1 flex-1 min-w-0">
              <p className="text-sm font-medium">Your public profile is visible</p>
              <p className="text-xs text-muted-foreground break-all">
                <a
                  href={`/${username}`}
                  className="text-primary hover:underline transition-opacity duration-75"
                >
                  {displayUrl}
                </a>
              </p>
            </div>
          </div>
        </div>
      )}

      {!isEnabled && (
        <div className="rounded-lg border bg-muted/50 p-3">
          <div className="flex items-start gap-2">
            <EyeOff className="h-4 w-4 flex-shrink-0 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                Your public profile is hidden
              </p>
              <p className="text-xs text-muted-foreground">
                Your profile and lists are private
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
