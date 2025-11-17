'use client';

import { Home, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

interface AdminNavigationProps {
  admin: {
    id: string;
    name: string | null;
    email: string;
  };
}

export function AdminNavigation({ admin }: AdminNavigationProps) {
  const pathname = usePathname();

  const navigation = [
    { name: 'Dashboard', href: '/admin', icon: Home },
    { name: 'Users', href: '/admin/users', icon: Users },
  ];

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
      <div className="flex min-h-0 flex-1 flex-col border-r bg-card">
        <div className="flex flex-1 flex-col overflow-y-auto pb-4 pt-5">
          <div className="flex flex-shrink-0 items-center px-4">
            <h1 className="text-xl font-semibold">Admin Panel</h1>
          </div>
          <nav className="mt-5 flex-1 space-y-1 px-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    isActive
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    'group flex items-center rounded-md px-2 py-2 text-sm font-medium'
                  )}
                >
                  <item.icon
                    className={cn(
                      isActive
                        ? 'text-foreground'
                        : 'text-muted-foreground group-hover:text-foreground',
                      'mr-3 h-5 w-5 flex-shrink-0'
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex flex-shrink-0 border-t p-4">
          <div className="flex flex-col">
            <p className="text-sm font-medium text-foreground">{admin.name || 'Admin'}</p>
            <p className="text-xs text-muted-foreground">{admin.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
