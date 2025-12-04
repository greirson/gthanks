'use client';

import { Download, FileJson, FileText, Loader2 } from 'lucide-react';

import * as React from 'react';
import { useCallback, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';

export interface AuditLogExportFilters {
  category?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  actorId?: string;
}

export interface AuditLogExportProps {
  filters: AuditLogExportFilters;
  disabled?: boolean;
}

type ExportFormat = 'csv' | 'json';

/**
 * Build the export URL with current filters applied
 */
function buildExportUrl(format: ExportFormat, filters: AuditLogExportFilters): string {
  const url = new URL('/api/admin/audit-logs/export', window.location.origin);
  url.searchParams.set('format', format);

  // Apply current filters to export
  if (filters.category) {
    url.searchParams.set('category', filters.category);
  }
  if (filters.startDate) {
    url.searchParams.set('startDate', filters.startDate);
  }
  if (filters.endDate) {
    url.searchParams.set('endDate', filters.endDate);
  }
  if (filters.search) {
    url.searchParams.set('search', filters.search);
  }
  if (filters.actorId) {
    url.searchParams.set('actorId', filters.actorId);
  }

  return url.toString();
}

/**
 * Extract filename from Content-Disposition header or generate default
 */
function getFilenameFromResponse(response: Response, format: ExportFormat): string {
  const contentDisposition = response.headers.get('Content-Disposition');
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
    if (match) {
      return match[1];
    }
  }

  // Fallback filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `audit-logs-${timestamp}.${format}`;
}

/**
 * Dropdown menu with export options for downloading audit logs as CSV or JSON.
 * Applies current filters to the export to maintain consistency with the displayed data.
 */
export function AuditLogExport({ filters, disabled = false }: AuditLogExportProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat | null>(null);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      setIsExporting(true);
      setExportFormat(format);

      try {
        const url = buildExportUrl(format, filters);
        const response = await fetch(url);

        if (!response.ok) {
          // Try to extract error message from response
          let errorMessage = 'Failed to export audit logs';

          if (response.status === 429) {
            errorMessage = 'Export limit reached. Please wait before trying again.';
          } else if (response.status === 401) {
            errorMessage = 'Please sign in to export audit logs';
          } else if (response.status === 403) {
            errorMessage = 'You do not have permission to export audit logs';
          } else {
            try {
              const data: unknown = await response.json();
              if (
                data &&
                typeof data === 'object' &&
                'error' in data &&
                typeof data.error === 'string'
              ) {
                errorMessage = data.error;
              }
            } catch {
              // Ignore JSON parsing errors, use default message
            }
          }

          throw new Error(errorMessage);
        }

        // Get the blob data
        const blob = await response.blob();
        const filename = getFilenameFromResponse(response, format);

        // Create a download link and trigger download
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up the object URL
        URL.revokeObjectURL(downloadUrl);

        toast({
          title: 'Export complete',
          description: `Audit logs have been downloaded as ${format.toUpperCase()}`,
        });
      } catch (error) {
        toast({
          title: 'Export failed',
          description: error instanceof Error ? error.message : 'Failed to export audit logs',
          variant: 'destructive',
        });
      } finally {
        setIsExporting(false);
        setExportFormat(null);
      }
    },
    [filters, toast]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled || isExporting}
          data-testid="audit-log-export-button"
        >
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              Export
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => void handleExport('csv')}
          disabled={isExporting}
          data-testid="export-csv-option"
        >
          <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
          <span>Export as CSV</span>
          {isExporting && exportFormat === 'csv' && (
            <Loader2 className="ml-auto h-4 w-4 animate-spin" aria-hidden="true" />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => void handleExport('json')}
          disabled={isExporting}
          data-testid="export-json-option"
        >
          <FileJson className="mr-2 h-4 w-4" aria-hidden="true" />
          <span>Export as JSON</span>
          {isExporting && exportFormat === 'json' && (
            <Loader2 className="ml-auto h-4 w-4 animate-spin" aria-hidden="true" />
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
