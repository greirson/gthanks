import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  badges?: Array<{
    label: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
    className?: string;
    key?: string;
  }>;
  metadata?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Shared page header component for consistent layout across pages
 * Used in both list detail and wishes pages
 */
export function PageHeader({
  title,
  description,
  badges,
  metadata,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn('mb-6 flex flex-col gap-4', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-1 flex-col gap-2">
          <h1 className="text-3xl font-bold">{title}</h1>
          {description && <p className="text-muted-foreground">{description}</p>}

          {/* Badges and metadata - Below title on mobile, inline on desktop */}
          {(badges || metadata) && (
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              {badges?.map((badge, index) => (
                <Badge
                  key={badge.key || `badge-${index}`}
                  variant={badge.variant}
                  className={badge.className}
                >
                  {badge.label}
                </Badge>
              ))}
              {metadata}
            </div>
          )}
        </div>

        {/* Action buttons - Responsive positioning */}
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}
