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
}

export function GroupCardCompact({
  group,
  onEdit,
  onDelete,
  onManage,
}: GroupCardCompactProps) {
  const handleManageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onManage?.(group);
  };

  return (
    <Card
      className="group cursor-pointer p-3 transition-all hover:shadow-md"
      onClick={handleManageClick}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Avatar + Title + Description */}
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <GroupAvatar group={group} size="sm" className="shrink-0" />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold">
              {group.name}
            </h3>

            {/* Metadata row */}
            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
              {/* Members */}
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {group._count.members}
              </span>

              {/* Lists */}
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
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
              className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-3.5 w-3.5" />
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
