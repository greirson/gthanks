'use client';

import { MoreVertical, FileText, Share2, User, Calendar } from 'lucide-react';
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

interface ListListViewProps {
  lists: ListWithOwner[];
  onEdit?: (list: ListWithOwner) => void;
  onShare?: (list: ListWithOwner) => void;
  onDelete?: (list: ListWithOwner) => void;
  currentUserId?: string;
}

export function ListListView({
  lists,
  onEdit,
  onShare,
  onDelete,
  currentUserId,
}: ListListViewProps) {
  const router = useRouter();

  const formatRelativeTime = (date: string) => {
    try {
      const distance = formatDistanceToNow(new Date(date), { addSuffix: false });
      // Shorten the output
      return distance
        .replace(' minutes', 'm')
        .replace(' minute', 'm')
        .replace(' hours', 'h')
        .replace(' hour', 'h')
        .replace(' days', 'd')
        .replace(' day', 'd')
        .replace(' months', 'mo')
        .replace(' month', 'mo')
        .replace(' years', 'y')
        .replace(' year', 'y');
    } catch {
      return 'recently';
    }
  };

  if (lists.length === 0) {
    return (
      <div className="py-12 text-center">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">No lists found</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Create your first list to start organizing your wishes
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y rounded-lg border bg-card">
      {/* Header Row - Desktop only */}
      <div className="hidden gap-4 bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-12">
        <div className="col-span-4">List</div>
        <div className="col-span-2">Visibility</div>
        <div className="col-span-1">Items</div>
        <div className="col-span-2">Owner</div>
        <div className="col-span-2">Updated</div>
        <div className="col-span-1 text-right">Actions</div>
      </div>

      {/* List Rows */}
      {lists.map((list) => {
        const isOwner = currentUserId ? list.ownerId === currentUserId : false;

        return (
          <div
            key={list.id}
            className="group flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors hover:bg-muted/50 sm:grid sm:grid-cols-12 sm:gap-4 sm:px-4"
            onClick={() => router.push(`/lists/${list.id}`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                router.push(`/lists/${list.id}`);
              }
            }}
            role="button"
            tabIndex={0}
          >
            {/* List Name - Mobile: Full width, Desktop: 4 cols */}
            <div className="min-w-0 flex-1 sm:col-span-4">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-sm font-medium">{list.name}</h3>
                {!isOwner && (
                  <Badge variant="secondary" className="h-5 shrink-0 text-[10px] sm:hidden">
                    Shared
                  </Badge>
                )}
              </div>
              {list.description && (
                <p className="hidden truncate text-xs text-muted-foreground sm:block">
                  {list.description}
                </p>
              )}
            </div>

            {/* Mobile: Metadata in row */}
            <div className="flex items-center gap-2 sm:hidden">
              <Badge
                variant={list.visibility === 'private' ? 'secondary' : 'outline'}
                className="h-5 px-1.5 text-[10px]"
              >
                {getVisibilityIcon(list.visibility, 'h-3 w-3')}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {list._count?.wishes || 0}
                <FileText className="ml-0.5 inline h-2.5 w-2.5" />
              </span>
              {list.shareToken && <Share2 className="h-3 w-3 text-muted-foreground" />}
            </div>

            {/* Desktop: Visibility - 2 cols */}
            <div className="hidden items-center sm:col-span-2 sm:flex">
              <Badge
                variant={list.visibility === 'private' ? 'secondary' : 'outline'}
                className="h-6 gap-1 text-xs"
              >
                {getVisibilityIcon(list.visibility, 'h-3 w-3')}
                {list.visibility}
              </Badge>
            </div>

            {/* Desktop: Items - 1 col */}
            <div className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:col-span-1 sm:flex">
              <FileText className="h-3.5 w-3.5" />
              <span>{list._count?.wishes || 0}</span>
            </div>

            {/* Desktop: Owner - 2 cols */}
            <div className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:col-span-2 sm:flex">
              {isOwner ? (
                <span className="text-xs">You</span>
              ) : (
                <>
                  <User className="h-3.5 w-3.5" />
                  <span className="truncate">
                    {list.owner?.name || list.owner?.email?.split('@')[0] || 'Unknown'}
                  </span>
                </>
              )}
              {list.shareToken && (
                <Badge variant="outline" className="ml-1 h-5 text-[10px]">
                  <Share2 className="mr-0.5 h-2.5 w-2.5" />
                  Shared
                </Badge>
              )}
            </div>

            {/* Desktop: Updated - 2 cols */}
            <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:col-span-2 sm:flex">
              <Calendar className="h-3 w-3" />
              <span>{formatRelativeTime(list.updatedAt)} ago</span>
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
          </div>
        );
      })}
    </div>
  );
}
