'use client';

import { Wish } from '@prisma/client';
import { useQuery } from '@tanstack/react-query';
import { Eye, Lock, ArrowLeft, X, Info } from 'lucide-react';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { ReservationDialog } from '@/components/reservations/reservation-dialog';
import { SimpleThemeToggle } from '@/components/theme/simple-theme-toggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { FilteredWishesDisplay } from '@/components/wishes/filtered-wishes-display';
import { reservationsApi } from '@/lib/api/reservations';

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

interface ListResponse {
  id: string;
  name: string;
  description: string | null;
  visibility: string;
  slug: string | null;
  hideFromProfile: boolean;
  shareToken: string | null;
  owner: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
  _count: {
    wishes: number;
    admins: number;
  };
  wishes?: Array<{
    wish: Wish;
    addedAt: Date;
    wishLevel: number | null;
  }>;
}

async function fetchListByVanityUrl(
  username: string,
  slug: string,
  password?: string
): Promise<ListResponse> {
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
    const error = await response.json().catch(() => ({ error: 'Failed to fetch list' }));
    throw new Error(error.error || 'Failed to fetch list');
  }

  return response.json();
}

export default function PublicListVanityUrlPage() {
  const params = useParams();
  const username = params.username as string;
  const slug = params.slug as string;

  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [passwordSubmitted, setPasswordSubmitted] = useState(false);
  const [showReservationDialog, setShowReservationDialog] = useState(false);
  const [selectedWish, setSelectedWish] = useState<Wish | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Check localStorage for banner dismissal state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('publicListBannerDismissed');
      setBannerDismissed(dismissed === 'true');
    }
  }, []);

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

  // Handle banner dismissal
  const handleDismissBanner = () => {
    setBannerDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('publicListBannerDismissed', 'true');
    }
  };

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

        {/* Back Link */}
        <div className="mx-auto mb-6 max-w-md">
          <Link
            href={`/${username}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {username}&apos;s profile
          </Link>
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

        {/* Back Link */}
        <div className="mb-6">
          <Link
            href={`/${username}`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {username}&apos;s profile
          </Link>
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

      {/* Back Link */}
      <div className="mb-6">
        <Link
          href={`/${username}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {username}&apos;s profile
        </Link>
      </div>

      {/* Compact Header - reduced from text-3xl to text-2xl, mb-8 to mb-4 */}
      <div className="mb-4 text-center">
        <h1 className="mb-2 text-2xl font-bold">{list.name}</h1>
        {list.description && <p className="mb-2 text-muted-foreground">{list.description}</p>}

        {/* Inline metadata instead of Badge + separate row */}
        <p className="text-sm text-muted-foreground">
          {list._count.wishes} {list._count.wishes === 1 ? 'wish' : 'wishes'} • by {list.owner.name}
        </p>
      </div>

      {/* Dismissible Info Banner - only shows if not dismissed */}
      {!bannerDismissed && (
        <Card className="relative mb-6 border-info/20 bg-info/5">
          {/* Dismiss button - positioned absolutely for better space usage */}
          <button
            onClick={handleDismissBanner}
            className="absolute right-2 top-2 rounded-full p-2 text-info/60 hover:bg-info/10 hover:text-info focus:outline-none focus:ring-2 focus:ring-info/40"
            aria-label="Dismiss this notice"
          >
            <X className="h-5 w-5" />
          </button>

          <CardContent className="pt-6 pr-12">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-info/10">
                  <Info className="h-4 w-4 text-info" />
                </div>
              </div>
              <div>
                <h3 className="mb-1 font-medium text-foreground">
                  {currentUserId === list.owner.id
                    ? 'Viewing Your Wishlist'
                    : 'How to Reserve Gifts'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {currentUserId === list.owner.id ? (
                    <>
                      This is how others see your wishlist. They can reserve items, but you can't
                      reserve your own wishes.
                    </>
                  ) : (
                    <>
                      Click the "Reserve" button on any item you plan to buy. Your name stays hidden from {list.owner.name} until after the gift is given. This prevents duplicate gifts!
                    </>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wishes Display with Filtering and View Toggle */}
      <FilteredWishesDisplay
        wishes={
          list.wishes?.map((listWish) => ({
            id: listWish.wish.id,
            ownerId: list.owner.id,
            createdAt: new Date(listWish.wish.createdAt).toISOString(),
            updatedAt: new Date(
              listWish.wish.updatedAt || listWish.wish.createdAt
            ).toISOString(),
            title: listWish.wish.title,
            color: listWish.wish.color,
            size: listWish.wish.size,
            notes: listWish.wish.notes,
            url: listWish.wish.url,
            imageUrl: listWish.wish.imageUrl,
            sourceImageUrl: listWish.wish.sourceImageUrl,
            localImagePath: listWish.wish.localImagePath,
            imageStatus: listWish.wish.imageStatus,
            price: listWish.wish.price,
            currency: listWish.wish.currency,
            quantity: listWish.wish.quantity,
            wishLevel: listWish.wish.wishLevel,
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
        shareToken={list.shareToken || undefined}
        isAuthenticated={false}
      />
    </div>
  );
}
