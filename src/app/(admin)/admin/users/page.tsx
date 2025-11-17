import { Suspense } from 'react';

import { UserManagement } from '@/components/admin/user-management';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function UserManagementSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function UsersPage() {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            View and manage all user accounts, including suspensions and role assignments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<UserManagementSkeleton />}>
            <UserManagement />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
