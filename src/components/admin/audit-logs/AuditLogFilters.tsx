'use client';

import { Search, X } from 'lucide-react';

import * as React from 'react';
import { useEffect, useState, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface AuditLogFiltersState {
  category?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  actorId?: string;
}

export interface AuditLogFiltersProps {
  filters: AuditLogFiltersState;
  onFiltersChange: (filters: AuditLogFiltersState) => void;
}

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'auth', label: 'Authentication' },
  { value: 'user', label: 'User Management' },
  { value: 'content', label: 'Content' },
  { value: 'admin', label: 'Admin Actions' },
] as const;

/**
 * Debounce hook for search input
 */
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function AuditLogFilters({ filters, onFiltersChange }: AuditLogFiltersProps) {
  // Local state for search input (debounced)
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const debouncedSearch = useDebounce(searchInput, 300);

  // Track previous search to avoid unnecessary updates
  const prevSearchRef = React.useRef(filters.search);

  // Update filters when debounced search changes
  useEffect(() => {
    // Only update if the debounced search actually changed from what's in filters
    if (debouncedSearch !== prevSearchRef.current) {
      prevSearchRef.current = debouncedSearch || undefined;
      onFiltersChange({ ...filters, search: debouncedSearch || undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentionally exclude filters and onFiltersChange to prevent infinite loop
  }, [debouncedSearch]);

  // Sync local search state if filters change externally (e.g., URL params)
  useEffect(() => {
    if (filters.search !== searchInput && filters.search !== prevSearchRef.current) {
      setSearchInput(filters.search || '');
      prevSearchRef.current = filters.search;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only sync when filters.search changes externally
  }, [filters.search]);

  const handleCategoryChange = useCallback(
    (value: string) => {
      // 'all' means no filter, so we set category to undefined
      onFiltersChange({ ...filters, category: value === 'all' ? undefined : value });
    },
    [filters, onFiltersChange]
  );

  const handleStartDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      // Convert local datetime to ISO string
      const isoDate = value ? new Date(value).toISOString() : undefined;
      onFiltersChange({ ...filters, startDate: isoDate });
    },
    [filters, onFiltersChange]
  );

  const handleEndDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      // Convert local datetime to ISO string
      const isoDate = value ? new Date(value).toISOString() : undefined;
      onFiltersChange({ ...filters, endDate: isoDate });
    },
    [filters, onFiltersChange]
  );

  const handleActorIdChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      onFiltersChange({ ...filters, actorId: value || undefined });
    },
    [filters, onFiltersChange]
  );

  const handleClearFilters = useCallback(() => {
    setSearchInput('');
    onFiltersChange({});
  }, [onFiltersChange]);

  // Check if any filters are active
  const hasActiveFilters =
    filters.category || filters.startDate || filters.endDate || filters.search || filters.actorId;

  // Convert ISO date to local datetime-local format for input
  const formatDateForInput = (isoDate?: string): string => {
    if (!isoDate) {
      return '';
    }
    const date = new Date(isoDate);
    // Format as YYYY-MM-DDTHH:MM for datetime-local input
    return date.toISOString().slice(0, 16);
  };

  return (
    <div
      className="space-y-4 rounded-lg border bg-card p-4"
      role="search"
      aria-label="Audit log filters"
    >
      {/* First row: Search and Category */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        {/* Search input */}
        <div className="flex-1">
          <Label htmlFor="audit-search" className="mb-1.5 block">
            Search
          </Label>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="audit-search"
              type="text"
              placeholder="Search actions, resources..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
              aria-describedby="search-description"
            />
            <span id="search-description" className="sr-only">
              Search will filter results as you type
            </span>
          </div>
        </div>

        {/* Category filter */}
        <div className="w-full sm:w-48">
          <Label htmlFor="audit-category" className="mb-1.5 block">
            Category
          </Label>
          <Select value={filters.category || 'all'} onValueChange={handleCategoryChange}>
            <SelectTrigger id="audit-category" aria-label="Filter by category">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Second row: Date range and Actor ID */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        {/* Start date */}
        <div className="w-full sm:w-auto">
          <Label htmlFor="audit-start-date" className="mb-1.5 block">
            From
          </Label>
          <Input
            id="audit-start-date"
            type="datetime-local"
            value={formatDateForInput(filters.startDate)}
            onChange={handleStartDateChange}
            className="w-full sm:w-52"
            aria-label="Start date and time"
          />
        </div>

        {/* End date */}
        <div className="w-full sm:w-auto">
          <Label htmlFor="audit-end-date" className="mb-1.5 block">
            To
          </Label>
          <Input
            id="audit-end-date"
            type="datetime-local"
            value={formatDateForInput(filters.endDate)}
            onChange={handleEndDateChange}
            className="w-full sm:w-52"
            aria-label="End date and time"
          />
        </div>

        {/* Actor ID filter */}
        <div className="flex-1">
          <Label htmlFor="audit-actor-id" className="mb-1.5 block">
            Actor ID
          </Label>
          <Input
            id="audit-actor-id"
            type="text"
            placeholder="Filter by user ID..."
            value={filters.actorId || ''}
            onChange={handleActorIdChange}
            aria-label="Filter by actor user ID"
          />
        </div>

        {/* Clear filters button */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="default"
            onClick={handleClearFilters}
            className="w-full sm:w-auto"
            aria-label="Clear all filters"
          >
            <X className="mr-2 h-4 w-4" aria-hidden="true" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
