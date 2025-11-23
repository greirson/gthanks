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
import { useWishFilters } from '@/components/wishes/hooks/useWishFilters';
import { WishFilterPanel } from '@/components/wishes/filters/WishFilterPanel';

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
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
  _count: {
    listWishes: number;
    listAdmins: number;
  };
  listWishes?: Array<{
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

  // Convert list wishes to API wish format
  const wishes: ApiWish[] =
    list.listWishes?.map((listWish) => ({
      id: listWish.wish.id,
      ownerId: list.user.id,
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
      isOwner: currentUserId === list.user.id,
    })) || [];

  // Use filter hook
  const {
    filterState,
    setWishLevelSelection,
    setPriceRange,
    setSortOption,
    resetFilters,
    filteredWishes,
    activeFilterCount,
    maxPrice,
  } = useWishFilters(wishes);

  // Check sessionStorage for banner dismissal state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = sessionStorage.getItem('publicListBannerDismissed');
      setBannerDismissed(dismissed === 'true');
    }
  }, []);

  // Handle banner dismissal
  const handleDismissBanner = () => {
    setBannerDismissed(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('publicListBannerDismissed', 'true');
    }
  };

  const handleReserveWish = (wish: ApiWish) => {
    setSelectedWish(wish);
    setShowReservationDialog(true);
  };

  return (
    <>
      {/* Theme Toggle Button - Fixed Position */}
      <div className="fixed right-4 top-4 z-10">
        <SimpleThemeToggle variant="outline" />
      </div>

      {/* Flex Container Layout */}
      <div className="flex min-h-screen">
        {/* Left Sidebar - Visible at lg: (1024px+) */}
        <div className="hidden lg:block">
          <div className="sticky top-0 h-screen w-64 border-r bg-background p-6">
            <div className="space-y-4">
              <h3 className="font-semibold">Filters & Sort</h3>
              <WishFilterPanel
                wishLevelSelection={filterState.wishLevel}
                priceRange={filterState.cost}
                maxPrice={maxPrice}
                sortOption={filterState.sort}
                onWishLevelChange={setWishLevelSelection}
                onPriceChange={setPriceRange}
                onSortChange={setSortOption}
                onClearAll={resetFilters}
                activeFilterCount={activeFilterCount}
              />
            </div>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="flex-1">
          <div className="mx-auto max-w-screen-lg px-4 py-8 md:px-6 lg:px-8">
            {/* Page Header */}
            <div className="mb-4 text-center">
              <h1 className="mb-2 text-2xl font-bold">{list.name}</h1>
              {list.description && <p className="mb-2 text-muted-foreground">{list.description}</p>}
              <p className="text-sm text-muted-foreground">
                {list._count.listWishes} {list._count.listWishes === 1 ? 'wish' : 'wishes'} • by{' '}
                {list.user.name}
              </p>
            </div>

            {/* Dismissible Info Banner */}
            {!bannerDismissed && (
              <Card className="relative mb-4 border-info/20 bg-info/5 md:mb-6">
                <button
                  onClick={handleDismissBanner}
                  className="absolute right-2 top-2 rounded-full p-2 text-info/60 hover:bg-info/10 hover:text-info focus:outline-none focus:ring-2 focus:ring-info/40"
                  aria-label="Dismiss this notice"
                >
                  <X className="h-4 w-4 md:h-5 md:w-5" />
                </button>

                <CardContent className="pr-10 pt-4 md:pr-12 md:pt-6">
                  <div className="flex items-start gap-2 md:gap-3">
                    <div className="flex-shrink-0">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-info/10 md:h-8 md:w-8">
                        <Info className="h-3 w-3 text-info md:h-4 md:w-4" />
                      </div>
                    </div>
                    <div>
                      <h3 className="mb-1 text-sm font-medium text-foreground md:text-base">
                        {currentUserId === list.user.id
                          ? 'Viewing Your Wishlist'
                          : 'How to Reserve Gifts'}
                      </h3>
                      <p className="text-xs text-muted-foreground md:hidden">
                        {currentUserId === list.user.id ? (
                          <>This is how others see your wishlist.</>
                        ) : (
                          <>
                            Tap &quot;Reserve&quot; to claim a gift. Your name stays hidden from{' '}
                            {list.user.name}.
                          </>
                        )}
                      </p>
                      <p className="hidden text-sm text-muted-foreground md:block">
                        {currentUserId === list.user.id ? (
                          <>
                            This is how others see your wishlist. They can reserve items, but you
                            can&apos;t reserve your own wishes.
                          </>
                        ) : (
                          <>
                            Click the &quot;Reserve&quot; button on any item you plan to buy. Your
                            name stays hidden from {list.user.name} until after the gift is given.
                            This prevents duplicate gifts!
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

            {/* Wishes Display */}
            <FilteredWishesDisplay
              wishes={wishes}
              filterState={filterState}
              filteredWishes={filteredWishes}
              maxPrice={maxPrice}
              activeFilterCount={activeFilterCount}
              onWishLevelChange={setWishLevelSelection}
              onPriceChange={setPriceRange}
              onSortChange={setSortOption}
              onResetFilters={resetFilters}
              onReserve={(wish) => handleReserveWish(wish)}
              reservedWishIds={
                reservations
                  ? Object.keys(reservations).filter((wishId) => reservations[wishId].isReserved)
                  : []
              }
              isLoading={reservationsLoading}
              showFilters={true}
            />
          </div>
        </div>
      </div>

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
