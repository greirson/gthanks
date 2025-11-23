'use client';

import { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { ReservationWithWish } from '@/lib/validators/api-responses/reservations';
import { ReservationCard } from './reservation-card';
import { cn } from '@/lib/utils';

interface ReservationsDisplayProps {
  reservations: ReservationWithWish[];
  viewMode: 'grid' | 'list';
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onCancel: (reservation: ReservationWithWish) => void;
  onMarkPurchased: (reservation: ReservationWithWish) => void;
}

interface OwnerGroup {
  ownerId: string;
  ownerName: string;
  activeItems: ReservationWithWish[];
  purchasedItems: ReservationWithWish[];
}

/**
 * Group reservations by owner, then separate active vs purchased within each owner.
 */
function groupReservations(reservations: ReservationWithWish[]): OwnerGroup[] {
  // Group by owner ID
  const byOwner = reservations.reduce(
    (acc, res) => {
      const ownerId = res.wish.user.id;
      if (!acc[ownerId]) {
        acc[ownerId] = [];
      }
      acc[ownerId].push(res);
      return acc;
    },
    {} as Record<string, ReservationWithWish[]>
  );

  // Process each owner group: separate active vs purchased
  return Object.entries(byOwner).map(([ownerId, items]) => {
    const active = items.filter((res) => !res.purchasedAt);
    const purchased = items.filter((res) => res.purchasedAt);

    return {
      ownerId,
      ownerName: items[0].wish.user.name || items[0].wish.user.email,
      activeItems: active,
      purchasedItems: purchased,
    };
  });
}

/**
 * Flatten grouped reservations into a single array for virtual scrolling.
 * Each item tracks whether it's the last in its section.
 */
interface FlatReservation {
  reservation: ReservationWithWish;
  isPurchased: boolean;
  isLastInSection: boolean;
}

function flattenGroups(groups: OwnerGroup[]): FlatReservation[] {
  const flattened: FlatReservation[] = [];

  groups.forEach((group) => {
    // Add active items
    group.activeItems.forEach((res, idx) => {
      flattened.push({
        reservation: res,
        isPurchased: false,
        isLastInSection: idx === group.activeItems.length - 1 && group.purchasedItems.length === 0,
      });
    });

    // Add purchased items (grayed out, at bottom of owner group)
    group.purchasedItems.forEach((res, idx) => {
      flattened.push({
        reservation: res,
        isPurchased: true,
        isLastInSection: idx === group.purchasedItems.length - 1,
      });
    });
  });

  return flattened;
}

export function ReservationsDisplay({
  reservations,
  viewMode,
  selectedIds,
  onToggleSelect,
  onCancel,
  onMarkPurchased,
}: ReservationsDisplayProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Group reservations
  const groups = useMemo(() => groupReservations(reservations), [reservations]);

  // Flatten for virtual scrolling
  const flatItems = useMemo(() => flattenGroups(groups), [groups]);

  // Virtual scrolling threshold: 50+ items
  const useVirtualScroll = flatItems.length > 50;

  // Virtual scrolling configuration
  const virtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (viewMode === 'grid' ? 280 : 80), // Fixed heights for performance
    enabled: useVirtualScroll,
    overscan: 5, // Render 5 extra items above/below viewport
  });

  // Regular rendering (no virtual scroll)
  if (!useVirtualScroll) {
    return (
      <div className={cn(viewMode === 'grid' && 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3')}>
        {flatItems.map(({ reservation, isPurchased, isLastInSection }) => (
          <div
            key={reservation.id}
            className={cn(
              viewMode === 'list' && 'mb-2',
              isLastInSection && 'mb-8', // Add spacing between owner groups
              isPurchased && 'opacity-60' // De-emphasize purchased items
            )}
          >
            <ReservationCard
              reservation={reservation}
              viewMode={viewMode}
              isSelected={selectedIds.has(reservation.id)}
              isPurchased={isPurchased}
              onToggleSelect={onToggleSelect}
              onCancel={onCancel}
              onMarkPurchased={onMarkPurchased}
            />
          </div>
        ))}
      </div>
    );
  }

  // Virtual scrolling rendering
  return (
    <div
      ref={parentRef}
      className="h-[calc(100vh-200px)] overflow-auto"
      style={{ contain: 'strict' }} // Performance optimization
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const { reservation, isPurchased, isLastInSection } = flatItems[virtualRow.index];

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className={cn(isPurchased && 'opacity-60')}
            >
              <div
                className={cn(
                  viewMode === 'grid' && 'px-2',
                  viewMode === 'list' && 'mb-2',
                  isLastInSection && 'mb-8' // Add spacing between owner groups
                )}
              >
                <ReservationCard
                  reservation={reservation}
                  viewMode={viewMode}
                  isSelected={selectedIds.has(reservation.id)}
                  isPurchased={isPurchased}
                  onToggleSelect={onToggleSelect}
                  onCancel={onCancel}
                  onMarkPurchased={onMarkPurchased}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
