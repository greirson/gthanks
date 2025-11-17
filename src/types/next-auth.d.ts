import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role?: string;
      isAdmin?: boolean;
      isOnboardingComplete?: boolean;
      themePreference?: string;
      username?: string | null;
      canUseVanityUrls?: boolean;
      showPublicProfile?: boolean;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    role?: string;
    isAdmin?: boolean;
    isOnboardingComplete?: boolean;
    themePreference?: string;
    username?: string | null;
    canUseVanityUrls?: boolean;
    showPublicProfile?: boolean;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    name?: string | null;
    role?: string;
    isAdmin?: boolean;
    isOnboardingComplete?: boolean;
    themePreference?: string;
    username?: string | null;
    canUseVanityUrls?: boolean;
    showPublicProfile?: boolean;
  }
}
