'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AVATAR_SIZES, type AvatarSize } from '@/lib/constants/avatar';
import { cn } from '@/lib/utils';
import { getAvatarFallback } from '@/lib/utils/avatar-fallback';

interface UserAvatarProps {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    avatarUrl: string | null;
  } | null;
  size?: AvatarSize;
  className?: string;
  showHoverCard?: boolean;
}

export function UserAvatar({ user, size = 'lg', className }: UserAvatarProps) {
  const sizeClass = AVATAR_SIZES[size];

  const resolveAvatarUrl = (url: string | null): string | undefined => {
    if (!url) {
      return undefined;
    }

    // Check if it's an internal avatar reference
    if (url.startsWith('avatar:')) {
      return '/api/user/avatar';
    }

    return url;
  };

  const avatarUrl = resolveAvatarUrl(user?.avatarUrl ?? null);
  const fallbackText = getAvatarFallback(user?.name || user?.email, { type: 'user' });

  return (
    <Avatar className={cn(sizeClass, className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={user?.name || user?.email || 'User'} />}
      <AvatarFallback>{fallbackText}</AvatarFallback>
    </Avatar>
  );
}
