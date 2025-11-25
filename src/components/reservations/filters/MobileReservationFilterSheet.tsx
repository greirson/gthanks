'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { X, Search } from 'lucide-react';
import type { FilterState, DateFilterOption, SortOption } from '../hooks/useReservationFilters';

interface MobileReservationFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filterState: FilterState;
  uniqueOwners: Array<{ id: string; name: string; email: string }>;
  setDateFilter: (filter: DateFilterOption) => void;
  setOwnerFilter: (ownerIds: string[]) => void;
  setPurchaseStatus: (status: 'all' | 'active' | 'purchased') => void;
  setSortOption: (sort: SortOption) => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;
  activeFilterCount: number;
}

export function MobileReservationFilterSheet({
  open,
  onOpenChange,
  filterState,
  uniqueOwners,
  setDateFilter,
  setOwnerFilter,
  setPurchaseStatus,
  setSortOption,
  setSearchQuery,
  resetFilters: _resetFilters,
  activeFilterCount,
}: MobileReservationFilterSheetProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Temporary state for filters (batch application)
  const [tempDateFilter, setTempDateFilter] = useState<DateFilterOption>(filterState.dateFilter);
  const [tempOwnerIds, setTempOwnerIds] = useState<string[]>(filterState.ownerIds);
  const [tempPurchaseStatus, setTempPurchaseStatus] = useState<'all' | 'active' | 'purchased'>(
    'all'
  );
  const [tempSortOption, setTempSortOption] = useState<SortOption>(filterState.sort);
  const [tempSearchQuery, setTempSearchQuery] = useState(filterState.search);

  // Sync temporary state when props change
  useEffect(() => {
    setTempDateFilter(filterState.dateFilter);
    setTempOwnerIds(filterState.ownerIds);
    setTempSortOption(filterState.sort);
    setTempSearchQuery(filterState.search);
    // Note: purchaseStatus will be synced when it's added to FilterState
  }, [filterState]);

  const closeSheet = useCallback(() => {
    setIsOpen(false);
    // Reset temp state to actual state on cancel
    setTempDateFilter(filterState.dateFilter);
    setTempOwnerIds(filterState.ownerIds);
    setTempSortOption(filterState.sort);
    setTempSearchQuery(filterState.search);
  }, [filterState]);

  const applyFilters = () => {
    setDateFilter(tempDateFilter);
    setOwnerFilter(tempOwnerIds);
    setPurchaseStatus(tempPurchaseStatus);
    setSortOption(tempSortOption);
    setSearchQuery(tempSearchQuery);
    setIsOpen(false);
  };

  const clearFilters = () => {
    setTempDateFilter('all');
    setTempOwnerIds([]);
    setTempPurchaseStatus('all');
    setTempSortOption('recent');
    setTempSearchQuery('');
  };

  const handleOwnerToggle = (ownerId: string) => {
    setTempOwnerIds((prev) =>
      prev.includes(ownerId) ? prev.filter((id) => id !== ownerId) : [...prev, ownerId]
    );
  };

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeSheet();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeSheet]);

  // Sync open state with parent
  useEffect(() => {
    setIsOpen(open);
  }, [open]);

  // Notify parent when internal state changes
  useEffect(() => {
    onOpenChange(isOpen);
  }, [isOpen, onOpenChange]);

  return (
    <>
      {/* Filter Sheet */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/50 md:hidden"
            onClick={closeSheet}
            aria-hidden="true"
          />

          {/* Sheet */}
          <div
            className={cn(
              'fixed bottom-0 left-0 right-0 z-50 bg-background',
              'transform transition-transform duration-300 ease-out',
              'max-h-[85vh] overflow-y-auto rounded-t-lg shadow-lg',
              'md:hidden',
              isOpen ? 'translate-y-0' : 'translate-y-full'
            )}
            role="dialog"
            aria-label="Filter options"
            aria-modal="true"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background p-4">
              <h2 className="text-lg font-semibold">Filters</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={closeSheet}
                aria-label="Close filters"
                className="h-11 w-11" // 44px touch target
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Filter Content */}
            <div className="space-y-6 p-4 pb-32">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="mobile-search" className="text-sm font-medium">
                  Search
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="mobile-search"
                    type="search"
                    placeholder="Search by title, owner, or list..."
                    value={tempSearchQuery}
                    onChange={(e) => setTempSearchQuery(e.target.value)}
                    className="h-11 pl-9" // 44px touch target
                  />
                </div>
              </div>

              {/* Date Filter */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Date Reserved</Label>
                <RadioGroup
                  value={tempDateFilter}
                  onValueChange={(value) => setTempDateFilter(value as DateFilterOption)}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="all" id="mobile-date-all" className="h-5 w-5" />
                    <Label
                      htmlFor="mobile-date-all"
                      className="flex-1 cursor-pointer py-2 text-base font-normal"
                    >
                      All time
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="thisWeek" id="mobile-date-week" className="h-5 w-5" />
                    <Label
                      htmlFor="mobile-date-week"
                      className="flex-1 cursor-pointer py-2 text-base font-normal"
                    >
                      This week
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="thisMonth" id="mobile-date-month" className="h-5 w-5" />
                    <Label
                      htmlFor="mobile-date-month"
                      className="flex-1 cursor-pointer py-2 text-base font-normal"
                    >
                      This month
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="older" id="mobile-date-older" className="h-5 w-5" />
                    <Label
                      htmlFor="mobile-date-older"
                      className="flex-1 cursor-pointer py-2 text-base font-normal"
                    >
                      Older than 30 days
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Purchase Status Filter */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Purchase Status</Label>
                <RadioGroup
                  value={tempPurchaseStatus}
                  onValueChange={(value) =>
                    setTempPurchaseStatus(value as 'all' | 'active' | 'purchased')
                  }
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="all" id="mobile-status-all" className="h-5 w-5" />
                    <Label
                      htmlFor="mobile-status-all"
                      className="flex-1 cursor-pointer py-2 text-base font-normal"
                    >
                      Show all
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="active" id="mobile-status-active" className="h-5 w-5" />
                    <Label
                      htmlFor="mobile-status-active"
                      className="flex-1 cursor-pointer py-2 text-base font-normal"
                    >
                      Active only
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem
                      value="purchased"
                      id="mobile-status-purchased"
                      className="h-5 w-5"
                    />
                    <Label
                      htmlFor="mobile-status-purchased"
                      className="flex-1 cursor-pointer py-2 text-base font-normal"
                    >
                      Purchased only
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Owner Filter */}
              {uniqueOwners.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Filter by Owner</Label>
                  <div className="space-y-2">
                    {uniqueOwners.map((owner) => (
                      <div key={owner.id} className="flex items-center space-x-3">
                        <Checkbox
                          id={`mobile-owner-${owner.id}`}
                          checked={tempOwnerIds.includes(owner.id)}
                          onCheckedChange={() => handleOwnerToggle(owner.id)}
                          className="h-5 w-5"
                        />
                        <Label
                          htmlFor={`mobile-owner-${owner.id}`}
                          className="flex-1 cursor-pointer py-2 text-base font-normal"
                        >
                          {owner.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sort Option */}
              <div className="space-y-2">
                <Label htmlFor="mobile-sort" className="text-sm font-medium">
                  Sort by
                </Label>
                <Select
                  value={tempSortOption}
                  onValueChange={(value) => setTempSortOption(value as SortOption)}
                >
                  <SelectTrigger id="mobile-sort" className="h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most recent first</SelectItem>
                    <SelectItem value="oldest">Oldest first</SelectItem>
                    <SelectItem value="title-asc">Title (A-Z)</SelectItem>
                    <SelectItem value="title-desc">Title (Z-A)</SelectItem>
                    <SelectItem value="owner-asc">Owner (A-Z)</SelectItem>
                    <SelectItem value="owner-desc">Owner (Z-A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Bottom Action Buttons */}
            <div className="fixed bottom-0 left-0 right-0 z-10 border-t bg-background p-4 md:hidden">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="h-12 flex-1" // 48px touch target for emphasis
                >
                  Reset
                </Button>
                <Button onClick={applyFilters} className="h-12 flex-1">
                  Apply Filters
                  {activeFilterCount > 0 && (
                    <span className="ml-2 rounded-full bg-background px-2 py-0.5 text-xs font-semibold text-primary">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
