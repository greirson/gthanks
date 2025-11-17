'use client';

import { type VariantProps, cva } from 'class-variance-authority';

import * as React from 'react';

import { cn } from '@/lib/utils';

const starRatingVariants = cva('inline-flex items-center gap-1', {
  variants: {
    size: {
      sm: 'text-sm',
      md: 'text-base',
      lg: 'text-lg',
      '2xl': 'text-2xl',
      '3xl': 'text-4xl gap-2',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

const starVariants = cva('transition-colors duration-150 select-none', {
  variants: {
    size: {
      sm: 'text-sm leading-none',
      md: 'text-base leading-none',
      lg: 'text-lg leading-none',
      '2xl': 'text-2xl leading-none p-3',
      '3xl': 'text-4xl leading-none p-4',
    },
    interactive: {
      true: 'cursor-pointer hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm',
      false: 'cursor-default',
    },
    filled: {
      true: 'text-yellow-400',
      false: 'text-muted-foreground/40',
    },
    hover: {
      true: 'text-yellow-300',
      false: '',
    },
  },
  defaultVariants: {
    size: 'md',
    interactive: false,
    filled: false,
    hover: false,
  },
});

export interface StarRatingProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'>,
    VariantProps<typeof starRatingVariants> {
  value?: number | null;
  onChange?: (value: number | null) => void;
  readonly?: boolean;
  max?: number;
  ariaLabel?: string;
}

const StarRating = React.forwardRef<HTMLDivElement, StarRatingProps>(
  (
    { className, size, value = null, onChange, readonly = false, max = 3, ariaLabel, ...props },
    ref
  ) => {
    const [hoverValue, setHoverValue] = React.useState<number | null>(null);
    const isInteractive = !readonly && onChange;
    const displayValue = hoverValue ?? value;

    const handleStarClick = (starValue: number) => {
      if (!isInteractive) {
        return;
      }

      // Simply set the clicked value - no toggle behavior
      onChange?.(starValue);
    };

    const handleStarHover = (starValue: number) => {
      if (!isInteractive) {
        return;
      }
      setHoverValue(starValue);
    };

    const handleMouseLeave = () => {
      if (!isInteractive) {
        return;
      }
      setHoverValue(null);
    };

    const handleKeyDown = (event: React.KeyboardEvent) => {
      if (!isInteractive) {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowDown':
          event.preventDefault();
          if (value === null || value === 0) {
            // Already at minimum
          } else if (value === 1) {
            // Stay at minimum value of 1 instead of clearing to 0
            onChange?.(1);
          } else {
            onChange?.(value - 1);
          }
          break;
        case 'ArrowRight':
        case 'ArrowUp':
          event.preventDefault();
          if (value === null || value === 0) {
            onChange?.(1);
          } else if (value < max) {
            onChange?.(value + 1);
          }
          break;
        case 'Home':
          event.preventDefault();
          onChange?.(1); // Always set to minimum value of 1
          break;
        case 'End':
          event.preventDefault();
          onChange?.(max);
          break;
        case 'Delete':
        case 'Backspace':
          event.preventDefault();
          onChange?.(1); // Set to minimum value of 1
          break;
        case ' ':
        case 'Enter':
          event.preventDefault();
          // Set to 1 if null/0, otherwise maintain current value
          if (value === null || value === 0) {
            onChange?.(1);
          }
          // No change if already has a value - Space/Enter confirms current selection
          break;
      }
    };

    const getAriaLabel = () => {
      if (ariaLabel) {
        return ariaLabel;
      }

      if (readonly) {
        if (value === 0) {
          return 'Rating: No stars';
        }
        return value ? `Rating: ${value} out of ${max} stars` : 'No rating';
      }

      if (value === 0) {
        return `Rating: No stars. Use arrow keys to change rating.`;
      }
      return value
        ? `Rating: ${value} out of ${max} stars. Use arrow keys to change rating.`
        : `No rating set. Use arrow keys to set rating.`;
    };

    return (
      <div
        ref={ref}
        className={cn(starRatingVariants({ size, className }))}
        role={isInteractive ? 'radiogroup' : 'img'}
        aria-label={getAriaLabel()}
        tabIndex={isInteractive ? 0 : undefined}
        onKeyDown={handleKeyDown}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        {Array.from({ length: max }, (_, index) => {
          const starValue = index + 1;
          const isFilled = displayValue !== null && starValue <= displayValue;
          const isHovered = hoverValue !== null && starValue <= hoverValue;

          return (
            <span
              key={starValue}
              className={cn(
                starVariants({
                  size,
                  interactive: Boolean(isInteractive),
                  filled: isFilled,
                  hover: isHovered && !isFilled,
                }),
                'flex items-center justify-center'
              )}
              onClick={() => handleStarClick(starValue)}
              onMouseEnter={() => handleStarHover(starValue)}
              onKeyDown={(e) => {
                if (isInteractive && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  handleStarClick(starValue);
                }
              }}
              role={isInteractive ? 'radio' : undefined}
              aria-checked={isInteractive ? (isFilled ? 'true' : 'false') : undefined}
              aria-label={
                isInteractive ? `${starValue} star${starValue > 1 ? 's' : ''}` : undefined
              }
              tabIndex={isInteractive ? 0 : -1}
            >
              <span className="inline-block w-[1em] text-center leading-none">
                {isFilled ? '★' : '☆'}
              </span>
            </span>
          );
        })}
      </div>
    );
  }
);

StarRating.displayName = 'StarRating';

export { StarRating, starRatingVariants };
