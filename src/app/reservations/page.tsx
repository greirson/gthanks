'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { Calendar, Trash2, User } from 'lucide-react';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import { reservationsApi } from '@/lib/api/reservations';
import { ReservationWithWish } from '@/lib/validators/api-responses/reservations';

export default function MyReservationsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [reservationToDelete, setReservationToDelete] = useState<ReservationWithWish | null>(null);

  // Fetch reservations
  const { data: reservations, isLoading } = useQuery({
    queryKey: ['my-reservations', email],
    queryFn: () => reservationsApi.getMyReservations(email),
    enabled: hasSearched && !!email,
  });

  // Remove reservation mutation
  const removeMutation = useMutation({
    mutationFn: (reservationId: string) => reservationsApi.removeReservation(reservationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-reservations'] });
      toast({
        title: 'Reservation removed',
        description: 'The item is no longer reserved by you',
      });
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<{ error?: string }>;
      if (axiosError.response?.status === 401) {
        toast({
          title: 'Authentication required',
          description: 'Please sign in to remove reservations',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Failed to remove reservation',
          description: axiosError.response?.data?.error || 'Please try again',
          variant: 'destructive',
        });
      }
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setHasSearched(true);
    }
  };

  const handleRemove = (reservation: ReservationWithWish) => {
    setReservationToDelete(reservation);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto max-w-4xl px-4">
        <h1 className="mb-8 text-3xl font-bold">My Reservations</h1>

        {/* Email Search */}
        {!hasSearched && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Find Your Reservations</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Enter the email you used when reserving items</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <Button type="submit">View Reservations</Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {hasSearched && (
          <>
            {/* Search info */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-600">
                Showing reservations for: <strong className="break-all">{email}</strong>
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEmail('');
                  setHasSearched(false);
                }}
                className="w-full sm:w-auto"
              >
                Search Again
              </Button>
            </div>

            {/* Loading */}
            {isLoading && (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            )}

            {/* Reservations */}
            {reservations && (
              <>
                {reservations.length > 0 ? (
                  <div className="space-y-4">
                    {reservations.map((reservation) => (
                      <Card key={reservation.id}>
                        <CardContent className="pt-6">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 flex-1">
                              <h3 className="mb-2 break-words text-lg font-semibold">
                                {reservation.wish.title}
                              </h3>

                              <div className="space-y-1 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 flex-shrink-0" />
                                  <span className="break-all">
                                    For: {reservation.wish.user.name || reservation.wish.user.email}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 flex-shrink-0" />
                                  <span>Reserved on: {formatDate(reservation.reservedAt)}</span>
                                </div>
                              </div>
                            </div>

                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemove(reservation)}
                              disabled={removeMutation.isPending}
                              className="w-full flex-shrink-0 sm:w-auto"
                            >
                              <Trash2 className="mr-2 h-4 w-4 sm:mr-0" />
                              <span className="sm:hidden">Remove Reservation</span>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-center text-gray-500">
                        No reservations found for this email address
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!reservationToDelete}
        onOpenChange={() => setReservationToDelete(null)}
        title="Remove Reservation"
        description={`Are you sure you want to remove your reservation for "${reservationToDelete?.wish.title}"? This action cannot be undone.`}
        confirmText="Remove Reservation"
        variant="destructive"
        onConfirm={() => {
          if (reservationToDelete) {
            removeMutation.mutate(reservationToDelete.id);
            setReservationToDelete(null);
          }
        }}
      />
    </div>
  );
}
