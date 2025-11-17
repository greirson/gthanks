'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Search } from 'lucide-react';

interface MobileGroupFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  search: string;
  selectedMembers: string[];
  availableMembers: Array<{ id: string; name: string | null; email: string }>;
  showAdminOnly: boolean;
  onSearchChange: (value: string) => void;
  onMembersChange: (value: string[]) => void;
  onShowAdminOnlyChange: (value: boolean) => void;
  onClearAll: () => void;
  activeFilterCount: number;
}

export function MobileGroupFilterSheet({
  open,
  onOpenChange,
  search,
  selectedMembers,
  availableMembers,
  showAdminOnly,
  onSearchChange,
  onMembersChange,
  onShowAdminOnlyChange,
  onClearAll: _onClearAll,
  activeFilterCount: _activeFilterCount,
}: MobileGroupFilterSheetProps) {

  // Temporary state for filters (batch application)
  const [tempSearch, setTempSearch] = useState(search);
  const [tempSelectedMembers, setTempSelectedMembers] = useState(selectedMembers);
  const [tempShowAdminOnly, setTempShowAdminOnly] = useState(showAdminOnly);

  // Sync temporary state when props change
  useEffect(() => {
    setTempSearch(search);
    setTempSelectedMembers(selectedMembers);
    setTempShowAdminOnly(showAdminOnly);
  }, [search, selectedMembers, showAdminOnly]);

  const closeFilter = useCallback(() => {
    onOpenChange(false);
    // Reset temp state to actual state on cancel
    setTempSearch(search);
    setTempSelectedMembers(selectedMembers);
    setTempShowAdminOnly(showAdminOnly);
  }, [search, selectedMembers, showAdminOnly, onOpenChange]);

  const applyFilters = () => {
    onSearchChange(tempSearch);
    onMembersChange(tempSelectedMembers);
    onShowAdminOnlyChange(tempShowAdminOnly);
    onOpenChange(false);
  };

  const clearTempFilters = () => {
    setTempSearch('');
    setTempSelectedMembers([]);
    setTempShowAdminOnly(false);
  };

  // Handle temporary admin only change
  const handleTempShowAdminOnlyChange = (checked: boolean) => {
    setTempShowAdminOnly(checked);
  };

  // Handle temporary member selection
  const handleTempMemberSelect = (memberId: string, checked: boolean) => {
    if (checked) {
      setTempSelectedMembers([...tempSelectedMembers, memberId]);
    } else {
      setTempSelectedMembers(tempSelectedMembers.filter((id) => id !== memberId));
    }
  };

  // Calculate temp active filter count
  const tempActiveFilterCount =
    (tempSearch !== '' ? 1 : 0) +
    (tempSelectedMembers.length > 0 ? 1 : 0) +
    (tempShowAdminOnly ? 1 : 0);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (open) {
          closeFilter();
        }
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, closeFilter]);

  return (
    <>
      {/* Filter Sheet */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/50 md:hidden"
            onClick={closeFilter}
            aria-hidden="true"
          />

          {/* Sheet */}
          <div
            className={cn(
              'fixed bottom-0 left-0 right-0 z-50 bg-background',
              'transform transition-transform duration-300 ease-out',
              'max-h-[85vh] overflow-hidden rounded-t-lg shadow-lg',
              'md:hidden',
              open ? 'translate-y-0' : 'translate-y-full'
            )}
            role="dialog"
            aria-label="Filter options"
            aria-modal="true"
          >
            {/* Header */}
            <div className="sticky top-0 flex items-center justify-between border-b bg-background p-4">
              <h2 className="text-lg font-semibold">
                Filters
                {tempActiveFilterCount > 0 && (
                  <Badge className="ml-2" variant="secondary">
                    {tempActiveFilterCount}
                  </Badge>
                )}
              </h2>
              <Button variant="ghost" size="sm" onClick={closeFilter} aria-label="Close filters">
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-6 p-4">
                {/* Search Input */}
                <div className="space-y-2">
                  <span className="text-sm font-medium">Search Groups</span>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search by group name..."
                      value={tempSearch}
                      onChange={(e) => setTempSearch(e.target.value)}
                      className="pl-9"
                      data-testid="group-search-input"
                    />
                  </div>
                </div>

                {/* Admin Only Filter */}
                <div className="space-y-3">
                  <span className="text-sm font-medium">My Role</span>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="temp-show-admin-only"
                        checked={tempShowAdminOnly}
                        onCheckedChange={(checked) =>
                          handleTempShowAdminOnlyChange(checked as boolean)
                        }
                        data-testid="temp-show-admin-only"
                      />
                      <label
                        htmlFor="temp-show-admin-only"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Groups I am an admin of
                      </label>
                    </div>
                  </div>
                </div>

                {/* Member Selection */}
                <div className="space-y-3">
                  <span className="text-sm font-medium">Filter by Members</span>
                  <div className="max-h-32 space-y-2 overflow-y-auto rounded-md border p-2">
                    {Array.isArray(availableMembers) &&
                      availableMembers.slice(0, 8).map((member) => (
                        <div key={member.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`temp-member-${member.id}`}
                            checked={tempSelectedMembers.includes(member.id)}
                            onCheckedChange={(checked) =>
                              handleTempMemberSelect(member.id, checked as boolean)
                            }
                            data-testid={`temp-member-${member.id}`}
                          />
                          <label
                            htmlFor={`temp-member-${member.id}`}
                            className="truncate text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {member.name || member.email}
                          </label>
                        </div>
                      ))}
                    {availableMembers.length > 8 && (
                      <div className="text-center text-xs text-muted-foreground">
                        +{availableMembers.length - 8} more members...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t bg-background p-4">
              <div className="flex gap-2">
                {tempActiveFilterCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearTempFilters}
                    data-testid="clear-filters"
                    className="flex-1"
                  >
                    Clear All
                  </Button>
                )}
                <Button
                  className="flex-1"
                  onClick={applyFilters}
                  data-testid="apply-filters"
                  size="sm"
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
