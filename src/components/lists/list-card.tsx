'use client';

import { Edit, ExternalLink, MoreVertical, Share, Trash, Users, UserPlus } from 'lucide-react';

import { useState } from 'react';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ListWithDetails } from '@/lib/services/list-service';
import { getVisibilityIcon, getVisibilityColor } from '@/lib/utils/visibility-badges';

interface ListCardProps {
  list: ListWithDetails;
  onEdit?: (list: ListWithDetails) => void;
  onDelete?: (list: ListWithDetails) => void;
  onShare?: (list: ListWithDetails) => void;
}

export function ListCard({ list, onEdit, onDelete, onShare }: ListCardProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [copySuccess, setCopySuccess] = useState(false);

  const currentUserId = session?.user?.id;
  const isOwner = currentUserId === list.ownerId;
  const isSharedWithUser =
    !isOwner && list.admins?.some((admin) => admin.user.id === currentUserId);
  const adminCount = list._count?.admins || 0;

  const getSharingBadge = () => {
    if (isSharedWithUser) {
      return (
        <Badge
          variant="secondary"
          className="flex items-center gap-1 border border-info/30 bg-info/10 text-info dark:border-info/40 dark:bg-info/5"
        >
          <UserPlus className="h-3 w-3" />
          Shared with you
        </Badge>
      );
    }

    if (isOwner && adminCount > 0) {
      return (
        <Badge
          variant="secondary"
          className="flex items-center gap-1 border border-success/30 bg-success/10 text-success dark:border-success/40 dark:bg-success/5"
        >
          <Users className="h-3 w-3" />
          Shared with {adminCount} {adminCount === 1 ? 'person' : 'people'}
        </Badge>
      );
    }

    return null;
  };

  const handleCardClick = () => {
    router.push(`/lists/${list.id}`);
  };

  const handleCopyShareLink = async () => {
    if (!list.shareToken) {
      return;
    }

    const shareUrl = `${window.location.origin}/share/${list.shareToken}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div
            className="flex-1 cursor-pointer space-y-1"
            onClick={handleCardClick}
            onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
            role="button"
            tabIndex={0}
          >
            <h3 className="text-lg font-semibold leading-none tracking-tight">{list.name}</h3>
            {list.description && (
              <p className="line-clamp-2 text-sm text-muted-foreground">{list.description}</p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-[44px] min-w-[44px] p-0"
                aria-label="More options"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(list)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {list.shareToken && (
                <DropdownMenuItem onClick={() => void handleCopyShareLink()}>
                  <Share className="mr-2 h-4 w-4" />
                  {copySuccess ? 'Copied!' : 'Copy Share Link'}
                </DropdownMenuItem>
              )}
              {onShare && (
                <DropdownMenuItem onClick={() => onShare(list)}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Share Settings
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem onClick={() => onDelete(list)} className="text-destructive">
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent
        className="cursor-pointer pt-0"
        onClick={handleCardClick}
        onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
        role="button"
        tabIndex={0}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="secondary"
              className={`${getVisibilityColor(list.visibility)} flex items-center gap-1`}
              key={`list-${list.id}-visibility-${list.visibility}`}
            >
              {getVisibilityIcon(list.visibility)}
              {list.visibility.charAt(0).toUpperCase() + list.visibility.slice(1)}
            </Badge>

            {getSharingBadge()}

            <div className="text-sm text-muted-foreground">
              {list._count.wishes} {list._count.wishes === 1 ? 'wish' : 'wishes'}
            </div>
          </div>

          {list.shareToken && (
            <Badge variant="outline" className="text-xs">
              Shareable
            </Badge>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-3 text-xs text-muted-foreground">
        <div className="flex w-full flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
          <span>Created {new Date(list.createdAt).toLocaleDateString()}</span>
          <span>by {list.owner.name}</span>
        </div>
      </CardFooter>
    </Card>
  );
}
