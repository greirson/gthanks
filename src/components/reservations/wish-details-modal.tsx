'use client';

import { useState } from 'react';
import { X, ShoppingBag, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { ReservationWithWish } from '@/lib/validators/api-responses/reservations';

interface WishDetailsModalProps {
  reservation: (ReservationWithWish & {
    wish: ReservationWithWish['wish'] & {
      price?: number | null;
      currency?: string | null;
      notes?: string | null;
      size?: string | null;
      color?: string | null;
      quantity?: number;
      imageUrl?: string | null;
      localImagePath?: string | null;
      list?: {
        id: string;
        name: string;
      };
    };
  }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onMarkPurchased: () => void;
}

export function WishDetailsModal({
  reservation,
  open,
  onOpenChange,
  onCancel,
  onMarkPurchased,
}: WishDetailsModalProps) {
  const [isActionLoading, setIsActionLoading] = useState(false);

  if (!reservation) {return null;}

  const wish = reservation.wish;
  const wishImageUrl = wish.localImagePath || wish.imageUrl;
  const ownerName = wish.user.name || wish.user.email;
  const isPurchased = !!reservation.purchasedAt;
  const hasDetails = wish.notes || wish.size || wish.color || wish.url;

  // Format price
  const formattedPrice =
    wish.price && wish.price > 0
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: wish.currency || 'USD',
        }).format(wish.price)
      : null;

  const handleCancel = async () => {
    setIsActionLoading(true);
    try {
      onCancel();
    } finally {
      setIsActionLoading(false);
      onOpenChange(false);
    }
  };

  const handleMarkPurchased = async () => {
    setIsActionLoading(true);
    try {
      onMarkPurchased();
    } finally {
      setIsActionLoading(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-8">{wish.title}</DialogTitle>
          <DialogDescription>
            Reserved {formatDistanceToNow(new Date(reservation.reservedAt), { addSuffix: true })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Wish Image */}
          {wishImageUrl && (
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
              <Image
                src={wishImageUrl}
                alt={wish.title}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 672px"
                priority
              />
            </div>
          )}

          {/* Breadcrumb: Owner → List */}
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{ownerName}</span>
            {wish.list && (
              <>
                <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Link
                  href={`/lists/${wish.list.id}`}
                  className="text-primary hover:underline"
                  onClick={() => onOpenChange(false)}
                >
                  {wish.list.name}
                </Link>
              </>
            )}
          </div>

          {/* Price and Quantity */}
          {(formattedPrice || (wish.quantity && wish.quantity > 1)) && (
            <div className="flex flex-wrap items-center gap-3">
              {formattedPrice && (
                <div className="text-2xl font-bold">{formattedPrice}</div>
              )}
              {wish.quantity && wish.quantity > 1 && (
                <Badge variant="outline" className="text-sm">
                  Quantity: {wish.quantity}
                </Badge>
              )}
            </div>
          )}

          {/* Additional Details */}
          {hasDetails && (
            <>
              <Separator />
              <div className="space-y-4">
                {wish.notes && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                      Description
                    </h3>
                    <p className="whitespace-pre-wrap text-sm">{wish.notes}</p>
                  </div>
                )}

                {(wish.size || wish.color) && (
                  <div className="flex flex-wrap gap-4">
                    {wish.size && (
                      <div>
                        <h3 className="mb-1 text-sm font-semibold text-muted-foreground">Size</h3>
                        <p className="text-sm">{wish.size}</p>
                      </div>
                    )}
                    {wish.color && (
                      <div>
                        <h3 className="mb-1 text-sm font-semibold text-muted-foreground">Color</h3>
                        <p className="text-sm">{wish.color}</p>
                      </div>
                    )}
                  </div>
                )}

                {wish.url && (
                  <div>
                    <h3 className="mb-1 text-sm font-semibold text-muted-foreground">
                      Product Link
                    </h3>
                    <a
                      href={wish.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-sm text-primary hover:underline"
                    >
                      {wish.url}
                    </a>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Purchased Badge */}
          {isPurchased && (
            <Badge variant="outline" className="w-fit border-green-600 bg-green-50 text-green-700">
              Purchased
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isActionLoading}
            className="w-full sm:w-auto sm:flex-1"
          >
            <X className="mr-2 h-4 w-4" />
            Cancel Reservation
          </Button>
          {!isPurchased && (
            <Button
              onClick={handleMarkPurchased}
              disabled={isActionLoading}
              className="w-full sm:w-auto sm:flex-1"
            >
              <ShoppingBag className="mr-2 h-4 w-4" />
              Mark as Purchased
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
