'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Search } from 'lucide-react';

interface GroupFilterPanelProps {
  search: string;
  selectedMembers: string[];
  availableMembers: Array<{ id: string; name: string | null; email: string }>;
  showAdminOnly: boolean;
  onSearchChange: (value: string) => void;
  onMembersChange: (value: string[]) => void;
  onShowAdminOnlyChange: (value: boolean) => void;
  onClearAll: () => void;
  activeFilterCount: number;
  isMobile?: boolean;
  className?: string;
}

export function GroupFilterPanel({
  search,
  selectedMembers,
  availableMembers,
  showAdminOnly,
  onSearchChange,
  onMembersChange,
  onShowAdminOnlyChange,
  onClearAll,
  activeFilterCount,
  isMobile = false,
  className,
}: GroupFilterPanelProps) {
  const handleMemberSelect = (memberId: string, checked: boolean) => {
    if (checked) {
      onMembersChange([...selectedMembers, memberId]);
    } else {
      onMembersChange(selectedMembers.filter((id) => id !== memberId));
    }
  };

  return (
    <div data-testid="group-filter-panel" className={cn('space-y-6 p-4', className)}>
      {/* Search Input */}
      <div className="space-y-2">
        <span className="text-sm font-medium">Search Groups</span>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by group name..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
            data-testid="group-search-input"
          />
        </div>
      </div>

      <div className="border-t pt-4" />

      {/* Admin Only Filter */}
      <div className="space-y-3">
        <span className="text-sm font-medium">My Role</span>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="admin-only"
            checked={showAdminOnly}
            onCheckedChange={(checked) => onShowAdminOnlyChange(checked as boolean)}
            data-testid="admin-only"
          />
          <label
            htmlFor="admin-only"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Groups I am an admin of
          </label>
        </div>
      </div>

      {/* Member Selection - Placeholder Implementation */}
      <div className="space-y-3">
        <span className="text-sm font-medium">Filter by Members</span>
        <div className="text-sm text-muted-foreground">
          Member autocomplete component coming soon...
        </div>
        {/* TODO: Implement member autocomplete/multiselect component */}
        <div className="max-h-32 space-y-2 overflow-y-auto rounded-md border p-2">
          {Array.isArray(availableMembers) &&
            availableMembers.slice(0, 5).map((member) => (
              <div key={member.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`member-${member.id}`}
                  checked={selectedMembers.includes(member.id)}
                  onCheckedChange={(checked) => handleMemberSelect(member.id, checked as boolean)}
                  data-testid={`member-${member.id}`}
                />
                <label
                  htmlFor={`member-${member.id}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {member.name || member.email}
                </label>
              </div>
            ))}
          {availableMembers.length > 5 && (
            <div className="text-center text-xs text-muted-foreground">
              +{availableMembers.length - 5} more members...
            </div>
          )}
        </div>
      </div>

      {/* Clear Filters Button */}
      {activeFilterCount > 0 && (
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClearAll}
            data-testid="clear-filters"
            className="w-full"
          >
            Clear All Filters ({activeFilterCount})
          </Button>
        </div>
      )}

      {/* Apply Button (Mobile Only) */}
      {isMobile && (
        <div className="border-t pt-4">
          <Button className="w-full" data-testid="apply-filters">
            Apply Filters
          </Button>
        </div>
      )}
    </div>
  );
}
