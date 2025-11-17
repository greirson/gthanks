import { Package } from 'lucide-react';

interface EmptyListStateProps {
  onCreateList?: () => void;
}

export function EmptyListState({ onCreateList }: EmptyListStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-muted p-4">
        <Package className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mb-2 text-lg font-semibold">No lists yet</h3>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">
        Create your first wishlist to start organizing and sharing your gift ideas
      </p>
      {onCreateList && (
        <button onClick={onCreateList} className="text-sm font-medium text-primary hover:underline">
          Create your first list
        </button>
      )}
    </div>
  );
}
