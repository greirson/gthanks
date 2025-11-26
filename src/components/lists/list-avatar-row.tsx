'use client';

import { LucideIcon } from 'lucide-react';

import { StackedAvatars } from '@/components/ui/stacked-avatars-accessible';
import { cn } from '@/lib/utils';

interface AvatarMember {
  id: string;
  name: string | null;
  avatarUrl: string | null;
}

interface ListAvatarRowProps {
  icon: LucideIcon;
  members: AvatarMember[];
  size?: 'xs' | 'sm';
  max?: number;
  className?: string;
}

export function ListAvatarRow({
  icon: Icon,
  members,
  size = 'xs',
  max = 3,
  className,
}: ListAvatarRowProps) {
  if (!members || members.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />
      <StackedAvatars members={members} size={size} max={max} />
    </div>
  );
}
