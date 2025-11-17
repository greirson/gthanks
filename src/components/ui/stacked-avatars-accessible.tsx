'use client';

import React from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Member {
  id: string;
  name: string | null;
  avatarUrl: string | null;
}

interface StackedAvatarsProps {
  members: Member[];
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onShowAll?: () => void;
}

export const StackedAvatars = React.memo(function StackedAvatars({
  members,
  max = 4,
  size = 'sm',
  className,
  onShowAll,
}: StackedAvatarsProps) {
  const displayMembers = React.useMemo(() => members.slice(0, max), [members, max]);
  const remainingCount = React.useMemo(
    () => Math.max(0, members.length - max),
    [members.length, max]
  );

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
  };

  const getZIndexClass = (index: number) => {
    const zIndexMap = ['z-10', 'z-20', 'z-30', 'z-40'];
    return zIndexMap[index] || 'z-0';
  };

  // Create accessible label for the avatar group
  const groupLabel = React.useMemo(() => {
    const displayedNames = displayMembers.map((m) => m.name || 'Unknown member').join(', ');
    if (remainingCount > 0) {
      return `Group members: ${displayedNames} and ${remainingCount} more`;
    }
    return `Group members: ${displayedNames}`;
  }, [displayMembers, remainingCount]);

  const handleShowAllClick = React.useCallback(() => {
    onShowAll?.();
  }, [onShowAll]);

  return (
    <div className={cn('flex -space-x-2', className)} role="group" aria-label={groupLabel}>
      {displayMembers.map((member, index) => (
        <Avatar
          key={member.id}
          className={cn(
            sizeClasses[size],
            'ring-2 ring-background',
            'relative',
            getZIndexClass(index),
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          )}
        >
          <AvatarImage
            src={member.avatarUrl || undefined}
            alt={member.name || 'Unknown member'}
            loading="lazy"
          />
          <AvatarFallback aria-label={`${member.name || 'Unknown member'}'s avatar`}>
            {member.name?.charAt(0)?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>
      ))}
      {remainingCount > 0 && (
        <button
          onClick={handleShowAllClick}
          className={cn(
            sizeClasses[size],
            'relative z-50',
            'flex items-center justify-center',
            'rounded-full bg-muted',
            'ring-2 ring-background',
            'text-xs font-medium',
            'transition-colors hover:bg-muted/80',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          )}
          aria-label={`Show ${remainingCount} more members`}
          type="button"
        >
          +{remainingCount}
        </button>
      )}
    </div>
  );
});

// For backward compatibility, also export as non-default
export { StackedAvatars as StackedAvatarsAccessible };
