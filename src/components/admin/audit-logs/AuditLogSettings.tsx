'use client';

import { Loader2, Settings } from 'lucide-react';

import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';

export interface AuditLogSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AuditLogSettingsState {
  authEnabled: boolean;
  userManagementEnabled: boolean;
  contentEnabled: boolean;
  adminEnabled: boolean;
}

interface SettingCategory {
  key: keyof AuditLogSettingsState;
  label: string;
  description: string;
}

const SETTING_CATEGORIES: SettingCategory[] = [
  {
    key: 'authEnabled',
    label: 'Authentication',
    description: 'Login, logout, magic links, OAuth sign-ins',
  },
  {
    key: 'userManagementEnabled',
    label: 'User Management',
    description: 'Profile updates, email changes, account settings',
  },
  {
    key: 'contentEnabled',
    label: 'Content Changes',
    description: 'Wishes, lists, groups, reservations',
  },
  {
    key: 'adminEnabled',
    label: 'Admin Actions',
    description: 'User suspensions, role changes, system settings',
  },
];

const DEFAULT_SETTINGS: AuditLogSettingsState = {
  authEnabled: true,
  userManagementEnabled: true,
  contentEnabled: true,
  adminEnabled: true,
};

export function AuditLogSettings({ open, onOpenChange }: AuditLogSettingsProps) {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AuditLogSettingsState>(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState<AuditLogSettingsState>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Fetch current settings when sheet opens
  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);

    try {
      const response = await fetch('/api/admin/audit-logs/settings');

      if (!response.ok) {
        throw new Error('Failed to load settings');
      }

      const data: unknown = await response.json();

      // Validate response shape
      if (data && typeof data === 'object') {
        const newSettings: AuditLogSettingsState = {
          authEnabled:
            'authEnabled' in data && typeof data.authEnabled === 'boolean'
              ? data.authEnabled
              : DEFAULT_SETTINGS.authEnabled,
          userManagementEnabled:
            'userManagementEnabled' in data && typeof data.userManagementEnabled === 'boolean'
              ? data.userManagementEnabled
              : DEFAULT_SETTINGS.userManagementEnabled,
          contentEnabled:
            'contentEnabled' in data && typeof data.contentEnabled === 'boolean'
              ? data.contentEnabled
              : DEFAULT_SETTINGS.contentEnabled,
          adminEnabled:
            'adminEnabled' in data && typeof data.adminEnabled === 'boolean'
              ? data.adminEnabled
              : DEFAULT_SETTINGS.adminEnabled,
        };
        setSettings(newSettings);
        setOriginalSettings(newSettings);
      }
    } catch (error) {
      setHasError(true);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load audit log settings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (open) {
      void fetchSettings();
    }
  }, [open, fetchSettings]);

  // Handle toggle change
  const handleToggle = useCallback((key: keyof AuditLogSettingsState, checked: boolean) => {
    setSettings((prev) => ({
      ...prev,
      [key]: checked,
    }));
  }, []);

  // Check if settings have changed
  const hasChanges = React.useMemo(() => {
    return (
      settings.authEnabled !== originalSettings.authEnabled ||
      settings.userManagementEnabled !== originalSettings.userManagementEnabled ||
      settings.contentEnabled !== originalSettings.contentEnabled ||
      settings.adminEnabled !== originalSettings.adminEnabled
    );
  }, [settings, originalSettings]);

  // Save settings
  const handleSave = async () => {
    setIsSaving(true);

    try {
      const response = await fetch('/api/admin/audit-logs/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const data: unknown = await response.json();
        const errorMessage =
          data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
            ? data.error
            : 'Failed to save settings';
        throw new Error(errorMessage);
      }

      setOriginalSettings(settings);

      toast({
        title: 'Settings saved',
        description: 'Audit log settings have been updated successfully',
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to original settings when closing without saving
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen && hasChanges) {
        // Reset settings if closing without saving
        setSettings(originalSettings);
      }
      onOpenChange(newOpen);
    },
    [hasChanges, originalSettings, onOpenChange]
  );

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" aria-hidden="true" />
            Audit Log Settings
          </SheetTitle>
          <SheetDescription>
            Configure which events are recorded in the audit log. Disabling a category will stop new
            events from being logged.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden="true" />
              <span className="sr-only">Loading settings...</span>
            </div>
          ) : hasError ? (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-center">
              <p className="text-sm text-destructive">Failed to load settings</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void fetchSettings()}
                className="mt-3"
              >
                Try Again
              </Button>
            </div>
          ) : (
            <div className="space-y-6" role="group" aria-label="Audit log category settings">
              {SETTING_CATEGORIES.map((category) => (
                <div
                  key={category.key}
                  className="flex items-start justify-between gap-4 rounded-lg border p-4"
                >
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor={`setting-${category.key}`}
                      className="text-sm font-medium leading-none"
                    >
                      {category.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  </div>
                  <Switch
                    id={`setting-${category.key}`}
                    checked={settings[category.key]}
                    onCheckedChange={(checked) => handleToggle(category.key, checked)}
                    disabled={isSaving}
                    aria-describedby={`setting-${category.key}-description`}
                  />
                  <span id={`setting-${category.key}-description`} className="sr-only">
                    {category.description}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <SheetFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} disabled={isSaving || isLoading || !hasChanges}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
