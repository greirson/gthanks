import { cn } from '@/lib/utils';

interface SkipLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export function SkipLink({ href, children, className }: SkipLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        'sr-only fixed left-4 top-4 z-50 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white focus:not-sr-only',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-600',
        className
      )}
    >
      {children}
    </a>
  );
}
