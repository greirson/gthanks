'use client';

import { MoreVertical, FileText, Share2, User, Users2, UserCog } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ListAvatarRow } from '@/components/lists/list-avatar-row';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ListWithOwner } from '@/lib/validators/api-responses/lists';
import { useRouter } from 'next/navigation';
import { getVisibilityIcon } from '@/lib/utils/visibility-badges';

interface ListCardCompactProps {
  list: ListWithOwner;
  onEdit?: (list: ListWithOwner) => void;
  onShare?: (list: ListWithOwner) => void;
  onDelete?: (list: ListWithOwner) => void;
  currentUserId?: string;
}

export function ListCardCompact({
  list,
  onEdit,
  onShare,
  onDelete,
  currentUserId,
}: ListCardCompactProps) {
  const router = useRouter();
  const isOwner = currentUserId ? list.ownerId === currentUserId : false;

  const handleClick = () => {
    router.push(`/lists/${list.id}`);
  };

  return (
    <Card className="group cursor-pointer p-3 transition-all hover:shadow-md" onClick={handleClick}>
      <div className="flex items-start justify-between gap-3">
        {/* Left: Title + Description */}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{list.name}</h3>

          {/* Metadata row - compact inline layout */}
          <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
            {/* Visibility Badge */}
            <Badge
              variant={list.visibility === 'private' ? 'secondary' : 'outline'}
              className="h-5 gap-1 px-1.5 text-[10px]"
            >
              {getVisibilityIcon(list.visibility, 'h-2.5 w-2.5')}
              {list.visibility}
            </Badge>

            {/* Items count */}
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {list._count?.listWishes || 0}
            </span>

            {/* Share status */}
            {list.shareToken && (
              <span className="flex items-center gap-1">
                <Share2 className="h-3 w-3" />
                <span className="hidden sm:inline">Shared</span>
              </span>
            )}

            {/* Owner - only show if not owner */}
            {!isOwner && list.user && (
              <span className="flex max-w-[120px] items-center gap-1 truncate">
                <User className="h-3 w-3" />
                <span className="truncate">{list.user.name || list.user.email?.split('@')[0]}</span>
              </span>
            )}
          </div>

          {/* Avatar rows for groups and co-admins */}
          {((list.listGroups && list.listGroups.length > 0) ||
            (list.listAdmins && list.listAdmins.length > 0)) && (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {list.listGroups && list.listGroups.length > 0 && (
                <ListAvatarRow icon={Users2} members={list.listGroups.map((lg) => lg.group)} />
              )}
              {list.listAdmins && list.listAdmins.length > 0 && (
                <ListAvatarRow icon={UserCog} members={list.listAdmins.map((la) => la.user)} />
              )}
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-3.5 w-3.5" />
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
