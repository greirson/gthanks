'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { getAvatarFallback } from '@/lib/utils/avatar-fallback';

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

export function StackedAvatars({
  members,
  max = 4,
  size = 'sm',
  className,
  onShowAll,
}: StackedAvatarsProps) {
  const displayMembers = members.slice(0, max);
  const remainingCount = members.length - max;

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
  };

  const getZIndexClass = (index: number) => {
    const zIndexMap = ['z-10', 'z-20', 'z-30', 'z-40'];
    return zIndexMap[index] || 'z-0';
  };

  return (
    <div className={cn('flex -space-x-2', className)}>
      {displayMembers.map((member, index) => (
        <Avatar
          key={member.id}
          className={cn(
            sizeClasses[size],
            'ring-2 ring-background',
            'relative',
            getZIndexClass(index)
          )}
        >
          <AvatarImage src={member.avatarUrl || undefined} alt={member.name || 'Member'} />
          <AvatarFallback>{getAvatarFallback(member.name, { type: 'user' })}</AvatarFallback>
        </Avatar>
      ))}
      {remainingCount > 0 && (
        <button
          onClick={onShowAll}
          className={cn(
            sizeClasses[size],
            'relative z-50',
            'flex items-center justify-center',
            'rounded-full bg-muted',
            'ring-2 ring-background',
            'text-xs font-medium',
            'transition-colors hover:bg-muted/80'
          )}
        >
          +{remainingCount}
        </button>
      )}
    </div>
  );
}
