import { Suspense, lazy } from 'react';

import { Skeleton } from '@/components/ui/skeleton';

// Lazy load the GroupForm component for code splitting
export const GroupFormLazy = lazy(() =>
  import('./group-form').then((module) => ({ default: module.GroupForm }))
);

// Loading component while GroupForm is being loaded
const GroupFormSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-20 w-full" />
    <Skeleton className="h-10 w-1/2" />
    <div className="flex gap-2">
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-10 w-24" />
    </div>
  </div>
);

// Wrapper component with Suspense boundary
export const GroupFormWithSuspense = (props: React.ComponentProps<typeof GroupFormLazy>) => (
  <Suspense fallback={<GroupFormSkeleton />}>
    <GroupFormLazy {...props} />
  </Suspense>
);
