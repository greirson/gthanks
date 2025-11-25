'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface BulkActionDialogsProps {
  cancelDialogOpen: boolean;
  purchaseDialogOpen: boolean;
  selectedCount: number;
  onCancelConfirm: () => void;
  onPurchaseConfirm: (purchasedDate?: Date) => void;
  onCancel: () => void;
}

export function BulkActionDialogs({
  cancelDialogOpen,
  purchaseDialogOpen,
  selectedCount,
  onCancelConfirm,
  onPurchaseConfirm,
  onCancel,
}: BulkActionDialogsProps) {
  const [useToday, setUseToday] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const handlePurchaseConfirm = () => {
    if (useToday) {
      onPurchaseConfirm();
    } else {
      onPurchaseConfirm(new Date(selectedDate));
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      onCancel();
      // Reset state when dialog closes
      setUseToday(true);
      setSelectedDate(new Date().toISOString().split('T')[0]);
    }
  };

  return (
    <>
      {/* Bulk Cancel Confirmation Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              Cancel {selectedCount} {selectedCount === 1 ? 'reservation' : 'reservations'}?
            </DialogTitle>
            <DialogDescription>
              These reservations will be removed and the items will become available to others.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onCancelConfirm}
              className="w-full sm:w-auto"
            >
              Remove Reservations
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Mark as Purchased Dialog */}
      <Dialog open={purchaseDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              Mark {selectedCount} {selectedCount === 1 ? 'reservation' : 'reservations'} as
              purchased?
            </DialogTitle>
            <DialogDescription>
              These items will be moved to the purchased section but remain visible.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Use Today's Date Checkbox */}
            <div className="flex items-center space-x-3">
              <Checkbox
                id="use-today"
                checked={useToday}
                onCheckedChange={(checked) => setUseToday(!!checked)}
                className="h-5 w-5"
              />
              <Label
                htmlFor="use-today"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Use today&apos;s date
              </Label>
            </div>

            {/* Date Picker (shown when "Use today's date" is unchecked) */}
            {!useToday && (
              <div className="space-y-2">
                <Label htmlFor="purchase-date" className="text-sm font-medium">
                  Purchase date
                </Label>
                <Input
                  id="purchase-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Select the date you purchased these items
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="button" onClick={handlePurchaseConfirm} className="w-full sm:w-auto">
              Mark as Purchased
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
