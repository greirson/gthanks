'use client';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

import { MainNavWrapper } from '@/components/navigation/main-nav-wrapper';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  // Show nothing while loading
  if (status === 'loading' || !session?.user) {
    return null;
  }

  // The session user data
  const user = {
    id: session.user.id,
    name: session.user.name || null,
    email: session.user.email || '',
    avatarUrl: session.user.avatarUrl || null,
    isAdmin: session.user.isAdmin || false,
  };

  return (
    <div className="min-h-screen bg-background">
      <MainNavWrapper fallbackUser={user} />
      <main className="mx-auto max-w-[1080px]">{children}</main>
    </div>
  );
}
