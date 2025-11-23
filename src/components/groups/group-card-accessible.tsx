'use client';

import { Edit, MoreVertical, Settings, Trash, Users } from 'lucide-react';

import React from 'react';

import { useRouter } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { GroupAvatar } from '@/components/ui/group-avatar';
import { StackedAvatarsAccessible } from '@/components/ui/stacked-avatars-accessible';
import { GroupMemberDetailsResponse, GroupWithCountsResponse } from '@/lib/types/api-responses';
import { getRoleColor } from '@/lib/utils/visibility-badges';

const RESPONSIVE_CARD_PADDING = 'p-3 sm:p-4 lg:p-6';
const TOUCH_TARGET_CLASSES = 'min-h-[44px] min-w-[44px] p-2';

interface GroupCardProps {
  group: GroupWithCountsResponse & { members?: GroupMemberDetailsResponse[] };
  currentUserRole?: 'admin' | 'member' | null;
  onEdit?: (group: GroupWithCountsResponse) => void;
  onDelete?: (group: GroupWithCountsResponse) => void;
  onManage?: (group: GroupWithCountsResponse) => void;
}

export const GroupCard = React.memo(function GroupCard({
  group,
  currentUserRole,
  onEdit,
  onDelete,
  onManage,
}: GroupCardProps) {
  const router = useRouter();

  const handleCardClick = React.useCallback(() => {
    router.push(`/groups/${group.id}`);
  }, [router, group.id]);

  const isAdmin = currentUserRole === 'admin';

  // Create a unique ID for this card for ARIA relationships
  const cardId = React.useId();
  const headingId = `${cardId}-heading`;
  const descriptionId = `${cardId}-description`;

  return (
    <Card
      className={`${RESPONSIVE_CARD_PADDING} overflow-hidden transition-shadow hover:shadow-lg`}
      role="article"
      aria-labelledby={headingId}
      aria-describedby={group.description ? descriptionId : undefined}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div
            className={`flex-1 cursor-pointer space-y-1 ${TOUCH_TARGET_CLASSES} rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
            role="button"
            tabIndex={0}
            onClick={handleCardClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCardClick();
              }
            }}
            aria-label={`View ${group.name} group details`}
          >
            <div className="flex items-center gap-2">
              <h3 id={headingId} className="text-lg font-semibold leading-none tracking-tight">
                {group.name}
              </h3>
              {group.avatarUrl && (
                <GroupAvatar
                  group={{
                    id: group.id,
                    name: group.name,
                    avatarUrl: group.avatarUrl,
                  }}
                  size="sm"
                  aria-label={`${group.name} avatar`}
                />
              )}
            </div>
            {group.description && (
              <p id={descriptionId} className="line-clamp-2 text-sm text-muted-foreground">
                {group.description}
              </p>
            )}
          </div>

          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`More options for ${group.name}`}
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <MoreVertical className="h-4 w-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" role="menu" aria-label="Group management options">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(group)} role="menuitem">
                    <Edit className="mr-2 h-4 w-4" aria-hidden="true" />
                    Edit Group
                  </DropdownMenuItem>
                )}
                {onManage && (
                  <DropdownMenuItem onClick={() => onManage(group)} role="menuitem">
                    <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
                    Manage
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(group)}
                    className="text-red-600"
                    role="menuitem"
                  >
                    <Trash className="mr-2 h-4 w-4" aria-hidden="true" />
                    Delete Group
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>

      <CardContent
        className="cursor-pointer pt-0"
        onClick={handleCardClick}
        tabIndex={-1}
        aria-hidden="true"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {group.members ? (
              <div data-testid="stacked-avatars" data-members={group.members.length} data-size="sm">
                <StackedAvatarsAccessible
                  members={group.members.map((member) => ({
                    id: member.user.id,
                    name: member.user.name,
                    avatarUrl: member.user.avatarUrl,
                  }))}
                  size="sm"
                  max={4}
                />
              </div>
            ) : (
              <div
                className="flex items-center gap-1 text-sm text-muted-foreground"
                aria-label={`${group._count.userGroups} ${group._count.userGroups === 1 ? 'member' : 'members'}`}
              >
                <Users className="h-4 w-4" aria-hidden="true" />
                {group._count.userGroups} {group._count.userGroups === 1 ? 'member' : 'members'}
              </div>
            )}

            <div
              className="text-sm text-muted-foreground"
              aria-label={`${group._count.listGroups} ${group._count.listGroups === 1 ? 'list' : 'lists'}`}
            >
              {group._count.listGroups} {group._count.listGroups === 1 ? 'list' : 'lists'}
            </div>
          </div>

          {currentUserRole && (
            <Badge
              variant="outline"
              className={`text-xs ${getRoleColor(currentUserRole)}`}
              aria-label={`Your role: ${currentUserRole}`}
            >
              {currentUserRole.charAt(0).toUpperCase() + currentUserRole.slice(1)}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

// Export for backward compatibility
export { GroupCard as GroupCardAccessible };
