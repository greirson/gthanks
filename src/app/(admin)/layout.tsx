import { ReactNode } from 'react';

import { AdminNavigation } from '@/components/admin/admin-navigation';
import { MainNavWrapper } from '@/components/navigation/main-nav-wrapper';
import { requireAdmin } from '@/lib/auth-admin';
import { getCurrentUser } from '@/lib/auth-utils';

interface AdminLayoutProps {
  children: ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  // Require admin authentication
  const admin = await requireAdmin();

  // Fetch current user data for MainNav
  const sessionUser = await getCurrentUser();

  const user = {
    id: sessionUser!.id,
    name: sessionUser!.name || null,
    email: sessionUser!.email || '',
    avatarUrl: sessionUser!.avatarUrl || null,
    isAdmin: true,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <MainNavWrapper fallbackUser={user} />

      {/* Admin Side Navigation */}
      <AdminNavigation admin={admin} />

      {/* Main Content */}
      <main className="lg:pl-64">
        <div className="mx-auto max-w-[1080px] py-6">{children}</div>
      </main>
    </div>
  );
}
