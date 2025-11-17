import { redirect } from 'next/navigation';

import { MainNavWrapper } from '@/components/navigation/main-nav-wrapper';
import { getCurrentUser } from '@/lib/auth-utils';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await getCurrentUser();

  if (!sessionUser) {
    redirect('/auth/login');
  }

  // The sessionUser already has the correct type from our session callback
  const user = {
    id: sessionUser.id,
    name: sessionUser.name || null,
    email: sessionUser.email || '',
    avatarUrl: sessionUser.avatarUrl || null, // Use avatarUrl from getCurrentUser, not image
    isAdmin: sessionUser.isAdmin || false,
  };

  return (
    <div className="min-h-screen bg-background">
      <MainNavWrapper fallbackUser={user} />
      <main className="mx-auto max-w-[1080px]">{children}</main>
    </div>
  );
}
