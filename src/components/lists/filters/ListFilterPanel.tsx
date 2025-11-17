'use client';

import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type {
  VisibilitySelection,
  OwnershipFilter,
  ItemCountRange,
  ListSortOption,
} from '@/components/lists/hooks/useListFilters';

interface ListFilterPanelProps {
  search: string;
  visibility: VisibilitySelection;
  ownership: OwnershipFilter;
  itemCount: ItemCountRange;
  sort: ListSortOption;
  onSearchChange: (value: string) => void;
  onVisibilityChange: (value: VisibilitySelection) => void;
  onOwnershipChange: (value: OwnershipFilter) => void;
  onItemCountChange: (value: ItemCountRange) => void;
  onSortChange: (value: ListSortOption) => void;
  onClearAll: () => void;
  activeFilterCount: number;
  isMobile?: boolean;
  className?: string;
}

export function ListFilterPanel({
  search,
  visibility,
  ownership,
  itemCount,
  sort,
  onSearchChange,
  onVisibilityChange,
  onOwnershipChange,
  onItemCountChange,
  onSortChange,
  onClearAll,
  activeFilterCount,
  isMobile: _isMobile = false,
  className,
}: ListFilterPanelProps) {
  const toggleVisibility = (value: 'public' | 'private' | 'password') => {
    if (visibility.includes(value)) {
      onVisibilityChange(visibility.filter((v) => v !== value));
    } else {
      onVisibilityChange([...visibility, value]);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Search */}
      <div className="space-y-2">
        <Label htmlFor="search" className="text-sm font-medium">
          Search Lists
        </Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="search"
            type="text"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-9"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
              onClick={() => onSearchChange('')}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Sort */}
      <div className="space-y-2">
        <Label htmlFor="sort" className="text-sm font-medium">
          Sort By
        </Label>
        <Select value={sort} onValueChange={(value) => onSortChange(value as ListSortOption)}>
          <SelectTrigger id="sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="name">Name (A-Z)</SelectItem>
            <SelectItem value="items">Most Items</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Visibility */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Visibility</Label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="public"
              checked={visibility.includes('public')}
              onCheckedChange={() => toggleVisibility('public')}
            />
            <Label htmlFor="public" className="cursor-pointer text-sm font-normal">
              Public
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="private"
              checked={visibility.includes('private')}
              onCheckedChange={() => toggleVisibility('private')}
            />
            <Label htmlFor="private" className="cursor-pointer text-sm font-normal">
              Private
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="password"
              checked={visibility.includes('password')}
              onCheckedChange={() => toggleVisibility('password')}
            />
            <Label htmlFor="password" className="cursor-pointer text-sm font-normal">
              Password Protected
            </Label>
          </div>
        </div>
      </div>

      {/* Ownership */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Ownership</Label>
        <RadioGroup
          value={ownership}
          onValueChange={(value: string) => onOwnershipChange(value as OwnershipFilter)}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="all-lists" />
            <Label htmlFor="all-lists" className="cursor-pointer text-sm font-normal">
              All Lists
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="owned" id="my-lists" />
            <Label htmlFor="my-lists" className="cursor-pointer text-sm font-normal">
              My Lists
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="shared" id="shared-lists" />
            <Label htmlFor="shared-lists" className="cursor-pointer text-sm font-normal">
              Shared with Me
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Item Count */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Item Count</Label>
        <RadioGroup
          value={itemCount}
          onValueChange={(value: string) => onItemCountChange(value as ItemCountRange)}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="all-counts" />
            <Label htmlFor="all-counts" className="cursor-pointer text-sm font-normal">
              Any Amount
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="empty" id="empty-lists" />
            <Label htmlFor="empty-lists" className="cursor-pointer text-sm font-normal">
              Empty (0 items)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="small" id="small-lists" />
            <Label htmlFor="small-lists" className="cursor-pointer text-sm font-normal">
              Small (1-5 items)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="medium" id="medium-lists" />
            <Label htmlFor="medium-lists" className="cursor-pointer text-sm font-normal">
              Medium (6-15 items)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="large" id="large-lists" />
            <Label htmlFor="large-lists" className="cursor-pointer text-sm font-normal">
              Large (16+ items)
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Clear Filters */}
      {activeFilterCount > 0 && (
        <Button variant="outline" onClick={onClearAll} className="w-full" size="sm">
          Clear All Filters ({activeFilterCount})
        </Button>
      )}
    </div>
  );
}
