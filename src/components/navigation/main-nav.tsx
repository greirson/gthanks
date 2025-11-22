'use client';

import { Bookmark, Gift, Heart, LogOut, Menu, Shield, User, Users, X } from 'lucide-react';

import { useState } from 'react';

import { signOut } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { ThemeSettings } from '@/components/theme/theme-settings';
import { Button } from '@/components/ui/button';
// Connection status removed for MVP
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';

interface User {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  isAdmin?: boolean;
}

interface MainNavProps {
  user: User;
}

export function MainNav({ user }: MainNavProps) {
  const pathname = usePathname();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut({
        callbackUrl: '/auth/login',
        redirect: true,
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to log out',
        variant: 'destructive',
      });
      setIsLoggingOut(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && isMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  const navItems = [
    {
      href: '/wishes',
      label: 'My Wishes',
      icon: Heart,
      active: pathname.startsWith('/wishes'),
    },
    {
      href: '/lists',
      label: 'My Lists',
      icon: Gift,
      active: pathname.startsWith('/lists'),
    },
    {
      href: '/my-reservations',
      label: 'My Reservations',
      icon: Bookmark,
      active: pathname.startsWith('/my-reservations'),
    },
    {
      href: '/groups',
      label: 'Groups',
      icon: Users,
      active: pathname.startsWith('/groups'),
    },
  ];

  return (
    <nav
      className="border-b border-border bg-background"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/wishes" className="flex items-center gap-2" aria-label="gthanks home">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary"
              aria-hidden="true"
            >
              <Gift className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">gthanks</span>
          </Link>

          {/* Desktop Navigation Links */}
          <div
            className="hidden items-center gap-6 md:flex"
            role="menubar"
            data-testid="desktop-nav"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  aria-current={item.active ? 'page' : undefined}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                    item.active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
                  } `}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
              className="h-11 w-11 p-0"
              data-testid="mobile-menu-toggle"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>

          {/* Desktop User Menu */}
          <div className="hidden md:flex md:items-center md:gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex h-11 items-center gap-2">
                  {user.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt={user.name || 'User'}
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      <span className="text-sm font-medium text-muted-foreground">
                        {(user.name || user.email)[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="hidden md:block">{user.name || 'User'}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <div className="px-2 py-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Theme</span>
                    <ThemeSettings align="end" />
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex w-full items-center">
                    <User className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                {user.isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="flex w-full items-center">
                      <Shield className="mr-2 h-4 w-4" />
                      Admin Dashboard
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void handleLogout()} disabled={isLoggingOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {isLoggingOut ? 'Logging out...' : 'Log out'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
          <nav
            id="mobile-menu"
            className="border-t border-border bg-background md:hidden"
            aria-label="Mobile navigation"
            onKeyDown={handleKeyDown}
            data-testid="mobile-menu"
          >
            <div className="space-y-2 px-4 py-4">
              {/* Mobile Navigation Links */}
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    role="menuitem"
                    aria-current={item.active ? 'page' : undefined}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex min-h-[44px] items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                      item.active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
                    } `}
                    data-testid={`mobile-nav-${item.label.toLowerCase().replace(' ', '-')}`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    {item.label}
                  </Link>
                );
              })}

              {/* Mobile Connection Status */}

              {/* Mobile User Section */}
              <div className="border-t pt-4">
                <div className="flex items-center gap-3 px-4 py-2">
                  {user.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt={user.name || 'User'}
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      <span className="text-sm font-medium text-muted-foreground">
                        {(user.name || user.email)[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">{user.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>

                {/* Mobile Theme Switcher - Task 17.3.4 */}
                <div className="border-t border-border px-4 py-2">
                  <div className="flex min-h-[44px] items-center justify-between">
                    <span className="text-base font-medium text-muted-foreground">Theme</span>
                    <ThemeSettings align="end" className="min-h-[44px] min-w-[44px]" />
                  </div>
                </div>
                <Link
                  href="/settings"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                >
                  <User className="h-5 w-5" />
                  Settings
                </Link>
                {user.isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-4 py-3 text-base font-medium text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                  >
                    <Shield className="h-5 w-5" />
                    Admin Dashboard
                  </Link>
                )}
                <Button
                  variant="ghost"
                  onClick={() => void handleLogout()}
                  disabled={isLoggingOut}
                  className="h-auto min-h-[44px] w-full justify-start gap-3 px-4 py-3 text-base font-medium text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                >
                  <LogOut className="h-5 w-5" />
                  {isLoggingOut ? 'Logging out...' : 'Log out'}
                </Button>
              </div>
            </div>
          </nav>
        )}
      </div>
    </nav>
  );
}
