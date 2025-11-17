'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2, Search, X } from 'lucide-react';

import { useCallback, useMemo, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { ListWithOwner } from '@/lib/services/group-types';
import { cn } from '@/lib/utils';

interface SearchableListSelectorProps {
  groupId: string;
  onListSelect: (listId: string) => void;
  className?: string;
}

interface SearchResponse {
  data: {
    lists: ListWithOwner[];
  };
  pagination: {
    offset: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export function SearchableListSelector({
  groupId,
  onListSelect,
  className,
}: SearchableListSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [justAddedListId, setJustAddedListId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Only search if we have at least 2 characters
  const shouldSearch = debouncedSearchQuery.length >= 2;

  const {
    data: searchResults,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['list-search', groupId, debouncedSearchQuery],
    queryFn: async ({ signal }) => {
      const response = await fetch(
        `/api/groups/${groupId}/lists/search?q=${encodeURIComponent(debouncedSearchQuery)}`,
        {
          signal,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to search lists');
      }

      return response.json() as Promise<SearchResponse>;
    },
    enabled: shouldSearch,
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    // Clear any "just added" status when searching again
    setJustAddedListId(null);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setJustAddedListId(null);
    searchInputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      handleClearSearch();
    }
  };

  const handleListSelect = useCallback(
    (list: ListWithOwner) => {
      onListSelect(list.id);
      setJustAddedListId(list.id);

      // Return focus to search input
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);

      // Clear the "just added" status after animation
      setTimeout(() => {
        setJustAddedListId(null);
      }, 3000);
    },
    [onListSelect]
  );

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const highlightText = (text: string, query: string) => {
    if (!query) {
      return text;
    }

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark
          key={index}
          className="bg-yellow-200 dark:bg-yellow-800"
          data-testid={`highlighted-text-${query.toLowerCase()}`}
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const resultsCount = searchResults?.pagination?.total || 0;
  const hasResults = resultsCount > 0;

  const memoizedResults = useMemo(() => {
    if (!searchResults?.data?.lists) {
      return [];
    }
    return searchResults.data.lists;
  }, [searchResults?.data?.lists]);

  return (
    <div className={cn('w-full space-y-4', className)} data-testid="searchable-list-selector">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          type="text"
          role="searchbox"
          value={searchQuery}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          placeholder="Search lists by name or description..."
          className="pl-10 pr-10 text-base md:text-sm"
          aria-label="Search for lists to add"
          aria-describedby="search-instructions"
          aria-controls="search-results"
        />
        {searchQuery && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearSearch}
            className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <p id="search-instructions" className="text-sm text-muted-foreground">
        Type at least 2 characters to search for lists
      </p>

      {/* Live region for screen reader announcements */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {isLoading && 'Searching...'}
        {shouldSearch && !isLoading && hasResults && `Found ${resultsCount} lists`}
        {shouldSearch && !isLoading && !hasResults && 'No lists found'}
        {justAddedListId && 'List added successfully'}
      </div>

      {shouldSearch && (
        <div
          id="search-results"
          className={cn('space-y-2', hasResults && 'duration-200 animate-in fade-in')}
          data-testid="search-results"
        >
          {isLoading && (
            <div className="flex items-center justify-center py-8" role="status">
              <Loader2 className="h-6 w-6 animate-spin" data-testid="loading-spinner" />
              <span className="ml-2">Searching...</span>
            </div>
          )}

          {error && (
            <div
              className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
              role="alert"
            >
              <p>Failed to search lists. Please try again.</p>
              <Button
                onClick={handleRetry}
                variant="outline"
                size="sm"
                className="mt-2"
                aria-label="Try again"
              >
                Try again
              </Button>
            </div>
          )}

          {!isLoading && !error && !hasResults && (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">
                No lists found matching &quot;{searchQuery}&quot;
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Try different search terms or create a new list
              </p>
            </div>
          )}

          {!isLoading && !error && hasResults && (
            <div className="space-y-2" role="list">
              {memoizedResults.map((list) => (
                <div
                  key={list.id}
                  className={cn(
                    'flex items-center justify-between rounded-md border bg-card p-3 transition-all',
                    justAddedListId === list.id && 'border-green-500 bg-green-50 dark:bg-green-950'
                  )}
                  role="listitem"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{highlightText(list.name, searchQuery)}</h4>
                      <Badge variant="outline" className="text-xs">
                        {list.visibility}
                      </Badge>
                    </div>
                    {list.description && (
                      <p className="line-clamp-1 text-sm text-muted-foreground">
                        {highlightText(list.description, searchQuery)}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      by {list.owner.name} • {list._count?.wishes || 0} wishes
                    </p>
                  </div>
                  <Button
                    onClick={() => handleListSelect(list)}
                    disabled={justAddedListId === list.id}
                    variant={justAddedListId === list.id ? 'secondary' : 'default'}
                    size="sm"
                    className="ml-4 min-h-[44px] min-w-[80px]"
                    aria-label={`Add ${list.name} to group`}
                  >
                    {justAddedListId === list.id ? 'Added!' : 'Add'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
