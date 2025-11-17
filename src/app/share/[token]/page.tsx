'use client';

import { Wish as ApiWish } from '@/lib/validators/api-responses/wishes';
import { Wish } from '@prisma/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, Lock } from 'lucide-react';

import { useState, useEffect } from 'react';

import { ReservationDialog } from '@/components/reservations/reservation-dialog';
import { SimpleThemeToggle } from '@/components/theme/simple-theme-toggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { FilteredWishesDisplay } from '@/components/wishes/filtered-wishes-display';
import { listsApi } from '@/lib/api/lists';
import { reservationsApi } from '@/lib/api/reservations';

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
  const [showReservationDialog, setShowReservationDialog] = useState(false);
  const [selectedWish, setSelectedWish] = useState<Wish | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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

  // Fetch current user to check if they're viewing their own list
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const userData = await response.json();
          setCurrentUserId(userData.id);
        }
      } catch {
        // User is not logged in, keep currentUserId as null
      }
    };
    fetchCurrentUser();
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

  const handleReserveWish = (wish: Wish) => {
    setSelectedWish(wish);
    setShowReservationDialog(true);
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
            The list you{"'"}re looking for doesn{"'"}t exist or is no longer available.
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
      {/* Theme Toggle Button */}
      <div className="fixed right-4 top-4 z-10">
        <SimpleThemeToggle variant="outline" />
      </div>

      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="mb-2 text-3xl font-bold">{list.name}</h1>
        {list.description && <p className="mb-4 text-muted-foreground">{list.description}</p>}

        <div className="flex items-center justify-center gap-4">
          <Badge variant="outline">
            {list._count.wishes} {list._count.wishes === 1 ? 'wish' : 'wishes'}
          </Badge>
          <span className="text-sm text-muted-foreground">by {list.owner.name}</span>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="mb-8 border-info/20 bg-info/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-info/10">
                <Eye className="h-4 w-4 text-info" />
              </div>
            </div>
            <div>
              <h3 className="mb-1 font-medium text-foreground">
                {currentUserId === list.owner.id
                  ? 'Viewing Your Wishlist'
                  : `Viewing ${list.owner.name}'s Wishlist`}
              </h3>
              <p className="text-sm text-muted-foreground">
                {currentUserId === list.owner.id ? (
                  <>
                    This is how others see your wishlist. They can reserve items, but you can't
                    reserve your own wishes.
                  </>
                ) : (
                  <>
                    You can reserve items to let others know you plan to purchase them. Your name
                    will be hidden from the list owner until after the gift is given.
                  </>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wishes Display with Filtering and View Toggle */}
      <FilteredWishesDisplay
        wishes={
          list.wishes?.map((listWish) => ({
            ...(listWish.wish as ApiWish),
            // Keep existing wish data, only add missing required fields
            ownerId: list.owner.id,
            updatedAt: listWish.wish.updatedAt || listWish.wish.createdAt,
            isOwner: currentUserId === list.owner.id,
          })) || []
        }
        onReserve={handleReserveWish as any}
        reservedWishIds={
          reservations
            ? Object.keys(reservations).filter((wishId) => reservations[wishId].isReserved)
            : []
        }
        isLoading={reservationsLoading}
        showFilters={true}
        compactFilters={true}
      />

      {/* Reservation Dialog */}
      <ReservationDialog
        wish={selectedWish as any}
        open={showReservationDialog}
        onOpenChange={setShowReservationDialog}
        shareToken={params.token}
        isAuthenticated={false}
      />
    </div>
  );
}
