'use client';

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
import { useState, useEffect } from 'react';

interface PurchaseDatePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (date: Date) => void;
}

export function PurchaseDatePicker({ open, onOpenChange, onConfirm }: PurchaseDatePickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [useToday, setUseToday] = useState(true);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedDate(new Date());
      setUseToday(true);
    }
  }, [open]);

  const handleConfirm = () => {
    onConfirm(useToday ? new Date() : selectedDate);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  // Format date for input (YYYY-MM-DD)
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get today's date in YYYY-MM-DD format for max constraint
  const today = formatDateForInput(new Date());

  // Handle date input change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateStr = e.target.value;
    if (dateStr) {
      setSelectedDate(new Date(dateStr));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>When did you purchase this?</DialogTitle>
          <DialogDescription>Optional - helps track your purchase history</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Use today's date checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="use-today"
              checked={useToday}
              onCheckedChange={(checked) => setUseToday(!!checked)}
              aria-label="Use today's date"
            />
            <Label
              htmlFor="use-today"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Use today&apos;s date
            </Label>
          </div>

          {/* Date picker - only shown when checkbox unchecked */}
          {!useToday && (
            <div className="space-y-2">
              <Label htmlFor="purchase-date" className="text-sm font-medium">
                Select date
              </Label>
              <input
                id="purchase-date"
                type="date"
                value={formatDateForInput(selectedDate)}
                max={today}
                onChange={handleDateChange}
                className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                aria-describedby="date-helper"
              />
              <p id="date-helper" className="text-xs text-muted-foreground">
                Cannot select a future date
              </p>
            </div>
          )}

          {/* Show selected date preview */}
          <div className="rounded-md bg-muted p-3 text-sm">
            <span className="font-medium">Selected date: </span>
            <span className="text-muted-foreground">
              {(useToday ? new Date() : selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
