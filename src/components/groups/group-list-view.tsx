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
      {/* Header Row */}
      <div className="hidden gap-4 bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-10">
        <div className="col-span-6">Group</div>
        <div className="col-span-2">Members</div>
        <div className="col-span-1">Lists</div>
        <div className="col-span-1 text-right">Actions</div>
      </div>

      {/* Group Rows */}
      {groups.map((group) => (
        <div
          key={group.id}
          className="group flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors hover:bg-muted/50 sm:grid sm:grid-cols-10 sm:gap-4 sm:px-4"
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
          {/* Group Name and Avatar - Mobile: Full width, Desktop: 6 cols */}
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:col-span-6">
            <GroupAvatar group={group} size="xs" className="shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-sm font-medium">{group.name}</h3>
              {group.description && (
                <p className="hidden truncate text-xs text-muted-foreground sm:block">
                  {group.description}
                </p>
              )}
            </div>
          </div>

          {/* Mobile: Metadata in row */}
          <div className="flex items-center gap-2 sm:hidden">
            <span className="text-xs text-muted-foreground">
              {group._count.members}
              <Users className="ml-0.5 inline h-2.5 w-2.5" />
            </span>
            <span className="text-xs text-muted-foreground">
              {group._count.lists}
              <FileText className="ml-0.5 inline h-2.5 w-2.5" />
            </span>
          </div>

          {/* Desktop: Members - 2 cols */}
          <div className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:col-span-2 sm:flex">
            <Users className="h-3.5 w-3.5" />
            <span>{group._count.members}</span>
          </div>

          {/* Desktop: Lists - 1 col */}
          <div className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:col-span-1 sm:flex">
            <FileText className="h-3.5 w-3.5" />
            <span>{group._count.lists}</span>
          </div>

          {/* Actions - 1 col */}
          <div className="sm:col-span-1 sm:flex sm:justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3.5 w-3.5" />
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
