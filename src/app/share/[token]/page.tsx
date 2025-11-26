'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock } from 'lucide-react';

import { useState, useEffect } from 'react';

import { SimpleThemeToggle } from '@/components/theme/simple-theme-toggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { listsApi } from '@/lib/api/lists';
import { reservationsApi } from '@/lib/api/reservations';
import { PublicListContent } from '@/components/lists/PublicListContent';
import type { PublicListData } from '@/components/lists/PublicListContent';

interface PageProps {
  params: { token: string };
}

interface ApiError {
  response?: {
    status: number;
    data?: {
      code?: string;
      error?: string;
    };
  };
  status?: number;
  message?: string;
}

export default function PublicListPage({ params }: PageProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState('');
  const [_showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [signupsDisabled, setSignupsDisabled] = useState(false);

  // Fetch public list
  const {
    data: list,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['public-list', params.token],
    queryFn: () => listsApi.getPublicList(params.token),
    retry: false,
  });

  // Fetch reservation status for this list
  const { data: reservations, isLoading: reservationsLoading } = useQuery({
    queryKey: ['list-reservations', list?.id],
    queryFn: () => (list ? reservationsApi.getListReservations(list.id) : null),
    enabled: !!list?.id,
  });

  // Fetch current user and site settings
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const userData: { id: string } = await response.json();
          setCurrentUserId(userData.id);
        }
      } catch {
        // User is not logged in, keep currentUserId as null
      }
    };

    const fetchSignupsDisabled = async () => {
      try {
        const response = await fetch('/api/settings/signups-disabled');
        if (response.ok) {
          const data: { disabled: boolean } = await response.json();
          setSignupsDisabled(data.disabled);
        }
      } catch {
        // Default to false if fetch fails
      }
    };

    void fetchCurrentUser();
    void fetchSignupsDisabled();
  }, []);

  // Check if we need password - more robust detection
  const needsPassword =
    error &&
    (((error as ApiError)?.response?.status === 403 &&
      (error as ApiError)?.response?.data?.code === 'FORBIDDEN') ||
      (error as ApiError)?.status === 403 ||
      (error as ApiError)?.message?.includes('Password required'));

  // Password submission mutation
  const passwordMutation = useMutation({
    mutationFn: (password: string) => listsApi.accessPublicList(params.token, password),
    onSuccess: (listData) => {
      setShowPasswordForm(false);
      // Manually update the query data instead of refetching
      queryClient.setQueryData(['public-list', params.token], listData);
    },
    onError: (error: ApiError) => {
      const message = error.response?.data?.error || 'Invalid password';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    },
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      passwordMutation.mutate(password);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        {/* Theme Toggle Button */}
        <div className="fixed right-4 top-4 z-10">
          <SimpleThemeToggle variant="outline" />
        </div>

        <div className="animate-pulse space-y-6">
          <div className="h-8 w-1/3 rounded bg-muted"></div>
          <div className="h-4 w-2/3 rounded bg-muted"></div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-64 rounded bg-muted"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (needsPassword) {
    return (
      <div className="container mx-auto px-4 py-8">
        {/* Theme Toggle Button */}
        <div className="fixed right-4 top-4 z-10">
          <SimpleThemeToggle variant="outline" />
        </div>

        <div className="mx-auto max-w-md">
          <Card>
            <CardHeader className="text-center">
              <Lock className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h1 className="text-2xl font-bold">Password Protected</h1>
              <p className="text-muted-foreground">This list requires a password to view</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={passwordMutation.isPending}>
                  {passwordMutation.isPending ? 'Verifying...' : 'Access List'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error && !needsPassword) {
    return (
      <div className="container mx-auto px-4 py-8">
        {/* Theme Toggle Button */}
        <div className="fixed right-4 top-4 z-10">
          <SimpleThemeToggle variant="outline" />
        </div>

        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold">List not found</h1>
          <p className="mb-6 text-muted-foreground">
            The list you&apos;re looking for doesn&apos;t exist or is no longer available.
          </p>
        </div>
      </div>
    );
  }

  if (!list) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Shared public list content */}
      <PublicListContent
        list={list as PublicListData}
        currentUserId={currentUserId ?? undefined}
        reservations={reservations ?? undefined}
        reservationsLoading={reservationsLoading}
        signupsDisabled={signupsDisabled}
      />
    </div>
  );
}
