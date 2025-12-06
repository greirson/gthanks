/**
 * Get client IP address from request headers
 *
 * Priority order (most reliable first):
 * 1. x-real-ip - Set by reverse proxy (most reliable)
 * 2. cf-connecting-ip - Set by Cloudflare
 * 3. x-forwarded-for - First IP (original client when behind trusted proxy)
 *
 * @param headers - Request headers (Headers object or getter function)
 * @returns Client IP address or undefined
 */
export function getClientIp(
  headers: Headers | { get: (name: string) => string | null }
): string | undefined {
  // Reverse proxy typically sets x-real-ip
  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  // Cloudflare sets cf-connecting-ip
  const cfIp = headers.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp.trim();
  }

  // Fallback to x-forwarded-for (first IP is original client)
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0];
    if (firstIp) {
      return firstIp.trim();
    }
  }

  return undefined;
}
