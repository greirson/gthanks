// File: src/components/reservations/reservation-card.tsx
'use client';

import { formatDistanceToNow } from 'date-fns';
import { ArrowRight, X, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SelectionCheckbox } from '@/components/ui/selection-checkbox';
import { cn } from '@/lib/utils';
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
  const wishImageUrl = reservation.wish.localImagePath || reservation.wish.imageUrl;
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
        {/* Checkbox - bottom-right corner, only visible in selection mode */}
        {isSelectionMode && (
          <div className="absolute bottom-3 right-3 z-10">
            <SelectionCheckbox
              checked={isSelected}
              onCheckedChange={(checked) => {
                onToggleSelect(reservation.id);
              }}
            />
          </div>
        )}

        <CardContent className="space-y-3 p-4">
          {/* Wish Image */}
          {wishImageUrl && (
            <div className="relative aspect-square w-full overflow-hidden rounded-md bg-muted">
              <Image
                src={wishImageUrl}
                alt={reservation.wish.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
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
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                aria-label={`View ${ownerName}'s ${listName}`}
                onClick={(e) => e.stopPropagation()}
              >
                <span className="font-medium text-foreground">{ownerName}</span>
                <ArrowRight className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{listName}</span>
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

            {/* Reserved date (relative) */}
            <p className="text-xs text-muted-foreground">
              Reserved {formatDistanceToNow(new Date(reservation.reservedAt), { addSuffix: true })}
            </p>

            {/* Purchased badge */}
            {isPurchased && (
              <Badge variant="outline" className="border-green-600 bg-green-50 text-green-700">
                Purchased
              </Badge>
            )}
          </div>

          {/* Action buttons - Icon + Text format */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onCancel(reservation);
              }}
              aria-label="Cancel reservation"
              className="flex-1"
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
                className="flex-1"
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
          <div className="flex h-11 w-11 shrink-0 items-center justify-center">
            <SelectionCheckbox
              checked={isSelected}
              onCheckedChange={(checked) => {
                onToggleSelect(reservation.id);
              }}
            />
          </div>
        )}

        {/* Thumbnail */}
        {wishImageUrl && (
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
            <Image
              src={wishImageUrl}
              alt={reservation.wish.title}
              fill
              className="object-cover"
              sizes="48px"
            />
          </div>
        )}

        {/* Title + Breadcrumb */}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="truncate text-sm font-semibold">{reservation.wish.title}</h3>
          {/* Breadcrumb: Owner → List (clickable) */}
          {listId ? (
            <Link
              href={`/lists/${listId}`}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              aria-label={`View ${ownerName}'s ${listName}`}
              onClick={(e) => e.stopPropagation()}
            >
              <span className="font-medium text-foreground">{ownerName}</span>
              <ArrowRight className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{listName}</span>
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
