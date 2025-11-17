import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface BulkOperationResult {
  operation: 'delete' | 'add-to-list' | 'remove-from-lists';
  total: number;
  successful: number;
  failed: number;
  skipped?: number;
  errors?: Array<{ wishId: string; error: string }>;
  unauthorizedIds?: string[];
  message?: string;
}

interface BulkOperationDetailsProps {
  result: BulkOperationResult | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkOperationDetails({ result, open, onOpenChange }: BulkOperationDetailsProps) {
  if (!result) {
    return null;
  }

  const hasPartialSuccess =
    result.successful > 0 && (result.failed > 0 || (result.skipped ?? 0) > 0);
  const hasCompleteFailure = result.successful === 0 && result.total > 0;

  const getOperationTitle = () => {
    switch (result.operation) {
      case 'delete':
        return 'Delete Operation Results';
      case 'add-to-list':
        return 'Add to List Results';
      case 'remove-from-lists':
        return 'Remove from Lists Results';
    }
  };

  const getIcon = () => {
    if (hasCompleteFailure) {
      return <XCircle className="h-5 w-5 text-destructive" />;
    }
    if (hasPartialSuccess) {
      return <AlertCircle className="h-5 w-5 text-warning" />;
    }
    return <CheckCircle2 className="h-5 w-5 text-success" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            {getOperationTitle()}
          </DialogTitle>
          <DialogDescription>
            {hasPartialSuccess && 'Some items could not be processed'}
            {hasCompleteFailure && 'The operation could not be completed'}
            {!hasPartialSuccess && !hasCompleteFailure && 'Operation completed successfully'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total items:</span>
              <span className="font-medium">{result.total}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Successful:</span>
              <span className="font-medium text-success">{result.successful}</span>
            </div>
            {result.skipped !== undefined && result.skipped > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Skipped:</span>
                <span className="font-medium text-warning">{result.skipped}</span>
              </div>
            )}
            {result.failed > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Failed:</span>
                <span className="font-medium text-destructive">{result.failed}</span>
              </div>
            )}
          </div>

          {/* Detailed errors */}
          {result.unauthorizedIds && result.unauthorizedIds.length > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <p className="mb-2 font-medium">Unauthorized items:</p>
                <ScrollArea className="h-24">
                  <ul className="space-y-1 text-xs">
                    {result.unauthorizedIds.map((id) => (
                      <li key={id} className="font-mono">
                        {id}
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </AlertDescription>
            </Alert>
          )}

          {result.errors && result.errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="mb-2 font-medium">Errors encountered:</p>
                <ScrollArea className="h-24">
                  <ul className="space-y-2 text-xs">
                    {result.errors.map((error, index) => (
                      <li key={`${error.wishId}-${index}`}>
                        <span className="font-mono">{error.wishId}:</span> {error.error}
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </AlertDescription>
            </Alert>
          )}

          {/* Custom message */}
          {result.message && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
