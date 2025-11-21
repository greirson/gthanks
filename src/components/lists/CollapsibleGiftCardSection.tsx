'use client';

import { useState } from 'react';
import { CreditCard, Settings, ChevronDown, Info } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';
import { GiftCardSection, useManageGiftCardsDialog } from '@/components/lists/GiftCardSection';
import type { GiftCard } from '@/components/lists/hooks/useManageGiftCardsDialog';

interface CollapsibleGiftCardSectionProps {
  listId: string;
  giftCards: GiftCard[];
  canEdit: boolean;
  onUpdate?: (cards: GiftCard[]) => void;
  onManage?: () => void;
  infoTooltip?: string;
  externalManageDialog?: ReturnType<typeof useManageGiftCardsDialog>;
}

export function CollapsibleGiftCardSection({
  listId,
  giftCards,
  canEdit,
  onUpdate,
  onManage,
  infoTooltip = "Gift cards you'd appreciate. Click any card to visit the store.",
  externalManageDialog,
}: CollapsibleGiftCardSectionProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Always show section if user can edit (even with 0 cards)
  // Hide section if user cannot edit and no cards exist
  if (!canEdit && giftCards.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        {/* Header */}
        <div className="flex items-center border-b border-border">
          {/* Clickable header area (title + chevron) */}
          <CollapsibleTrigger className="flex flex-1 items-center justify-between px-4 py-3 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:px-6 sm:py-4">
            <h3 className="flex items-center gap-2 text-base font-semibold leading-none tracking-tight sm:text-lg">
              <CreditCard className="h-5 w-5" />
              Gift Cards
            </h3>

            {/* Chevron icon */}
            <ChevronDown
              className={cn(
                'h-5 w-5 text-muted-foreground transition-transform duration-200 ease-in-out',
                isOpen && 'rotate-180'
              )}
              aria-hidden="true"
            />
          </CollapsibleTrigger>

          {/* Manage button - only for owners (outside trigger to avoid nested buttons) */}
          {canEdit && onManage && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onManage}
              className="h-11 gap-1.5 border-l border-border px-2 text-xs sm:h-14 sm:px-3 sm:text-sm"
            >
              <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Manage</span>
            </Button>
          )}

          {/* Info icon with tooltip - only for non-owners */}
          {!canEdit && infoTooltip && (
            <TooltipPrimitive.Provider delayDuration={200}>
              <TooltipPrimitive.Root>
                <TooltipPrimitive.Trigger asChild>
                  <button
                    type="button"
                    className="flex h-11 w-11 shrink-0 items-center justify-center border-l border-border transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-14 sm:w-14"
                    aria-label="About Gift Cards"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Info
                      className="h-4 w-4 text-muted-foreground sm:h-5 sm:w-5"
                      aria-hidden="true"
                    />
                  </button>
                </TooltipPrimitive.Trigger>

                <TooltipPrimitive.Portal>
                  <TooltipPrimitive.Content
                    side="top"
                    align="end"
                    sideOffset={5}
                    className="z-50 max-w-xs overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground shadow-md animate-in fade-in-0 zoom-in-95 sm:text-sm"
                  >
                    {infoTooltip}
                    <TooltipPrimitive.Arrow className="fill-primary" />
                  </TooltipPrimitive.Content>
                </TooltipPrimitive.Portal>
              </TooltipPrimitive.Root>
            </TooltipPrimitive.Provider>
          )}
        </div>

        {/* Collapsible content */}
        <CollapsibleContent className="overflow-hidden transition-all data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
          <div className="mt-2 px-4 pb-4 pt-4 sm:px-6">
            <GiftCardSection
              listId={listId}
              giftCards={giftCards}
              canEdit={canEdit}
              onUpdate={onUpdate}
              hideHeading={true}
              externalManageDialog={externalManageDialog}
            />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
