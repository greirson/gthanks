'use client';

import { ArrowLeft, Plus, Edit, Share, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeButton } from '@/components/ui/theme-button';

interface ListDetailTopNavProps {
  variant: 'desktop' | 'mobile';
  isOwner: boolean | undefined;
  list: {
    id: string;
    name: string;
    shareToken?: string | null;
  };
  isSelectionMode: boolean;
  onBack: () => void;
  onToggleSelection: () => void;
  onAddWish: () => void;
  onEditList: () => void;
  onShare: () => void;
  onPublicView?: () => void;
}

export function ListDetailTopNav({
  variant,
  isOwner,
  list,
  isSelectionMode,
  onBack,
  onToggleSelection,
  onAddWish,
  onEditList,
  onShare,
  onPublicView,
}: ListDetailTopNavProps) {
  const isDesktop = variant === 'desktop';
  const isMobile = variant === 'mobile';

  return (
    <div className="mb-4 flex items-center justify-between">
      {/* Back Button */}
      <Button variant="ghost" onClick={onBack} size={isMobile ? 'sm' : undefined}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        {isDesktop && 'Back to Lists'}
        {isMobile && (
          <>
            <span className="hidden sm:inline">Back to Lists</span>
            <span className="sm:hidden">Back</span>
          </>
        )}
      </Button>

      {/* Action Buttons */}
      {isOwner && (
        <div className={`flex ${isMobile ? "gap-1" : "gap-2"}`}>
          {isMobile && (
            <ThemeButton
              variant={isSelectionMode ? "default" : "outline"}
              onClick={onToggleSelection}
              size="sm"
            >
              {isSelectionMode ? "Exit" : "Select"}
            </ThemeButton>
          )}
          <ThemeButton onClick={onAddWish} size="sm">
            <Plus className={isMobile ? 'h-4 w-4' : 'mr-2 h-4 w-4'} />
            {isDesktop && (
              <>
                <span className="hidden sm:inline">Add Wish</span>
                <span className="sm:hidden">Add</span>
              </>
            )}
            {isMobile && <span className="sr-only">Add Wish</span>}
          </ThemeButton>
          <Button variant="outline" onClick={onEditList} size="sm">
            <Edit className={isMobile ? 'h-4 w-4' : 'mr-2 h-4 w-4'} />
            {isDesktop && <span className="hidden sm:inline">Edit</span>}
            {isMobile && <span className="sr-only">Edit</span>}
          </Button>
          <Button variant="outline" onClick={onShare} size="sm">
            <Share className={isMobile ? 'h-4 w-4' : 'mr-2 h-4 w-4'} />
            {isDesktop && <span className="hidden sm:inline">Share</span>}
            {isMobile && <span className="sr-only">Share</span>}
          </Button>
          {list.shareToken && onPublicView && (
            <Button variant="outline" onClick={onPublicView} size="sm">
              <ExternalLink className={isMobile ? 'h-4 w-4' : 'mr-2 h-4 w-4'} />
              {isDesktop && (
                <>
                  <span className="hidden lg:inline">Public View</span>
                  <span className="lg:hidden">View</span>
                </>
              )}
              {isMobile && <span className="sr-only">Public View</span>}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
