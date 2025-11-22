// File: src/app/my-reservations/page.tsx
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { ReservationCard } from '@/components/reservations/reservation-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BrowseListsButton } from '@/components/my-reservations/BrowseListsButton';

export default async function MyReservationsPage() {
  const session = await getServerSession();

  if (!session?.user) {
    redirect('/api/auth/signin?callbackUrl=/my-reservations');
  }

  // Fetch user's reservations
  const reservations = await db.reservation.findMany({
    where: { userId: session.user.id },
    include: {
      wish: {
        include: {
          owner: {
            select: { name: true, email: true }
          }
        }
      }
    },
    orderBy: { reservedAt: 'desc' }
  });

  // Group by list owner
  const groupedByOwner = reservations.reduce((acc, res) => {
    const ownerName = res.wish.owner.name || res.wish.owner.email;
    if (!acc[ownerName]) {acc[ownerName] = [];}
    acc[ownerName].push(res);
    return acc;
  }, {} as Record<string, typeof reservations>);

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-6">My Reservations</h1>

      {reservations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">You haven't reserved any items yet.</p>
          <BrowseListsButton />
        </div>
      ) : (
        <>
          {Object.entries(groupedByOwner).map(([ownerName, items]) => (
            <div key={ownerName} className="mb-8">
              <h2 className="text-xl font-semibold mb-4">
                For {ownerName} ({items.length} {items.length === 1 ? 'item' : 'items'})
              </h2>

              <div className="space-y-3">
                {items.map((reservation) => (
                  <ReservationCard
                    key={reservation.id}
                    reservation={reservation}
                  />
                ))}
              </div>
            </div>
          ))}

          {reservations.length > 5 && (
            <Alert className="mt-6">
              <AlertDescription>
                You've reserved {reservations.length} items! That's a lot of gifts!
              </AlertDescription>
            </Alert>
          )}
        </>
      )}
    </div>
  );
}
