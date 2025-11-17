'use client';

import { DualRangeSlider } from '@/components/ui/dual-range-slider';

interface PriceRangeSliderProps {
  value: [number, number];
  onValueChange: (value: [number, number]) => void;
  min?: number;
  max?: number;
  className?: string;
}

export function PriceRangeSlider({
  value,
  onValueChange,
  min = 0,
  max = 500,
  className,
}: PriceRangeSliderProps) {
  const formatPrice = (v: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(v);
  };

  // Handle edge case where max value is very high
  const sliderMax = Math.min(max, 1000);

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium">Price Range</span>
        <span className="text-sm text-muted-foreground">
          {formatPrice(value[0])} - {value[1] >= 1000 ? '$1000+' : formatPrice(value[1])}
        </span>
      </div>

      <DualRangeSlider
        min={min}
        max={sliderMax}
        step={max > 100 ? 10 : 5}
        value={[Math.min(value[0], sliderMax), Math.min(value[1], sliderMax)]}
        onValueChange={(newValue) => {
          // If user drags to max and actual max is higher, set to actual max
          const adjustedValue: [number, number] = [
            newValue[0],
            newValue[1] === sliderMax && max > sliderMax ? max : newValue[1],
          ];
          onValueChange(adjustedValue);
        }}
        formatValue={formatPrice}
        ariaLabel="Price range"
        showLabels={true}
      />
    </div>
  );
}
