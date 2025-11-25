import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getVisibilityColor } from '@/lib/utils/visibility-badges';

interface ListHeaderProps {
  name: string;
  description?: string | null;
  visibility: string;
  wishCount: number;
  shareToken?: string | null;
  className?: string;
  showBackButton?: boolean;
  onBack?: () => void;
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
  showBackButton,
  onBack,
}: ListHeaderProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col items-center gap-2 border-b pb-4 pt-2 text-center',
        className
      )}
    >
      {/* Back button - Mobile only, positioned absolutely on left */}
      {showBackButton && onBack && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          aria-label="Go back to lists"
          title="Go back"
          className="absolute left-2 top-2 h-11 w-11 p-0 md:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}

      {/* Title and description - Centered */}
      <div className="w-full max-w-2xl px-4">
        <h1 className="break-words text-xl font-bold">{name}</h1>
        {description && (
          <p className="mt-0.5 break-words text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      {/* Metadata row - badges and counts - Centered */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Badge variant="secondary" className={getVisibilityColor(visibility, 'default')}>
          {visibility.charAt(0).toUpperCase() + visibility.slice(1)}
        </Badge>
        {shareToken && <Badge variant="outline">Shareable</Badge>}
        <span className="text-sm text-muted-foreground">
          {wishCount} {wishCount === 1 ? 'wish' : 'wishes'}
        </span>
      </div>
    </div>
  );
}
