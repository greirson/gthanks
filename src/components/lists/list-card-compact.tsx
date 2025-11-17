'use client';

import {
  MoreVertical,
  FileText,
  Calendar,
  Share2,
  User,
  Users,
  UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ListWithOwner } from '@/lib/validators/api-responses/lists';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { getVisibilityIcon } from '@/lib/utils/visibility-badges';

interface ListCardCompactProps {
  list: ListWithOwner;
  onEdit?: (list: ListWithOwner) => void;
  onShare?: (list: ListWithOwner) => void;
  onDelete?: (list: ListWithOwner) => void;
  viewMode?: 'compact' | 'comfortable';
  currentUserId?: string;
}

export function ListCardCompact({
  list,
  onEdit,
  onShare,
  onDelete,
  viewMode = 'compact',
  currentUserId,
}: ListCardCompactProps) {
  const router = useRouter();
  const isCompact = viewMode === 'compact';
  const isOwner = currentUserId ? list.ownerId === currentUserId : false;
  const isSharedWithUser =
    !isOwner && list.admins?.some((admin) => admin.user.id === currentUserId);
  const adminCount = list._count?.admins || 0;

  const formatRelativeTime = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  const handleClick = () => {
    router.push(`/lists/${list.id}`);
  };

  const getSharingBadge = () => {
    if (isSharedWithUser) {
      return (
        <Badge
          variant="secondary"
          className={cn(
            'flex shrink-0 items-center gap-1 border border-info/30 bg-info/10 text-info dark:border-info/40 dark:bg-info/5',
            isCompact ? 'h-5 px-1.5 text-[10px]' : 'text-xs'
          )}
        >
          <UserPlus className={isCompact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
          Shared with you
        </Badge>
      );
    }

    if (isOwner && adminCount > 0) {
      return (
        <Badge
          variant="secondary"
          className={cn(
            'flex shrink-0 items-center gap-1 border border-success/30 bg-success/10 text-success dark:border-success/40 dark:bg-success/5',
            isCompact ? 'h-5 px-1.5 text-[10px]' : 'text-xs'
          )}
        >
          <Users className={isCompact ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
          {adminCount} {adminCount === 1 ? 'person' : 'people'}
        </Badge>
      );
    }

    return null;
  };

  return (
    <Card
      className={cn(
        'group cursor-pointer transition-all hover:shadow-md',
        isCompact ? 'p-3' : 'p-4'
      )}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Title + Description */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3
              className={cn('flex-1 truncate font-semibold', isCompact ? 'text-sm' : 'text-base')}
            >
              {list.name}
            </h3>
            {getSharingBadge()}
          </div>

          {list.description && !isCompact && (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{list.description}</p>
          )}

          {/* Metadata row - inline for compact mode */}
          <div
            className={cn(
              'flex items-center gap-3 text-muted-foreground',
              isCompact ? 'mt-1.5 text-xs' : 'mt-2 text-sm'
            )}
          >
            {/* Visibility Badge */}
            <Badge
              variant={list.visibility === 'private' ? 'secondary' : 'outline'}
              className={cn('gap-1', isCompact && 'h-5 px-1.5 text-[10px]')}
            >
              {getVisibilityIcon(list.visibility, 'h-2.5 w-2.5')}
              {list.visibility}
            </Badge>

            {/* Items count */}
            <span className="flex items-center gap-1">
              <FileText className={isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
              {list._count?.wishes || 0}
            </span>

            {/* Share status */}
            {list.shareToken && (
              <span className="flex items-center gap-1">
                <Share2 className={isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
                <span className="hidden sm:inline">Shared</span>
              </span>
            )}

            {/* Owner - only show if not owner */}
            {!isOwner && list.owner && (
              <span className="flex max-w-[120px] items-center gap-1 truncate">
                <User className={isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
                <span className="truncate">
                  {list.owner.name || list.owner.email?.split('@')[0]}
                </span>
              </span>
            )}

            {/* Updated time - only show on hover or comfortable mode */}
            <span
              className={cn(
                'ml-auto flex items-center gap-1',
                isCompact && 'hidden group-hover:flex'
              )}
            >
              <Calendar className="h-3 w-3" />
              {formatRelativeTime(list.updatedAt)}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'shrink-0 opacity-0 transition-opacity group-hover:opacity-100',
                isCompact ? 'h-7 w-7' : 'h-8 w-8'
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className={isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
              <span className="sr-only">List options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/lists/${list.id}`);
              }}
            >
              View List
            </DropdownMenuItem>
            {isOwner && (
              <>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(list);
                  }}
                >
                  Edit Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onShare?.(list);
                  }}
                >
                  Share Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(list);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  Delete List
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
