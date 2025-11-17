export interface AvatarFallbackOptions {
  type?: 'user' | 'group';
}

/**
 * Generates consistent avatar fallback text from a name
 * @param name - The name to generate initials from
 * @param options - Configuration options
 * @returns Fallback text (initials or default)
 */
export function getAvatarFallback(
  name: string | null | undefined,
  options: AvatarFallbackOptions = {}
): string {
  const { type = 'user' } = options;

  // Handle null/undefined/empty cases
  if (!name || !name.trim()) {
    return type === 'group' ? 'G' : '?';
  }

  // Clean and split the name
  const cleanName = name.trim().replace(/\s+/g, ' ');
  const words = cleanName.split(' ').filter((word) => word.length > 0);

  if (words.length === 0) {
    return type === 'group' ? 'G' : '?';
  }

  // Generate initials
  if (words.length === 1) {
    // Single word: take first character
    return words[0].charAt(0).toUpperCase();
  } else {
    // Multiple words: first character of first and last word
    const firstInitial = words[0].charAt(0);
    const lastInitial = words[words.length - 1].charAt(0);
    return (firstInitial + lastInitial).toUpperCase();
  }
}
