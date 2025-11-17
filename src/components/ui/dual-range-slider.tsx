'use client';

import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

interface DualRangeSliderProps {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onValueChange: (value: [number, number]) => void;
  formatValue?: (value: number) => string;
  className?: string;
  showLabels?: boolean;
  ariaLabel?: string;
}

export function DualRangeSlider({
  min,
  max,
  step = 1,
  value,
  onValueChange,
  formatValue = (v) => v.toString(),
  className,
  showLabels = true,
  ariaLabel = 'Range slider',
}: DualRangeSliderProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {showLabels && (
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{formatValue(value[0])}</span>
          <span>{formatValue(value[1])}</span>
        </div>
      )}

      <SliderPrimitive.Root
        className="relative flex w-full touch-none select-none items-center"
        value={value}
        onValueChange={onValueChange}
        min={min}
        max={max}
        step={step}
        minStepsBetweenThumbs={0}
        aria-label={ariaLabel}
      >
        <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
          <SliderPrimitive.Range className="absolute h-full bg-primary" />
        </SliderPrimitive.Track>

        {/* First thumb for min value */}
        <SliderPrimitive.Thumb
          className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          aria-label={`Minimum ${ariaLabel}`}
        />

        {/* Second thumb for max value */}
        <SliderPrimitive.Thumb
          className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
          aria-label={`Maximum ${ariaLabel}`}
        />
      </SliderPrimitive.Root>

      {showLabels && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatValue(min)}</span>
          <span>{formatValue(max)}</span>
        </div>
      )}
    </div>
  );
}
