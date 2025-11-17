import { Suspense } from 'react';
import { UserManagement } from '@/components/admin/user-management';

export const metadata = {
  title: 'Admin - gthanks',
  description: 'Administration page for gthanks',
};

export default function AdminPage() {
  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-foreground">Admin</h1>
          <p className="mt-2 text-sm text-muted-foreground">Manage users</p>
        </div>
      </div>

      <div className="mt-8">
        <Suspense fallback={<div>Loading users...</div>}>
          <UserManagement />
        </Suspense>
      </div>
    </div>
  );
}
