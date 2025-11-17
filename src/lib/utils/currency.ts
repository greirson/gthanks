/**
 * Currency formatting utilities
 */

/**
 * Formats a price as USD currency
 * @param price - The price to format (can be number, string, null, or undefined)
 * @returns Formatted currency string (e.g., "$12.99") or null if price is invalid
 */
export function formatPrice(price: number | null | undefined): string | null {
  if (!price) {
    return null;
  }
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(numPrice);
}
