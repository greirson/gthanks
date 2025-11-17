'use client';

import { Monitor, Moon, Sun } from 'lucide-react';

import { type Theme, useTheme } from '@/components/theme/theme-provider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ThemeSettingsProps {
  align?: 'start' | 'center' | 'end';
  showLabel?: boolean;
  className?: string;
}

export function ThemeSettings({ align = 'end', showLabel = false, className }: ThemeSettingsProps) {
  const { theme, setTheme } = useTheme();

  const themeOptions: Array<{
    value: Theme;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
  }> = [
    {
      value: 'light',
      label: 'Light',
      icon: Sun,
      description: 'Light theme',
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: Moon,
      description: 'Dark theme',
    },
    {
      value: 'system',
      label: 'System',
      icon: Monitor,
      description: 'Follow system preference',
    },
  ];

  const currentOption = themeOptions.find((option) => option.value === theme);
  const Icon = currentOption?.icon || Monitor;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={showLabel ? 'default' : 'icon'}
          className={className}
          aria-label="Theme settings"
        >
          <Icon className="h-4 w-4" />
          {showLabel && <span className="ml-2">{currentOption?.label || 'Theme'}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-48">
        {themeOptions.map((option) => {
          const OptionIcon = option.icon;
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => setTheme(option.value)}
              className="flex cursor-pointer items-center gap-2"
            >
              <OptionIcon className="h-4 w-4" />
              <div className="flex flex-col">
                <span className="text-sm font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </div>
              {theme === option.value && (
                <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
