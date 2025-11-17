'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';

import * as React from 'react';

import { cn } from '@/lib/utils';

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, forwardedRef) => {
  const [showLeftIndicator, setShowLeftIndicator] = React.useState(false);
  const [showRightIndicator, setShowRightIndicator] = React.useState(false);
  const listRef = React.useRef<React.ElementRef<typeof TabsPrimitive.List>>(null);

  const checkScrollIndicators = React.useCallback(() => {
    const element = listRef.current;
    if (element) {
      setShowLeftIndicator(element.scrollLeft > 0);
      setShowRightIndicator(element.scrollLeft < element.scrollWidth - element.clientWidth);
    }
  }, []);

  React.useEffect(() => {
    const element = listRef.current;
    if (element) {
      // Initial check
      checkScrollIndicators();

      // Set up resize observer to check on container size changes
      const resizeObserver = new ResizeObserver(checkScrollIndicators);
      resizeObserver.observe(element);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [checkScrollIndicators]);

  // Use the imperative handle to combine refs properly
  React.useImperativeHandle(
    forwardedRef,
    () => listRef.current as React.ElementRef<typeof TabsPrimitive.List>,
    []
  );

  return (
    <div className="relative">
      {/* Left scroll indicator */}
      {showLeftIndicator && (
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-4 bg-gradient-to-r from-background to-transparent" />
      )}

      <TabsPrimitive.List
        ref={listRef}
        className={cn(
          'scrollbar-hide inline-flex h-10 items-center justify-center overflow-x-auto rounded-md bg-muted p-1 text-muted-foreground',
          className
        )}
        onScroll={checkScrollIndicators}
        {...props}
      />

      {/* Right scroll indicator */}
      {showRightIndicator && (
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-4 bg-gradient-to-l from-background to-transparent" />
      )}
    </div>
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
