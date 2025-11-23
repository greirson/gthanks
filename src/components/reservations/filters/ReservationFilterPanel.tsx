'use client';

import { cn } from '@/lib/utils';
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
import { Badge } from '@/components/ui/badge';
import { Search, X } from 'lucide-react';

// Type definitions matching useReservationFilters hook
export type DateFilterOption = 'all' | 'thisWeek' | 'thisMonth' | 'older';
export type PurchaseStatus = 'all' | 'active' | 'purchased';
export type SortOption =
  | 'recent'
  | 'oldest'
  | 'title-asc'
  | 'title-desc'
  | 'owner-asc'
  | 'owner-desc';

export interface FilterState {
  dateFilter: DateFilterOption;
  ownerIds: string[];
  purchaseStatus: PurchaseStatus;
  sort: SortOption;
  search: string;
}

interface ReservationFilterPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filterState: FilterState;
  uniqueOwners: Array<{ id: string; name: string; email: string }>;
  setDateFilter: (filter: DateFilterOption) => void;
  setOwnerFilter: (ownerIds: string[]) => void;
  setPurchaseStatus: (status: PurchaseStatus) => void;
  setSortOption: (sort: SortOption) => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;
  activeFilterCount: number;
  className?: string;
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'recent', label: 'Most Recent' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'title-asc', label: 'Title: A to Z' },
  { value: 'title-desc', label: 'Title: Z to A' },
  { value: 'owner-asc', label: 'Owner: A to Z' },
  { value: 'owner-desc', label: 'Owner: Z to A' },
];

const dateFilterOptions: { value: DateFilterOption; label: string }[] = [
  { value: 'all', label: 'All reservations' },
  { value: 'thisWeek', label: 'This week' },
  { value: 'thisMonth', label: 'This month' },
  { value: 'older', label: 'Older than a month' },
];

const purchaseStatusOptions: { value: PurchaseStatus; label: string }[] = [
  { value: 'all', label: 'All items' },
  { value: 'active', label: 'Active only' },
  { value: 'purchased', label: 'Purchased only' },
];

export function ReservationFilterPanel({
  open,
  onOpenChange,
  filterState,
  uniqueOwners,
  setDateFilter,
  setOwnerFilter,
  setPurchaseStatus,
  setSortOption,
  setSearchQuery,
  resetFilters,
  activeFilterCount,
  className,
}: ReservationFilterPanelProps) {
  const handleOwnerToggle = (ownerId: string) => {
    if (filterState.ownerIds.includes(ownerId)) {
      // Remove owner from selection
      setOwnerFilter(filterState.ownerIds.filter((id) => id !== ownerId));
    } else {
      // Add owner to selection
      setOwnerFilter([...filterState.ownerIds, ownerId]);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  return (
    <div data-testid="reservation-filter-panel" className={cn('space-y-6 p-4', className)}>
      {/* Search Input */}
      <div className="space-y-2">
        <Label htmlFor="reservation-search" className="text-sm font-medium">
          Search
        </Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="reservation-search"
            type="text"
            placeholder="Search by title, owner, list, or URL..."
            value={filterState.search}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
            data-testid="search-input"
          />
          {filterState.search && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
              data-testid="clear-search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="border-t pt-4" />

      {/* Sort Dropdown */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Sort By</Label>
        <Select value={filterState.sort} onValueChange={setSortOption}>
          <SelectTrigger className="w-full" data-testid="sort-select" aria-label="Sort reservations by">
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
      </div>

      {/* Owner Filter (Multi-select Checkboxes) */}
      {uniqueOwners.length > 0 && (
        <div className="space-y-2">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium">List Owner</span>
            {filterState.ownerIds.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {filterState.ownerIds.length}
              </Badge>
            )}
          </div>
          <div className="space-y-3 max-h-48 overflow-y-auto">
            {uniqueOwners.map((owner) => (
              <div key={owner.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`owner-${owner.id}`}
                  checked={filterState.ownerIds.includes(owner.id)}
                  onCheckedChange={() => handleOwnerToggle(owner.id)}
                  aria-label={`Filter by ${owner.name || owner.email}`}
                  data-testid={`owner-checkbox-${owner.id}`}
                />
                <Label
                  htmlFor={`owner-${owner.id}`}
                  className="flex cursor-pointer select-none flex-col text-sm font-normal"
                >
                  <span>{owner.name || owner.email}</span>
                  {owner.name && (
                    <span className="text-xs text-muted-foreground">{owner.email}</span>
                  )}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Date Filter (Radio Buttons) */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Reserved Date</Label>
        <RadioGroup
          value={filterState.dateFilter}
          onValueChange={(value) => setDateFilter(value as DateFilterOption)}
          className="space-y-2"
        >
          {dateFilterOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem
                value={option.value}
                id={`date-${option.value}`}
                data-testid={`date-filter-${option.value}`}
              />
              <Label
                htmlFor={`date-${option.value}`}
                className="cursor-pointer select-none text-sm font-normal"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Purchase Status Filter (Radio Buttons) */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Purchase Status</Label>
        <RadioGroup
          value={filterState.purchaseStatus}
          onValueChange={(value) => setPurchaseStatus(value as PurchaseStatus)}
          className="space-y-2"
        >
          {purchaseStatusOptions.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem
                value={option.value}
                id={`status-${option.value}`}
                data-testid={`purchase-status-${option.value}`}
              />
              <Label
                htmlFor={`status-${option.value}`}
                className="cursor-pointer select-none text-sm font-normal"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Active Filters Summary */}
      {activeFilterCount > 0 && (
        <div className="rounded-md bg-muted p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              data-testid="clear-all-filters"
              className="h-8 text-xs"
            >
              Clear All
            </Button>
          </div>
        </div>
      )}

      {/* Clear Filters Button (Alternative placement) */}
      {activeFilterCount > 0 && (
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetFilters}
            data-testid="clear-filters"
            className="w-full"
          >
            Reset All Filters
          </Button>
        </div>
      )}
    </div>
  );
}
