'use client';

import { CheckCircle, ShoppingBag, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ReservationWithWish } from '@/lib/validators/api-responses/reservations';

export interface ActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: ReservationWithWish | null;
  onCancelConfirm: () => void;
  onMarkPurchasedClick: () => void;
}

export function ActionDialog({
  open,
  onOpenChange,
  reservation,
  onCancelConfirm,
  onMarkPurchasedClick,
}: ActionDialogProps) {
  if (!reservation) {return null;}

  const wishTitle = reservation.wish.title;
  const ownerName = reservation.wish.user.name || reservation.wish.user.email;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>What would you like to do?</DialogTitle>
          <DialogDescription>
            Choose an action for{' '}
            <span className="font-medium text-foreground">{wishTitle}</span> (reserved for{' '}
            {ownerName})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Option 1: Keep Reservation (Ghost - Safest) */}
          <Button
            variant="ghost"
            className="h-auto w-full justify-start py-3"
            onClick={() => {
              onOpenChange(false);
            }}
          >
            <CheckCircle className="mr-3 h-5 w-5 flex-shrink-0" />
            <div className="flex flex-col items-start text-left">
              <div className="font-medium">Keep Reservation</div>
              <div className="text-xs font-normal text-muted-foreground">
                No changes, keep this item reserved
              </div>
            </div>
          </Button>

          {/* Option 2: Mark as Purchased (Primary Action) */}
          <Button
            variant="default"
            className="h-auto w-full justify-start py-3"
            onClick={() => {
              onMarkPurchasedClick();
              onOpenChange(false);
            }}
          >
            <ShoppingBag className="mr-3 h-5 w-5 flex-shrink-0" />
            <div className="flex flex-col items-start text-left">
              <div className="font-medium">Mark as Purchased</div>
              <div className="text-xs font-normal text-muted-foreground">
                Move to purchased section (can add purchase date)
              </div>
            </div>
          </Button>

          {/* Option 3: Cancel Reservation (Destructive) */}
          <Button
            variant="destructive"
            className="h-auto w-full justify-start py-3"
            onClick={() => {
              onCancelConfirm();
              onOpenChange(false);
            }}
          >
            <XCircle className="mr-3 h-5 w-5 flex-shrink-0" />
            <div className="flex flex-col items-start text-left">
              <div className="font-medium">Cancel Reservation</div>
              <div className="text-xs font-normal text-muted-foreground">
                Remove reservation, item becomes available to others
              </div>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
