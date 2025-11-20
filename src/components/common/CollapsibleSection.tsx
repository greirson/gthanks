'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { ChevronDown, Info } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  infoTooltip?: string;
  children: React.ReactNode;
  className?: string;
}

export function CollapsibleSection({
  title,
  defaultOpen = false,
  infoTooltip,
  children,
  className,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        {/* Header */}
        <div className="flex items-center border-b border-border last:border-b-0">
          {/* Clickable header area (entire left side) */}
          <CollapsibleTrigger className="flex flex-1 items-center justify-between px-4 py-3 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:px-6 sm:py-4">
            <h3 className="text-base font-semibold leading-none tracking-tight sm:text-lg">
              {title}
            </h3>

            <div className="flex items-center gap-2">
              {/* Chevron icon - rotates on expand/collapse */}
              <ChevronDown
                className={cn(
                  'h-5 w-5 text-muted-foreground transition-transform duration-200 ease-in-out',
                  isOpen && 'rotate-180'
                )}
                aria-hidden="true"
              />
            </div>
          </CollapsibleTrigger>

          {/* Info icon with tooltip - separate button to avoid nesting */}
          {infoTooltip && (
            <TooltipPrimitive.Provider delayDuration={200}>
              <TooltipPrimitive.Root>
                <TooltipPrimitive.Trigger asChild>
                  <button
                    type="button"
                    className="flex h-11 w-11 shrink-0 items-center justify-center border-l border-border transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-14 sm:w-14"
                    aria-label={`About ${title.toLowerCase()}`}
                    onClick={(e) => {
                      // Prevent collapsible from toggling when clicking info icon
                      e.stopPropagation();
                    }}
                  >
                    <Info className="h-4 w-4 text-muted-foreground sm:h-5 sm:w-5" aria-hidden="true" />
                  </button>
                </TooltipPrimitive.Trigger>

                <TooltipPrimitive.Portal>
                  <TooltipPrimitive.Content
                    side="top"
                    align="end"
                    sideOffset={5}
                    className="z-50 max-w-xs overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 sm:text-sm"
                  >
                    {infoTooltip}
                    <TooltipPrimitive.Arrow className="fill-primary" />
                  </TooltipPrimitive.Content>
                </TooltipPrimitive.Portal>
              </TooltipPrimitive.Root>
            </TooltipPrimitive.Provider>
          )}
        </div>

        {/* Collapsible content with smooth height animation */}
        <CollapsibleContent className="overflow-hidden transition-all data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0">
          <div className="px-4 pb-4 pt-4 sm:px-6 sm:pb-6">{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
