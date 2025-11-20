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
      {/* List Rows - Vertical card layout for all screen sizes */}
      {lists.map((list) => {
        const isOwner = currentUserId ? list.ownerId === currentUserId : false;

        return (
          <div
            key={list.id}
            className="group cursor-pointer px-3 py-3 transition-colors hover:bg-muted/50 sm:px-4 sm:py-4"
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
            <div className="flex items-start justify-between gap-3">
              {/* Left: Title, description, and metadata */}
              <div className="min-w-0 flex-1 space-y-2">
                {/* Title */}
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-medium sm:text-base">{list.name}</h3>
                  {!isOwner && (
                    <Badge variant="secondary" className="h-5 shrink-0 text-[10px]">
                      Shared
                    </Badge>
                  )}
                </div>

                {/* Description */}
                {list.description && (
                  <p className="truncate text-xs text-muted-foreground sm:text-sm">
                    {list.description}
                  </p>
                )}

                {/* Metadata row - same for mobile and desktop */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:gap-3">
                  {/* Visibility Badge */}
                  <Badge
                    variant={list.visibility === 'private' ? 'secondary' : 'outline'}
                    className="h-5 gap-1 px-1.5 text-[10px] sm:h-6 sm:text-xs"
                  >
                    {getVisibilityIcon(list.visibility, 'h-2.5 w-2.5 sm:h-3 sm:w-3')}
                    {list.visibility}
                  </Badge>

                  {/* Items count */}
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    <span>{list._count?.wishes || 0}</span>
                  </span>

                  {/* Owner - only show if not owner */}
                  {!isOwner && list.owner && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      <span className="truncate">
                        {list.owner.name || list.owner.email?.split('@')[0] || 'Unknown'}
                      </span>
                    </span>
                  )}

                  {/* Share status */}
                  {list.shareToken && (
                    <span className="flex items-center gap-1">
                      <Share2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      <span className="hidden sm:inline">Shared</span>
                    </span>
                  )}

                  {/* Updated time */}
                  <span className="ml-auto flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{formatRelativeTime(list.updatedAt)} ago</span>
                  </span>
                </div>
              </div>

              {/* Right: Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 sm:h-8 sm:w-8"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
