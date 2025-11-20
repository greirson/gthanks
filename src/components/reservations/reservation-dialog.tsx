'use client';

import { Wish } from '@/lib/validators/api-responses/wishes';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Loader2 } from 'lucide-react';

import { useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeButton } from '@/components/ui/theme-button';
import { useToast } from '@/components/ui/use-toast';
import { listsApi } from '@/lib/api/lists';
import { reservationsApi } from '@/lib/api/reservations';

interface ReservationDialogProps {
  wish: Wish | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAuthenticated?: boolean;
  userName?: string;
  userEmail?: string;
  shareToken?: string; // Optional share token for public list reservations
}

export function ReservationDialog({
  wish,
  open,
  onOpenChange,
  isAuthenticated = false,
  userName,
  userEmail,
  shareToken,
}: ReservationDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Form state for anonymous users
  const [formData, setFormData] = useState({
    name: '',
    email: userEmail || '',
  });

  // Reserve mutation
  const reserveMutation = useMutation({
    mutationFn: async () => {
      if (!wish) {
        return;
      }

      // For public list sharing, always require name and email
      const input = {
        wishId: wish.id,
        reserverName: isAuthenticated ? userName || 'Anonymous' : formData.name || 'Anonymous',
        reserverEmail: isAuthenticated ? userEmail || null : formData.email || null,
      };

      // Use public list endpoint if shareToken is provided
      if (shareToken) {
        return listsApi.createAnonymousReservation(shareToken, input);
      }

      // Otherwise use regular reservation endpoint
      return reservationsApi.reserveWish(wish.id, input) as Promise<unknown>;
    },
    onSuccess: () => {
      toast({
        title: 'Success!',
        description: 'You have reserved this item. The wish owner will not see your reservation.',
      });

      // Invalidate queries to refresh reservation status
      void queryClient.invalidateQueries({ queryKey: ['reservations'] });
      void queryClient.invalidateQueries({ queryKey: ['lists'] });
      void queryClient.invalidateQueries({ queryKey: ['list-reservations'] });

      // Close dialog
      onOpenChange(false);

      // Reset form
      setFormData({ name: '', email: '' });
    },
    onError: (error: unknown) => {
      console.error('Reservation error:', error);

      // Extract error message from various possible error structures
      let message = 'Failed to reserve item';
      const axiosError = error as Error & {
        response?: {
          data?: {
            error?: string;
            message?: string;
          };
        };
      };

      if (axiosError.response?.data?.error) {
        message = axiosError.response.data.error;
      } else if (axiosError.response?.data?.message) {
        message = axiosError.response.data.message;
      } else if (error instanceof Error && error.message) {
        message = error.message;
      }

      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email if provided
    if (!isAuthenticated && formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast({
          title: 'Invalid email',
          description: 'Please enter a valid email address',
          variant: 'destructive',
        });
        return;
      }
    }

    reserveMutation.mutate();
  };

  if (!wish) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Reserve Item</DialogTitle>
            <DialogDescription>
              You&apos;re about to reserve &quot;{wish.title}&quot;
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The wish owner will not see who reserved this item. Only other gift-givers can see
                reservations.
              </AlertDescription>
            </Alert>

            {!isAuthenticated && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Your Name (optional)</Label>
                  <Input
                    id="name"
                    placeholder="Anonymous"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    disabled={reserveMutation.isPending}
                  />
                  <p className="text-sm text-muted-foreground">
                    This helps other gift-givers coordinate
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Your Email (optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    disabled={reserveMutation.isPending}
                  />
                  <p className="text-sm text-muted-foreground">
                    Save your email to manage your reservations later
                  </p>
                </div>
              </>
            )}

            {wish.price && (
              <div className="rounded-md bg-muted p-3">
                <p className="text-sm text-muted-foreground">Estimated price:</p>
                <p className="text-lg font-semibold">
                  ${typeof wish.price === 'string' ? parseFloat(wish.price) : wish.price}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={reserveMutation.isPending}
            >
              Cancel
            </Button>
            <ThemeButton type="submit" disabled={reserveMutation.isPending}>
              {reserveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reserving...
                </>
              ) : (
                'Confirm Reservation'
              )}
            </ThemeButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
