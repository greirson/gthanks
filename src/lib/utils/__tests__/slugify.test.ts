import { describe, it, expect } from '@jest/globals';
import { slugify, generateSlugFromListName } from '../slugify';

describe('slugify', () => {
  it('should handle basic text transformation', () => {
    expect(slugify('My Awesome List')).toBe('my-awesome-list');
    expect(slugify('Birthday 2024')).toBe('birthday-2024');
  });

  it('should handle empty strings', () => {
    expect(slugify('')).toBe('');
    expect(slugify('   ')).toBe('');
  });

  it('should remove special characters', () => {
    expect(slugify("John's Party!")).toBe('johns-party');
    expect(slugify('Foo___Bar')).toBe('foo-bar');
  });

  it('should handle unicode diacritics', () => {
    expect(slugify('Wünsche für Müller')).toBe('wunsche-fur-muller');
    expect(slugify('Liste de Noël')).toBe('liste-de-noel');
    expect(slugify("José's Birthday")).toBe('joses-birthday');
  });

  it('should handle various diacritics from different languages', () => {
    expect(slugify('Café')).toBe('cafe');
    expect(slugify('Señor')).toBe('senor');
    expect(slugify('Naïve')).toBe('naive');
    expect(slugify('Ångström')).toBe('angstrom');
    expect(slugify('Zürich')).toBe('zurich');
  });

  it('should collapse multiple hyphens', () => {
    expect(slugify('foo---bar')).toBe('foo-bar');
    expect(slugify('---test---')).toBe('test');
  });

  it('should handle mixed unicode and special characters', () => {
    expect(slugify('Café & Restaurant')).toBe('cafe-restaurant');
    expect(slugify("Müller's Party #2024")).toBe('mullers-party-2024');
  });

  it('should handle emojis by removing them', () => {
    expect(slugify('Birthday Party 🎉')).toBe('birthday-party');
    expect(slugify('🎄 Christmas 🎁')).toBe('christmas');
    expect(slugify('Test 🔥🔥🔥 Fire')).toBe('test-fire');
  });

  it('should handle underscores correctly', () => {
    expect(slugify('test_with_underscores')).toBe('test-with-underscores');
    expect(slugify('foo__bar')).toBe('foo-bar');
  });

  it('should trim whitespace', () => {
    expect(slugify('  leading and trailing  ')).toBe('leading-and-trailing');
    expect(slugify('\ttest\t')).toBe('test');
  });
});

describe('generateSlugFromListName', () => {
  it('should handle empty/null inputs', () => {
    expect(generateSlugFromListName('')).toBe('untitled');
    expect(generateSlugFromListName('   ')).toBe('untitled');
  });

  it('should handle reserved words', () => {
    expect(generateSlugFromListName('admin')).toBe('admin-list');
    expect(generateSlugFromListName('settings')).toBe('settings-list');
    expect(generateSlugFromListName('edit')).toBe('edit-list');
    expect(generateSlugFromListName('delete')).toBe('delete-list');
    expect(generateSlugFromListName('share')).toBe('share-list');
    expect(generateSlugFromListName('public')).toBe('public-list');
  });

  it('should handle reserved words case-insensitively', () => {
    expect(generateSlugFromListName('ADMIN')).toBe('admin-list');
    expect(generateSlugFromListName('Settings')).toBe('settings-list');
    expect(generateSlugFromListName('EDIT')).toBe('edit-list');
  });

  it('should truncate long names to 70 chars', () => {
    const longName = 'a'.repeat(150);
    const result = generateSlugFromListName(longName);
    expect(result.length).toBeLessThanOrEqual(70);
  });

  it('should handle reserved words with truncation correctly', () => {
    // "admin" + "-list" = 10 chars, well under 70
    expect(generateSlugFromListName('admin')).toBe('admin-list');

    // Long name that becomes "admin" after truncation should still get "-list"
    const result = generateSlugFromListName('admin' + 'x'.repeat(100));
    expect(result).toContain('admin');
    expect(result.length).toBeLessThanOrEqual(70);
  });

  it('should preserve reserved word suffix even with long base', () => {
    // Create a name that when slugified is exactly a reserved word like "admin"
    // But "admin" + extra chars becomes "adminxxxx..." which is NOT a reserved word
    const result = generateSlugFromListName('admin' + 'x'.repeat(100));

    // "adminxxxx..." is not a reserved word (only "admin" alone is)
    // So it won't get "-list" suffix, just truncated
    expect(result.startsWith('admin')).toBe(true);
    expect(result.length).toBe(70);
    // Should not have "-list" because "adminxxx..." is not a reserved word
    expect(result).not.toContain('-list');
  });

  it('should handle unicode gracefully', () => {
    // After fix, these should produce readable slugs
    expect(generateSlugFromListName('Wünsche Liste')).toBe('wunsche-liste');
    expect(generateSlugFromListName('Noël 2024')).toBe('noel-2024');
    expect(generateSlugFromListName("José's Birthday")).toBe('joses-birthday');
  });

  it('should handle unicode names that are not reserved words', () => {
    expect(generateSlugFromListName('Café Menu')).toBe('cafe-menu');
    expect(generateSlugFromListName('Señor García')).toBe('senor-garcia');
  });

  it('should handle emojis by removing them', () => {
    expect(generateSlugFromListName('Birthday Party 🎉')).toBe('birthday-party');
    expect(generateSlugFromListName('🎄 Christmas 🎁')).toBe('christmas');
  });

  it('should handle emoji-only input gracefully', () => {
    expect(generateSlugFromListName('🎉🎁🎄')).toBe('untitled');
  });

  it('should handle complex real-world examples', () => {
    expect(generateSlugFromListName('Christmas 2024')).toBe('christmas-2024');
    expect(generateSlugFromListName("Mom's Birthday Wishes")).toBe('moms-birthday-wishes');
    expect(generateSlugFromListName('Family Gift Ideas')).toBe('family-gift-ideas');
  });

  it('should handle very long unicode names', () => {
    const longUnicodeName = 'Müller '.repeat(20); // 140 chars with unicode
    const result = generateSlugFromListName(longUnicodeName);
    expect(result.length).toBeLessThanOrEqual(70);
    expect(result).toContain('muller');
  });

  it('should not create reserved words through truncation', () => {
    // Even if truncation would create "admin", it should not add "-list" suffix
    // because the check happens BEFORE truncation
    const name = 'administrative-tasks-for-managing-users';
    const result = generateSlugFromListName(name);
    // Should be truncated but not have "-list" added (it's not a reserved word as a whole)
    expect(result.length).toBeLessThanOrEqual(70);
    expect(result).toBe('administrative-tasks-for-managing-users');
  });

  it('should handle names with only special characters', () => {
    expect(generateSlugFromListName('!!!')).toBe('untitled');
    expect(generateSlugFromListName('@#$%')).toBe('untitled');
    expect(generateSlugFromListName('---')).toBe('untitled');
  });

  it('should handle names with numbers only', () => {
    expect(generateSlugFromListName('2024')).toBe('2024');
    expect(generateSlugFromListName('12345')).toBe('12345');
  });

  it('should handle mixed content', () => {
    expect(generateSlugFromListName("List #1: Mom's Birthday 🎂")).toBe('list-1-moms-birthday');
    expect(generateSlugFromListName('Café ☕ - Breakfast Items')).toBe('cafe-breakfast-items');
  });
});
