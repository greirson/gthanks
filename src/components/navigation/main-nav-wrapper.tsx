'use client';

import { useSession } from 'next-auth/react';

import { MainNav } from './main-nav';

interface User {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  isAdmin?: boolean;
}

interface MainNavWrapperProps {
  fallbackUser: User;
}

export function MainNavWrapper({ fallbackUser }: MainNavWrapperProps) {
  const { data: session } = useSession();

  // Use session data if available, otherwise fallback to server-side user data
  // Note: Session doesn't include avatarUrl, so we use fallbackUser.avatarUrl which has the resolved URL
  const user: User = session?.user
    ? {
        id: session.user.id,
        name: session.user.name || null,
        email: session.user.email || '',
        avatarUrl: fallbackUser.avatarUrl, // Use resolved avatarUrl from server-side data
        isAdmin: session.user.isAdmin || false,
      }
    : fallbackUser;

  return <MainNav user={user} />;
}
