'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SortOption } from '../hooks/useWishFilters';

interface WishSortDropdownProps {
  value: SortOption;
  onValueChange: (value: SortOption) => void;
  className?: string;
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'wishLevel-high', label: 'Wish Level: High to Low (★★★ → ★)' },
  { value: 'wishLevel-low', label: 'Wish Level: Low to High (★ → ★★★)' },
  { value: 'price-low', label: 'Price: Low to High ($5 → $50)' },
  { value: 'price-high', label: 'Price: High to Low ($50 → $5)' },
  { value: 'featured', label: 'Featured' },
];

export function WishSortDropdown({ value, onValueChange, className }: WishSortDropdownProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        className={className}
        data-testid="wish-sort-select"
        aria-label="Sort wishes by"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {sortOptions.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            data-testid={`sort-option-${option.value}`}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
