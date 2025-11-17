'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { useState } from 'react';

import { ScrollArea } from '@/components/ui/scroll-area';
import { ThemeButton } from '@/components/ui/theme-button';
import { listsApi } from '@/lib/api/lists';
import { ListWithOwner } from '@/lib/validators/api-responses/lists';

interface ListSelectorProps {
  onSelect: (list: ListWithOwner) => void;
  onCancel: () => void;
  excludeListIds?: string[];
}

export function ListSelector({ onSelect, onCancel, excludeListIds = [] }: ListSelectorProps) {
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  // Fetch user's lists
  const { data: listsResult, isLoading } = useQuery({
    queryKey: ['lists'],
    queryFn: () => listsApi.getLists(),
  });

  const lists = listsResult?.items.filter((list) => !excludeListIds.includes(list.id)) || [];

  const handleSubmit = () => {
    const selectedList = lists.find((list) => list.id === selectedListId);
    if (selectedList) {
      onSelect(selectedList);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (lists.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="mb-4 text-muted-foreground">You don&apos;t have any lists yet.</p>
        <ThemeButton variant="outline" onClick={onCancel}>
          Close
        </ThemeButton>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ScrollArea className="h-[300px] rounded-md border p-4">
        <div className="space-y-2">
          {lists.map((list) => (
            <label
              key={list.id}
              className="flex cursor-pointer items-center space-x-3 rounded p-2 hover:bg-accent"
            >
              <input
                type="radio"
                name="list"
                value={list.id}
                checked={selectedListId === list.id}
                onChange={() => setSelectedListId(list.id)}
                className="h-4 w-4"
              />
              <div className="flex-1">
                <p className="font-medium">{list.name}</p>
                {list.description && (
                  <p className="text-sm text-muted-foreground">{list.description}</p>
                )}
              </div>
            </label>
          ))}
        </div>
      </ScrollArea>

      <div className="flex justify-end gap-2">
        <ThemeButton variant="outline" onClick={onCancel}>
          Cancel
        </ThemeButton>
        <ThemeButton onClick={handleSubmit} disabled={!selectedListId}>
          Add to List
        </ThemeButton>
      </div>
    </div>
  );
}
