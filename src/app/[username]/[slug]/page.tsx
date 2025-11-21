'use client';

import { useQuery } from '@tanstack/react-query';
import { Lock } from 'lucide-react';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

import { SimpleThemeToggle } from '@/components/theme/simple-theme-toggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { reservationsApi } from '@/lib/api/reservations';
import { PublicListContent } from '@/components/lists/PublicListContent';
import type { PublicListData } from '@/components/lists/PublicListContent';

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

async function fetchListByVanityUrl(
  username: string,
  slug: string,
  password?: string
): Promise<PublicListData> {
  const url = `/api/public-profile/${username}/${slug}`;
  const response = await fetch(url, {
    method: password ? 'POST' : 'GET',
    headers: password
      ? {
          'Content-Type': 'application/json',
        }
      : {},
    body: password ? JSON.stringify({ password }) : undefined,
  });

  if (!response.ok) {
    const error: { error?: string } = await response
      .json()
      .catch(() => ({ error: 'Failed to fetch list' }));
    throw new Error(error.error ?? 'Failed to fetch list');
  }

  return response.json() as Promise<PublicListData>;
}

export default function PublicListVanityUrlPage() {
  const params = useParams();
  const username = params.username as string;
  const slug = params.slug as string;

  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [passwordSubmitted, setPasswordSubmitted] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Fetch current user to check if they're viewing their own list
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
    fetchCurrentUser();
  }, []);

  // Fetch list by vanity URL
  const {
    data: list,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['public-list-vanity', username, slug, passwordSubmitted ? password : undefined],
    queryFn: () => fetchListByVanityUrl(username, slug, passwordSubmitted ? password : undefined),
    retry: false,
  });

  // Fetch reservation status for this list
  const { data: reservations, isLoading: reservationsLoading } = useQuery({
    queryKey: ['list-reservations', list?.id],
    queryFn: () => (list ? reservationsApi.getListReservations(list.id) : null),
    enabled: !!list?.id,
  });

  // Check if we need password - more robust detection
  const needsPassword =
    error &&
    !passwordSubmitted &&
    (((error as ApiError)?.response?.status === 403 &&
      (error as ApiError)?.response?.data?.code === 'FORBIDDEN') ||
      (error as ApiError)?.status === 403 ||
      (error as ApiError)?.message?.includes('Password required'));

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      setPasswordSubmitted(true);
      try {
        await refetch();
      } catch (err) {
        const errorMessage =
          (err as ApiError).response?.data?.error ||
          (err as ApiError).message ||
          'Invalid password';
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
        setPasswordSubmitted(false);
      }
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
              <form onSubmit={(e) => void handlePasswordSubmit(e)} className="space-y-4">
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
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Verifying...' : 'Access List'}
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
        list={list}
        currentUserId={currentUserId ?? undefined}
        reservations={reservations ?? undefined}
        reservationsLoading={reservationsLoading}
      />
    </div>
  );
}
