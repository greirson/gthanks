import { RESERVED_SLUGS } from '@/lib/constants/reserved-words';

/**
 * Converts text to URL-friendly slug format with unicode support
 *
 * @param text - Input text to slugify
 * @returns URL-safe slug with lowercase letters, numbers, and hyphens only
 *
 * @example
 * slugify('My Awesome List!') // 'my-awesome-list'
 * slugify('  Birthday 2024  ') // 'birthday-2024'
 * slugify('foo___bar') // 'foo-bar'
 * slugify('---test---') // 'test'
 * slugify('Wünsche für Müller') // 'wunsche-fur-muller'
 * slugify('Liste de Noël') // 'liste-de-noel'
 */
export function slugify(text: string): string {
  return text
    .normalize('NFD') // Normalize unicode to decomposed form
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics (accents)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars except spaces and hyphens
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+/, '') // Remove leading hyphens
    .replace(/-+$/, ''); // Remove trailing hyphens
}

/**
 * Generate a URL-safe slug from a list name with reserved word protection
 *
 * @param name - The list name to convert to a slug
 * @returns URL-safe slug truncated to 70 chars, or 'untitled' if empty
 *
 * @example
 * generateSlugFromListName('Christmas 2024') // 'christmas-2024'
 * generateSlugFromListName('') // 'untitled'
 * generateSlugFromListName('admin') // 'admin-list'
 * generateSlugFromListName('My Super Long List Name That Goes On Forever') // truncated to 70 chars
 */
export function generateSlugFromListName(name: string): string {
  // 1. Handle empty strings
  if (!name || name.trim() === '') {
    return 'untitled';
  }

  // 2. Use existing slugify function
  let slug = slugify(name);

  // 3. If slugify resulted in empty string (e.g., emoji-only or special chars only), return 'untitled'
  if (!slug || slug.trim() === '') {
    return 'untitled';
  }

  // 4. Handle reserved words FIRST (before truncation)
  if (RESERVED_SLUGS.has(slug)) {
    slug = `${slug}-list`;
  }

  // 5. Truncate to 70 characters AFTER handling reserved words
  const MAX_SLUG_LENGTH = 70;
  slug = slug.substring(0, MAX_SLUG_LENGTH);

  return slug;
}
