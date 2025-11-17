import { ComponentProps } from 'react';

import dynamic from 'next/dynamic';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Loading components for code-split components
// VirtualGridSkeleton removed in MVP simplification

const FormSkeleton = () => (
  <Card className="p-6">
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-20" />
      </div>
    </div>
  </Card>
);

// Dynamically imported components with loading states
// Virtual components removed in MVP simplification

export const DynamicListForm = dynamic(
  () => import('@/components/lists/list-form').then((mod) => ({ default: mod.ListForm })),
  {
    loading: () => <FormSkeleton />,
  }
);

export const DynamicWishForm = dynamic(
  () => import('@/components/wishes/wish-form').then((mod) => ({ default: mod.WishForm })),
  {
    loading: () => <FormSkeleton />,
  }
);

export const DynamicGroupForm = dynamic(
  () => import('@/components/groups/group-form').then((mod) => ({ default: mod.GroupForm })),
  {
    loading: () => <FormSkeleton />,
  }
);

// Dialog components (heavy due to portal rendering)
export const DynamicListSharingDialog = dynamic(
  () =>
    import('@/components/lists/list-sharing-dialog').then((mod) => ({
      default: mod.ListSharingDialog,
    })),
  {
    loading: () => <Skeleton className="h-96 w-full" />,
  }
);

export const DynamicReservationDialog = dynamic(
  () =>
    import('@/components/reservations/reservation-dialog').then((mod) => ({
      default: mod.ReservationDialog,
    })),
  {
    loading: () => <Skeleton className="h-64 w-full" />,
  }
);

export const DynamicAddToListDialog = dynamic(
  () =>
    import('@/components/lists/add-to-list-dialog').then((mod) => ({
      default: mod.AddToListDialog,
    })),
  {
    loading: () => <Skeleton className="h-80 w-full" />,
  }
);

// Type helpers for dynamic components
// Virtual component types removed in MVP simplification
export type DynamicListFormProps = ComponentProps<typeof DynamicListForm>;
export type DynamicWishFormProps = ComponentProps<typeof DynamicWishForm>;
export type DynamicGroupFormProps = ComponentProps<typeof DynamicGroupForm>;
