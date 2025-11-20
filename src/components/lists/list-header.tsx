import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getVisibilityColor } from '@/lib/utils/visibility-badges';

interface ListHeaderProps {
  name: string;
  description?: string | null;
  visibility: string;
  wishCount: number;
  shareToken?: string | null;
  className?: string;
}

/**
 * Compact centered header for list detail view
 * Displays title, description, and metadata in a centered layout
 */
export function ListHeader({
  name,
  description,
  visibility,
  wishCount,
  shareToken,
  className,
}: ListHeaderProps) {
  return (
    <div className={cn('flex flex-col items-center gap-2 pb-2 border-b text-center', className)}>
      {/* Title and description - Centered */}
      <div className="max-w-2xl w-full px-4">
        <h1 className="text-xl font-bold break-words">{name}</h1>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground break-words">{description}</p>
        )}
      </div>

      {/* Metadata row - badges and counts - Centered */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Badge
          variant="secondary"
          className={getVisibilityColor(visibility, 'default')}
        >
          {visibility.charAt(0).toUpperCase() + visibility.slice(1)}
        </Badge>
        {shareToken && (
          <Badge variant="outline">Shareable</Badge>
        )}
        <span className="text-sm text-muted-foreground">
          {wishCount} {wishCount === 1 ? 'wish' : 'wishes'}
        </span>
      </div>
    </div>
  );
}