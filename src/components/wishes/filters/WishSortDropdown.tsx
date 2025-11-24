'use client';

import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { listsApi } from '@/lib/api/lists';
import type { SortOption } from '../hooks/useWishFilters';

interface WishSortDropdownProps {
  value: SortOption;
  onValueChange: (value: SortOption) => void;
  className?: string;
  wishes?: Array<{ sortOrder?: number | null }>;
  listId?: string;
  canEdit?: boolean;
}

export function WishSortDropdown({
  value,
  onValueChange,
  className,
  wishes,
  listId,
  canEdit = false,
}: WishSortDropdownProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Detect if custom sort exists (any wish has sortOrder set)
  const hasCustomSort = useMemo(() => {
    if (!wishes || wishes.length === 0) {
      return false;
    }
    return wishes.some((w) => w.sortOrder !== null && w.sortOrder !== undefined);
  }, [wishes]);

  // Build sort options array, conditionally including "Custom Order"
  const sortOptions: { value: SortOption; label: string }[] = useMemo(() => {
    const options: { value: SortOption; label: string }[] = [];

    // Add "Custom Order" as first option if user can edit (list owner)
    // This allows users to initialize custom sort even when no wishes have sortOrder yet
    if (canEdit) {
      options.push({ value: 'custom', label: 'Custom Order' });
    }

    options.push(
      { value: 'featured', label: 'Featured' },
      { value: 'wishLevel-high', label: 'Wish Level: High to Low (★★★ → ★)' },
      { value: 'wishLevel-low', label: 'Wish Level: Low to High (★ → ★★★)' },
      { value: 'price-low', label: 'Price: Low to High ($5 → $50)' },
      { value: 'price-high', label: 'Price: High to Low ($50 → $5)' }
    );

    return options;
  }, [hasCustomSort]);

  const handleSortChange = async (newSort: SortOption) => {
    // If user selects "custom" for first time, initialize custom sort
    if (newSort === 'custom' && !hasCustomSort && canEdit && listId) {
      try {
        await listsApi.initializeCustomSort(listId);
        queryClient.invalidateQueries({ queryKey: ['lists', listId] });

        toast({
          title: 'Custom sort enabled',
          description: 'You can now drag and drop wishes to reorder them.',
        });
      } catch (error) {
        toast({
          title: 'Failed to enable custom sort',
          description: 'Please try again.',
          variant: 'destructive',
        });
        return;
      }
    }

    onValueChange(newSort);
  };

  return (
    <Select value={value} onValueChange={handleSortChange}>
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
