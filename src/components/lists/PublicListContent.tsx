'use client';

import { Wish as PrismaWish } from '@prisma/client';
import { Wish as ApiWish } from '@/lib/validators/api-responses/wishes';
import { useState, useEffect } from 'react';
import { X, Info } from 'lucide-react';

import { ReservationDialog } from '@/components/reservations/reservation-dialog';
import { SimpleThemeToggle } from '@/components/theme/simple-theme-toggle';
import { Card, CardContent } from '@/components/ui/card';
import { FilteredWishesDisplay } from '@/components/wishes/filtered-wishes-display';
import { PublicGiftCardSection } from '@/components/lists/PublicGiftCardSection';

// List type matching the API response structure
export interface PublicListData {
  id: string;
  name: string;
  description: string | null;
  visibility: string;
  slug: string | null;
  hideFromProfile: boolean;
  shareToken: string | null;
  giftCardPreferences?: string | null;
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
    wish: PrismaWish;
    addedAt: Date;
    wishLevel: number | null;
  }>;
}

interface PublicListContentProps {
  list: PublicListData;
  currentUserId?: string;
  reservations?: Record<string, { isReserved: boolean }>;
  reservationsLoading?: boolean;
}

export function PublicListContent({
  list,
  currentUserId,
  reservations,
  reservationsLoading = false,
}: PublicListContentProps) {
  const [showReservationDialog, setShowReservationDialog] = useState(false);
  const [selectedWish, setSelectedWish] = useState<ApiWish | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Check localStorage for banner dismissal state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('publicListBannerDismissed');
      setBannerDismissed(dismissed === 'true');
    }
  }, []);

  // Handle banner dismissal
  const handleDismissBanner = () => {
    setBannerDismissed(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('publicListBannerDismissed', 'true');
    }
  };

  const handleReserveWish = (wish: ApiWish) => {
    setSelectedWish(wish);
    setShowReservationDialog(true);
  };

  return (
    <>
      {/* Theme Toggle Button */}
      <div className="fixed right-4 top-4 z-10">
        <SimpleThemeToggle variant="outline" />
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

          <CardContent className="pr-12 pt-6">
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
                      This is how others see your wishlist. They can reserve items, but you
                      can&apos;t reserve your own wishes.
                    </>
                  ) : (
                    <>
                      Click the &quot;Reserve&quot; button on any item you plan to buy. Your name
                      stays hidden from {list.owner.name} until after the gift is given. This
                      prevents duplicate gifts!
                    </>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gift Cards Section */}
      <PublicGiftCardSection list={list} />

      {/* Wishes Display with Filtering and View Toggle */}
      <FilteredWishesDisplay
        wishes={
          list.wishes?.map((listWish) => ({
            id: listWish.wish.id,
            ownerId: list.owner.id,
            createdAt: new Date(listWish.wish.createdAt).toISOString(),
            updatedAt: new Date(listWish.wish.updatedAt || listWish.wish.createdAt).toISOString(),
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
        onReserve={(wish) => handleReserveWish(wish)}
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
      {selectedWish && (
        <ReservationDialog
          wish={selectedWish}
          open={showReservationDialog}
          onOpenChange={setShowReservationDialog}
          shareToken={list.shareToken ?? undefined}
          isAuthenticated={false}
        />
      )}
    </>
  );
}
