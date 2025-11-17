'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

interface ToggleGroupChildProps {
  value: string;
  isPressed?: boolean;
  onPress?: () => void;
}

const ToggleGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: string;
    onValueChange?: (value: string) => void;
    type?: 'single';
    disabled?: boolean;
  }
>(({ className, value, onValueChange, disabled, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      role="radiogroup"
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground',
        className
      )}
      {...props}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          const childElement = child as React.ReactElement<ToggleGroupChildProps>;
          return React.cloneElement(childElement, {
            isPressed: value === childElement.props.value,
            onPress: () => onValueChange?.(childElement.props.value),
            disabled,
          } as any);
        }
        return child;
      })}
    </div>
  );
});
ToggleGroup.displayName = 'ToggleGroup';

const ToggleGroupItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    value: string;
    isPressed?: boolean;
    onPress?: () => void;
  }
>(({ className, isPressed, onPress, children, ...props }, ref) => {
  return (
    <button
      ref={ref}
      role="radio"
      aria-checked={isPressed}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        isPressed
          ? 'bg-background text-foreground shadow-sm'
          : 'hover:bg-muted hover:text-foreground',
        className
      )}
      onClick={onPress}
      {...props}
    >
      {children}
    </button>
  );
});
ToggleGroupItem.displayName = 'ToggleGroupItem';

export { ToggleGroup, ToggleGroupItem };
