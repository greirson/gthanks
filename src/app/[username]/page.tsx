import { Lock, User } from 'lucide-react';
import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SimpleThemeToggle } from '@/components/theme/simple-theme-toggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { resolveAvatarUrlSync } from '@/lib/avatar-utils';
import { db } from '@/lib/db';

interface UserProfilePageProps {
  params: Promise<{ username: string }>;
}

// Reserved routes that cannot be used as usernames
const RESERVED_ROUTES = [
  'admin',
  'api',
  'auth',
  'reservations',
  'share',
  'lists',
  'wishes',
  'groups',
  'settings',
  'profile',
];

export async function generateMetadata({ params }: UserProfilePageProps): Promise<Metadata> {
  const { username } = await params;

  // Check for reserved routes
  if (RESERVED_ROUTES.includes(username.toLowerCase())) {
    return {
      title: 'Page Not Found',
    };
  }

  // Fetch user
  const user = await db.user.findUnique({
    where: {
      username: username.toLowerCase(),
    },
    select: {
      name: true,
      showPublicProfile: true,
    },
  });

  if (!user || !user.showPublicProfile) {
    return {
      title: 'Profile Not Found',
    };
  }

  return {
    title: `${user.name || username}'s Wishlists | GThanks`,
    description: `View ${user.name || username}'s public wishlists`,
  };
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const { username } = await params;

  // Check for reserved routes
  if (RESERVED_ROUTES.includes(username.toLowerCase())) {
    notFound();
  }

  // Fetch user
  const user = await db.user.findUnique({
    where: {
      username: username.toLowerCase(),
    },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      showPublicProfile: true,
    },
  });

  // Check if user exists and has public profile enabled
  if (!user || !user.showPublicProfile) {
    notFound();
  }

  // Fetch public lists for this user
  const lists = await db.list.findMany({
    where: {
      ownerId: user.id,
      hideFromProfile: false,
      OR: [{ visibility: 'public' }, { visibility: 'password' }],
    },
    include: {
      _count: {
        select: {
          wishes: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const avatarUrl = resolveAvatarUrlSync(user);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Theme Toggle Button */}
      <div className="fixed right-4 top-4 z-10">
        <SimpleThemeToggle variant="outline" />
      </div>

      {/* User Profile Header */}
      <div className="mb-8 text-center">
        <Avatar className="mx-auto mb-4 h-24 w-24">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={user.name || username} />}
          <AvatarFallback>
            <User className="h-12 w-12" />
          </AvatarFallback>
        </Avatar>
        <h1 className="mb-2 text-3xl font-bold">{user.name || username}</h1>
        <p className="text-muted-foreground">@{username}</p>
      </div>

      {/* Lists Section */}
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-4 text-xl font-semibold">Public Wishlists</h2>

        {lists.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No public wishlists yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lists.map((list) => (
              <Link
                key={list.id}
                href={`/${username}/${list.slug}`}
                className="block transition-transform hover:scale-105"
              >
                <Card className="h-full overflow-hidden transition-shadow hover:shadow-lg">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-2 text-lg font-semibold leading-tight">
                        {list.name}
                      </h3>
                      {list.visibility === 'password' && (
                        <Lock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                      )}
                    </div>
                    {list.description && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {list.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <Badge variant="secondary">
                      {list._count.wishes} {list._count.wishes === 1 ? 'wish' : 'wishes'}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
