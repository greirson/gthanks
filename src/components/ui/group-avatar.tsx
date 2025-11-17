'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AVATAR_SIZES, type AvatarSize } from '@/lib/constants/avatar';
import { cn } from '@/lib/utils';
import { getAvatarFallback } from '@/lib/utils/avatar-fallback';

interface GroupAvatarProps {
  group: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  size?: AvatarSize;
  className?: string;
}

export function GroupAvatar({ group, size = 'lg', className }: GroupAvatarProps) {
  const fallbackText = getAvatarFallback(group.name, { type: 'group' });
  const avatarSrc = resolveGroupAvatarUrl(group);

  return (
    <Avatar className={cn(AVATAR_SIZES[size], className)}>
      <AvatarImage src={avatarSrc} alt={`${group.name} avatar`} />
      <AvatarFallback>{fallbackText}</AvatarFallback>
    </Avatar>
  );
}

function resolveGroupAvatarUrl(group: {
  id: string;
  avatarUrl: string | null;
}): string | undefined {
  if (!group.avatarUrl) {
    return undefined;
  }

  // Handle avatar data stored in database
  if (group.avatarUrl.startsWith('avatar:')) {
    // Add timestamp to force cache refresh
    return `/api/groups/${group.id}/avatar?t=${Date.now()}`;
  }

  // For API endpoints, add timestamp to force refresh
  if (group.avatarUrl.startsWith('/api/')) {
    return `${group.avatarUrl}${group.avatarUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
  }

  return group.avatarUrl;
}
