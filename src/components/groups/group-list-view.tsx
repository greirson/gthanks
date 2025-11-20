'use client';

import { MoreVertical, Users, FileText } from 'lucide-react';
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

interface GroupListViewProps {
  groups: GroupWithCountsResponse[];
  onEdit?: (group: GroupWithCountsResponse) => void;
  onDelete?: (group: GroupWithCountsResponse) => void;
  onManage?: (group: GroupWithCountsResponse) => void;
}

export function GroupListView({ groups, onEdit, onDelete, onManage }: GroupListViewProps) {
  if (groups.length === 0) {
    return (
      <div className="py-12 text-center">
        <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">No groups found</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Create your first group to start sharing wishlists
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y rounded-lg border bg-card">
      {/* Group Rows - Vertical card layout for all screen sizes */}
      {groups.map((group) => (
        <div
          key={group.id}
          className="group flex cursor-pointer items-start gap-3 px-3 py-3 transition-colors hover:bg-muted/50 md:px-4 md:py-4"
          onClick={() => onManage?.(group)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onManage?.(group);
            }
          }}
          role="button"
          tabIndex={0}
        >
          {/* Avatar */}
          <GroupAvatar group={group} size="sm" className="mt-0.5 shrink-0" />

          {/* Content */}
          <div className="min-w-0 flex-1">
            {/* Group Name */}
            <h3 className="truncate text-base font-medium md:text-lg">{group.name}</h3>

            {/* Description (if present) */}
            {group.description && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground md:text-base">
                {group.description}
              </p>
            )}

            {/* Metadata */}
            <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground md:text-sm">
              <div className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span>
                  {group._count.members} {group._count.members === 1 ? 'member' : 'members'}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span>
                  {group._count.lists} {group._count.lists === 1 ? 'list' : 'lists'}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100 md:h-9 md:w-9"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Group options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onManage?.(group);
                  }}
                >
                  Manage Group
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(group);
                  }}
                >
                  Edit Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(group);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  Delete Group
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
    </div>
  );
}
