// File: src/components/reservations/reservation-card.tsx
'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

interface ReservationCardProps {
  reservation: {
    id: string;
    reservedAt: Date;
    wish: {
      title: string;
      url: string | null;
    };
  };
}

export function ReservationCard({ reservation }: ReservationCardProps) {
  const [undoToken, setUndoToken] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const cancelMutation = useMutation({
    mutationFn: async (reservationId: string) => {
      const response = await fetch(`/api/reservations/${reservationId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to cancel');
      }
      return { id: reservationId };
    },
    onSuccess: ({ id }) => {
      // Store for undo
      setUndoToken(id);
      setTimeout(() => setUndoToken(null), 5000);

      // FIX: Use router.refresh() instead of queryClient
      router.refresh(); // Re-fetch server component data

      toast({
        title: 'Reservation cancelled',
        description: 'The item is now available for others.',
        action: undoToken ? (
          <Button variant="outline" size="sm" onClick={handleUndo}>
            Undo
          </Button>
        ) : undefined,
      });
    },
  });

  const handleUndo = async () => {
    // Re-create reservation
    // Implementation depends on undo strategy
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">{reservation.wish.title}</h3>
            <p className="text-sm text-muted-foreground">
              Reserved {formatDistanceToNow(reservation.reservedAt, { addSuffix: true })}
            </p>
            {reservation.wish.url && (
              <a
                href={reservation.wish.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm text-primary hover:underline"
              >
                View product →
              </a>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => cancelMutation.mutate(reservation.id)}
          disabled={cancelMutation.isPending}
        >
          {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Reservation'}
        </Button>
      </CardFooter>
    </Card>
  );
}
