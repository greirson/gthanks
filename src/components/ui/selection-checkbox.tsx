'use client';

import { Checkbox } from '@/components/ui/checkbox';

interface SelectionCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean, event?: React.MouseEvent | React.KeyboardEvent) => void;
  className?: string;
}

export function SelectionCheckbox({ checked, onCheckedChange, className }: SelectionCheckboxProps) {
  return (
    <div
      className={`absolute bottom-2 right-2 z-20 ${className || ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onCheckedChange(!checked, e);
      }}
      onKeyDown={(e) => {
        // Handle keyboard interaction
        if (e.key === 'Enter' || e.key === ' ') {
          e.stopPropagation();
          e.preventDefault();
          onCheckedChange(!checked, e);
        }
      }}
      role="checkbox"
      tabIndex={0}
      aria-checked={checked}
      aria-label="Select item"
    >
      <Checkbox
        checked={checked}
        onCheckedChange={() => {
          // The checkbox onChange doesn't have the event, so we'll rely on the div's onClick
          // This is just for visual state sync
        }}
        className="h-7 w-7 cursor-pointer rounded-md bg-background shadow-sm ring-1 ring-border transition-all duration-150 hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
        tabIndex={-1}
      />
    </div>
  );
}
