'use client';

import { Star } from 'lucide-react';
import { DualRangeSlider } from '@/components/ui/dual-range-slider';

interface WishLevelRangeSliderProps {
  value: [number, number];
  onValueChange: (value: [number, number]) => void;
  className?: string;
}

export function WishLevelRangeSlider({
  value,
  onValueChange,
  className,
}: WishLevelRangeSliderProps) {
  const formatWishLevel = (v: number) => {
    return `${v} ${v === 1 ? 'star' : 'stars'}`;
  };

  const formatRangeLabel = (min: number, max: number) => {
    return `${min} - ${max} ★`;
  };

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">Wish Level</span>
        <span className="text-sm text-muted-foreground">
          {formatRangeLabel(value[0], value[1])}
        </span>
      </div>

      <DualRangeSlider
        min={1}
        max={3}
        step={1}
        value={value}
        onValueChange={onValueChange}
        formatValue={formatWishLevel}
        ariaLabel="Wish level range"
        showLabels={false}
      />

      {/* Star indicators */}
      <div className="mt-2 flex justify-between px-2">
        {[1, 2, 3].map((star) => (
          <div
            key={star}
            className={`flex flex-col items-center ${
              star >= value[0] && star <= value[1] ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <Star className="h-3 w-3 fill-current" />
            <span className="mt-1 text-[10px]">{star}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
