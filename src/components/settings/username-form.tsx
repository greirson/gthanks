'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { vanityApi } from '@/lib/api/vanity';

interface UsernameFormProps {
  currentUsername?: string | null;
  canUseVanityUrls: boolean;
}

export function UsernameForm({ currentUsername, canUseVanityUrls }: UsernameFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: session, update: updateSession } = useSession();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [fullProfileUrl, setFullProfileUrl] = useState<string | null>(null);
  const [fullPreviewUrl, setFullPreviewUrl] = useState<string | null>(null);

  // Use session username if available (updates in real-time), fallback to prop
  const effectiveUsername = session?.user?.username ?? currentUsername;

  // Mutation must be defined before any conditional returns (React Hooks rules)
  const setUsernameMutation = useMutation({
    mutationFn: vanityApi.setUsername,
    onSuccess: async (data) => {
      // Update session with new username
      await updateSession({ username: data.user.username });

      // Invalidate queries to refresh UI
      await queryClient.invalidateQueries({ queryKey: ['user'] });

      toast({
        title: 'Username set!',
        description: `Your username is now @${data.user.username}`,
      });

      setUsername('');
      setShowConfirm(false);
    },
    onError: (error: Error & { statusCode?: number }) => {
      // Handle rate limiting
      if (error.statusCode === 429) {
        toast({
          title: 'Too many attempts',
          description: 'Please wait a moment before trying again.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: error.message || 'Failed to set username',
          variant: 'destructive',
        });
      }
      setShowConfirm(false);
    },
  });

  // Hydrate full URL for existing username (read-only view)
  useEffect(() => {
    if (typeof window !== 'undefined' && effectiveUsername) {
      setFullProfileUrl(`${window.location.origin}/${effectiveUsername}`);
    }
  }, [effectiveUsername]);

  // Hydrate full URL for username preview (form view)
  useEffect(() => {
    if (typeof window !== 'undefined' && username) {
      setFullPreviewUrl(`${window.location.origin}/${username}`);
    } else {
      setFullPreviewUrl(null);
    }
  }, [username]);

  // Username already set - show read-only
  if (effectiveUsername) {
    const displayUrl = fullProfileUrl || `/${effectiveUsername}`;

    return (
      <div className="space-y-2">
        <Label>Username</Label>
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
          <Check className="h-4 w-4 text-green-600" />
          <span className="font-medium">@{effectiveUsername}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Your profile:{' '}
          <a
            href={`/${effectiveUsername}`}
            className="text-primary hover:underline transition-opacity duration-75"
          >
            {displayUrl}
          </a>
        </p>
        <p className="text-xs text-muted-foreground">
          Usernames are permanent and cannot be changed.
        </p>
      </div>
    );
  }

  // Feature not available
  if (!canUseVanityUrls) {
    return (
      <div className="space-y-2">
        <Label className="text-muted-foreground">Username</Label>
        <div className="rounded-lg border border-dashed bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">
            Vanity URLs are not available for your account.
          </p>
        </div>
      </div>
    );
  }

  const handleUsernameChange = (value: string) => {
    // Auto-convert to lowercase and remove invalid characters
    const cleaned = value.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    setUsername(cleaned);

    // Clear error when user types
    if (error) {
      setError('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate username
    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (username.length > 30) {
      setError('Username must be less than 30 characters');
      return;
    }

    // Show confirmation dialog
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    setUsernameMutation.mutate(username);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="username">Choose Username</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                @
              </span>
              <Input
                id="username"
                type="text"
                placeholder="yourname"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                className={`pl-7 ${error ? 'border-destructive' : ''}`}
                disabled={setUsernameMutation.isPending}
                maxLength={30}
              />
            </div>
            <Button
              type="submit"
              disabled={!username || setUsernameMutation.isPending}
            >
              {setUsernameMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Set Username'
              )}
            </Button>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            3-30 characters. Letters, numbers, underscores, and hyphens only.
          </p>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950">
          <div className="flex gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                Username is permanent
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Once set, your username cannot be changed. Choose carefully!
              </p>
            </div>
          </div>
        </div>

        {username && (
          <div className="space-y-1">
            <p className="text-sm font-medium">Preview:</p>
            <div className="rounded-lg border bg-muted/50 px-3 py-2">
              <p className="text-sm text-muted-foreground transition-opacity duration-75">
                {fullPreviewUrl || `/${username}`}
              </p>
            </div>
          </div>
        )}
      </form>

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Confirm Username"
        description={`Are you sure you want to set your username to "@${username}"? This action is permanent and cannot be undone.`}
        confirmText="Yes, Set Username"
        onConfirm={handleConfirm}
        variant="default"
      />
    </>
  );
}
