// File: src/components/reservations/reservation-card.tsx
'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ArrowRight, X, ShoppingBag, Clock } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SelectionCheckbox } from '@/components/ui/selection-checkbox';
import { cn } from '@/lib/utils';
import { getWishImageSrc, isWishImageProcessing, hasWishImage } from '@/lib/utils/wish-images';
import type { ReservationWithWish } from '@/lib/validators/api-responses/reservations';

interface ReservationCardProps {
  reservation: ReservationWithWish & {
    wish: ReservationWithWish['wish'] & {
      imageUrl?: string | null;
      localImagePath?: string | null;
      list?: {
        id: string;
        name: string;
      };
    };
  };
  viewMode: 'grid' | 'list';
  isSelected: boolean;
  isPurchased: boolean; // !!reservation.purchasedAt
  isSelectionMode: boolean;
  onToggleSelect: (id: string) => void;
  onCancel: (reservation: ReservationCardProps['reservation']) => void;
  onMarkPurchased: (reservation: ReservationCardProps['reservation']) => void;
  onCardClick: (reservationId: string) => void;
}

export function ReservationCard({
  reservation,
  viewMode,
  isSelected,
  isPurchased,
  isSelectionMode,
  onToggleSelect,
  onCancel,
  onMarkPurchased,
  onCardClick,
}: ReservationCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const wishImageSrc = getWishImageSrc(reservation.wish);
  const isImageProcessing = isWishImageProcessing(reservation.wish);
  const hasImage = hasWishImage(reservation.wish);
  const ownerName = reservation.wish.user.name || reservation.wish.user.email;
  const listName = reservation.wish.list?.name || 'Wishlist';
  const listId = reservation.wish.list?.id;

  const handleCardClick = () => {
    if (!isSelectionMode) {
      onCardClick(reservation.id);
    }
  };

  // Grid view
  if (viewMode === 'grid') {
    return (
      <Card
        className={cn(
          'relative overflow-hidden transition-opacity',
          isPurchased && 'opacity-50',
          !isSelectionMode && 'cursor-pointer hover:shadow-md'
        )}
        onClick={handleCardClick}
      >
        {/* Checkbox - top-right corner, only visible in selection mode */}
        {isSelectionMode && (
          <SelectionCheckbox
            position="top-right"
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(reservation.id)}
          />
        )}

        <CardContent className="space-y-3 p-4">
          {/* Wish Image */}
          {(hasImage || reservation.wish.imageStatus === 'FAILED') && (
            <div className="relative aspect-square w-full overflow-hidden rounded-md bg-muted">
              {/* Skeleton loader */}
              {!imageLoaded && hasImage && !imageError && (
                <div className="absolute inset-0 animate-pulse bg-muted" />
              )}

              {hasImage && !imageError && (
                <Image
                  src={wishImageSrc || ''}
                  alt={reservation.wish.title}
                  fill
                  className={`object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                  unoptimized={isImageProcessing}
                />
              )}

              {/* Processing overlay */}
              {isImageProcessing && (
                <div className="absolute inset-0 flex items-start justify-end p-3">
                  <div className="flex items-center gap-1.5 rounded-full bg-blue-600/90 px-2.5 py-1.5 text-white shadow-lg">
                    <Clock className="h-3.5 w-3.5 animate-spin" />
                    <span className="text-xs font-medium">Optimizing...</span>
                  </div>
                </div>
              )}

              {/* Failed state */}
              {reservation.wish.imageStatus === 'FAILED' && (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <div className="mb-1 text-lg">📷</div>
                    <div className="text-sm">Image unavailable</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Title - larger font */}
          <div className="space-y-2">
            <h3 className="line-clamp-2 text-lg font-semibold leading-tight">
              {reservation.wish.title}
            </h3>

            {/* Breadcrumb: Owner → List (clickable) */}
            {listId ? (
              <Link
                href={`/lists/${listId}`}
                className="group flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                aria-label={`View ${ownerName}'s ${listName}`}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="font-medium text-foreground group-hover:underline">{ownerName}</span>
                <ArrowRight className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate group-hover:underline">{listName}</span>
              </Link>
            ) : (
              <div
                className="flex items-center gap-1.5 text-sm text-muted-foreground"
                aria-label={`${ownerName}'s ${listName}`}
              >
                <span className="font-medium text-foreground">{ownerName}</span>
                <ArrowRight className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{listName}</span>
              </div>
            )}

            {/* Purchased badge */}
            {isPurchased && (
              <Badge variant="outline" className="border-green-600 bg-green-50 text-green-700">
                Purchased
              </Badge>
            )}
          </div>

          {/* Action buttons - Icon + Text format */}
          <div className="flex flex-col gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onCancel(reservation);
              }}
              aria-label="Cancel reservation"
              className="w-full"
            >
              <X className="mr-1 h-4 w-4" />
              Cancel
            </Button>
            {!isPurchased && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkPurchased(reservation);
                }}
                aria-label="Mark as purchased"
                className="w-full"
              >
                <ShoppingBag className="mr-1 h-4 w-4" />
                Mark Purchased
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // List view - compact horizontal row
  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-opacity',
        isPurchased && 'opacity-60',
        !isSelectionMode && 'cursor-pointer hover:shadow-md'
      )}
      onClick={handleCardClick}
    >
      <CardContent className="flex min-h-[60px] items-center gap-3 p-3">
        {/* Checkbox - left side, only visible in selection mode */}
        {isSelectionMode && (
          <label
            htmlFor={`select-reservation-${reservation.id}`}
            className="-m-3 flex cursor-pointer items-center justify-center p-3"
          >
            <input
              id={`select-reservation-${reservation.id}`}
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(reservation.id)}
              className="h-4 w-4 rounded border"
              aria-label={`Select ${reservation.wish.title}`}
            />
          </label>
        )}

        {/* Thumbnail */}
        {(hasImage || reservation.wish.imageStatus === 'FAILED') && (
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-muted">
            {/* Skeleton loader */}
            {!imageLoaded && hasImage && !imageError && (
              <div className="absolute inset-0 animate-pulse bg-muted" />
            )}

            {hasImage && !imageError && (
              <Image
                src={wishImageSrc || ''}
                alt={reservation.wish.title}
                fill
                className={`object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                sizes="48px"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                unoptimized={isImageProcessing}
              />
            )}

            {/* Processing overlay */}
            {isImageProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-blue-600/90">
                <Clock className="h-4 w-4 animate-spin text-white" />
              </div>
            )}

            {/* Failed state */}
            {reservation.wish.imageStatus === 'FAILED' && (
              <div className="flex h-full items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <div className="text-2xl">📷</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Title + Breadcrumb */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="truncate text-sm font-semibold">{reservation.wish.title}</h3>
          {/* Breadcrumb: Owner → List (clickable) */}
          {listId ? (
            <Link
              href={`/lists/${listId}`}
              className="group flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              aria-label={`View ${ownerName}'s ${listName}`}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="font-medium text-foreground group-hover:underline">{ownerName}</span>
              <ArrowRight className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate group-hover:underline">{listName}</span>
            </Link>
          ) : (
            <div
              className="flex items-center gap-1 text-xs text-muted-foreground"
              aria-label={`${ownerName}'s ${listName}`}
            >
              <span className="font-medium text-foreground">{ownerName}</span>
              <ArrowRight className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{listName}</span>
            </div>
          )}
        </div>

        {/* Reserved date */}
        <div className="hidden shrink-0 text-xs text-muted-foreground sm:block">
          {formatDistanceToNow(new Date(reservation.reservedAt), { addSuffix: true })}
        </div>

        {/* Purchased badge */}
        {isPurchased && (
          <Badge
            variant="outline"
            className="shrink-0 border-green-600 bg-green-50 text-xs text-green-700"
          >
            Purchased
          </Badge>
        )}

        {/* Action buttons - Icon + Text format */}
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onCancel(reservation);
            }}
            aria-label="Cancel reservation"
          >
            <X className="mr-1 h-4 w-4" />
            Cancel
          </Button>
          {!isPurchased && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onMarkPurchased(reservation);
              }}
              aria-label="Mark as purchased"
            >
              <ShoppingBag className="mr-1 h-4 w-4" />
              Mark Purchased
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
