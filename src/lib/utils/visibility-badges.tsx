import { Globe, Users, Lock } from 'lucide-react';

/**
 * Returns the appropriate icon component for a given visibility level.
 * Used for displaying visibility badges across list and group components.
 *
 * @param visibility - The visibility level ('public', 'private', 'password', 'shared')
 * @param className - Optional className for the icon (defaults to 'h-4 w-4')
 * @returns The icon component for the visibility level
 */
export function getVisibilityIcon(visibility: string, className = 'h-4 w-4') {
  switch (visibility.toLowerCase()) {
    case 'public':
      return <Globe className={className} />;
    case 'password':
      return <Lock className={className} />;
    case 'private':
      return <Lock className={className} />;
    case 'shared':
      return <Users className={className} />;
    default:
      return <Lock className={className} />;
  }
}

/**
 * Returns the appropriate color classes for a given visibility level.
 * Supports two color schemes:
 * - 'default': Uses primary colors (green for public, yellow for password, gray for private)
 * - 'muted': Uses muted/subtle colors with borders (success tint for public, muted for private)
 *
 * @param visibility - The visibility level ('public', 'private', 'password')
 * @param scheme - The color scheme to use ('default' or 'muted')
 * @returns Tailwind CSS classes for the visibility badge
 */
export function getVisibilityColor(
  visibility: string,
  scheme: 'default' | 'muted' = 'muted'
): string {
  const vis = visibility.toLowerCase();

  if (scheme === 'default') {
    switch (vis) {
      case 'public':
        return 'bg-green-100 text-green-800';
      case 'password':
        return 'bg-yellow-100 text-yellow-800';
      case 'private':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  // 'muted' scheme
  switch (vis) {
    case 'public':
      return 'bg-success/10 text-success border border-success/20';
    case 'password':
      return 'bg-warning/10 text-warning border border-warning/20';
    case 'private':
    default:
      return 'bg-muted text-muted-foreground';
  }
}

/**
 * Returns the appropriate color classes for a given role.
 * Used for displaying role badges in group member lists.
 *
 * @param role - The user role ('admin', 'member', 'owner')
 * @param variant - The badge variant ('default' or 'muted')
 * @returns Tailwind CSS classes for the role badge
 */
export function getRoleColor(role: string, variant: 'default' | 'muted' = 'muted'): string {
  const roleType = role.toLowerCase();

  if (variant === 'default') {
    switch (roleType) {
      case 'admin':
      case 'owner':
        return 'bg-primary/10 text-primary';
      case 'member':
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  }

  // 'muted' variant with borders
  switch (roleType) {
    case 'admin':
    case 'owner':
      return 'bg-primary/10 text-primary border border-primary/20';
    case 'member':
    default:
      return 'bg-muted text-muted-foreground';
  }
}
