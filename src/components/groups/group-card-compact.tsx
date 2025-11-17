'use client';

import { MoreVertical, Users, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GroupAvatar } from '@/components/ui/group-avatar';
import { GroupWithCountsResponse } from '@/lib/types/api-responses';

interface GroupCardCompactProps {
  group: GroupWithCountsResponse;
  onEdit?: (group: GroupWithCountsResponse) => void;
  onDelete?: (group: GroupWithCountsResponse) => void;
  onManage?: (group: GroupWithCountsResponse) => void;
  viewMode?: 'compact' | 'comfortable';
}

export function GroupCardCompact({
  group,
  onEdit,
  onDelete,
  onManage,
  viewMode = 'compact',
}: GroupCardCompactProps) {
  const isCompact = viewMode === 'compact';

  const handleManageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onManage?.(group);
  };

  return (
    <Card
      className={cn(
        'group cursor-pointer transition-all hover:shadow-md',
        isCompact ? 'p-3' : 'p-4'
      )}
      onClick={handleManageClick}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Avatar + Title + Description */}
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <GroupAvatar group={group} size={isCompact ? 'sm' : 'md'} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <h3 className={cn('truncate font-semibold', isCompact ? 'text-sm' : 'text-base')}>
              {group.name}
            </h3>
            {group.description && !isCompact && (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{group.description}</p>
            )}

            {/* Metadata row - inline for compact mode */}
            <div
              className={cn(
                'flex items-center gap-3 text-muted-foreground',
                isCompact ? 'mt-1 text-xs' : 'mt-2 text-sm'
              )}
            >
              {/* Members */}
              <span className="flex items-center gap-1">
                <Users className={isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
                {group._count.members}
              </span>

              {/* Lists */}
              <span className="flex items-center gap-1">
                <FileText className={isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
                {group._count.lists}
              </span>
            </div>
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
              <span className="sr-only">Group options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onManage?.(group)}>Manage Group</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit?.(group)}>Edit Details</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete?.(group)}
              className="text-destructive focus:text-destructive"
            >
              Delete Group
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
