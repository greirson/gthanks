/**
 * URL Simplification Utilities
 *
 * Removes tracking parameters and shortens e-commerce URLs.
 *
 * MAINTENANCE NOTE: Site-specific rules (Amazon, Walmart, etc.) are based on
 * current URL structures. These may require updates if sites change their formats.
 * The generic fallback handles unknown patterns gracefully.
 */

import { logger } from '@/lib/services/logger';

/**
 * Simplifies a product URL by removing unnecessary query parameters and tracking data
 * while preserving the essential product identifier.
 *
 * @param url - The full product URL to simplify
 * @returns Simplified URL with only essential parts, or original URL if simplification fails
 *
 * @example
 * simplifyProductUrl('https://www.amazon.com/dp/B08N5WRWNW?ref=xyz&tag=123')
 * // Returns: 'https://www.amazon.com/dp/B08N5WRWNW'
 */
export function simplifyProductUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return url;
  }

  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    const domain = hostname.replace(/^www\./, '');

    // Apply site-specific simplification rules
    if (domain.includes('amazon.com') || domain.includes('amazon.')) {
      return simplifyAmazonUrl(parsedUrl);
    } else if (domain.includes('walmart.com')) {
      return simplifyWalmartUrl(parsedUrl);
    } else if (domain.includes('target.com')) {
      return simplifyTargetUrl(parsedUrl);
    } else if (domain.includes('etsy.com')) {
      return simplifyEtsyUrl(parsedUrl);
    } else if (domain.includes('ebay.com')) {
      return simplifyEbayUrl(parsedUrl);
    } else if (domain.includes('bestbuy.com')) {
      return simplifyBestBuyUrl(parsedUrl);
    } else if (domain.includes('homedepot.com')) {
      return simplifyHomeDepotUrl(parsedUrl);
    } else if (domain.includes('lowes.com')) {
      return simplifyLowesUrl(parsedUrl);
    } else if (domain.includes('wayfair.com')) {
      return simplifyWayfairUrl(parsedUrl);
    } else {
      // Generic simplification: remove common tracking parameters
      return simplifyGenericUrl(parsedUrl);
    }
  } catch (error) {
    // If URL parsing fails, return original URL
    logger.error('URL simplification error:', error);
    return url;
  }
}

/**
 * Simplifies Amazon product URLs to just domain + /dp/PRODUCT_ID
 *
 * @example
 * amazon.com/Product-Name/dp/B08N5WRWNW/ref=sr_1_4?keywords=xyz&tag=123
 * → amazon.com/dp/B08N5WRWNW
 */
function simplifyAmazonUrl(parsedUrl: URL): string {
  const pathname = parsedUrl.pathname;

  // Extract product ID from various Amazon URL formats:
  // /dp/B08N5WRWNW
  // /gp/product/B08N5WRWNW
  // /Product-Name/dp/B08N5WRWNW/ref=...
  const dpMatch = pathname.match(/\/dp\/([A-Z0-9]{10})/i);
  const gpMatch = pathname.match(/\/gp\/product\/([A-Z0-9]{10})/i);
  const productId = dpMatch?.[1] || gpMatch?.[1];

  if (productId) {
    return `${parsedUrl.protocol}//${parsedUrl.hostname}/dp/${productId}`;
  }

  // If no product ID found, keep path but remove query params
  return `${parsedUrl.protocol}//${parsedUrl.hostname}${parsedUrl.pathname}`;
}

/**
 * Simplifies Walmart URLs to just domain + /ip/NAME/PRODUCT_ID
 */
function simplifyWalmartUrl(parsedUrl: URL): string {
  const pathname = parsedUrl.pathname;

  // Walmart URLs: /ip/Product-Name/12345678
  const ipMatch = pathname.match(/\/ip\/[^/]+\/(\d+)/i);
  if (ipMatch) {
    const productId = ipMatch[1];
    const productName = pathname.split('/ip/')[1]?.split('/')[0];
    if (productName) {
      return `${parsedUrl.protocol}//${parsedUrl.hostname}/ip/${productName}/${productId}`;
    }
  }

  return `${parsedUrl.protocol}//${parsedUrl.hostname}${parsedUrl.pathname}`;
}

/**
 * Simplifies Target URLs to just domain + /p/NAME/-/A-PRODUCT_ID
 */
function simplifyTargetUrl(parsedUrl: URL): string {
  const pathname = parsedUrl.pathname;

  // Target URLs: /p/product-name/-/A-12345678
  const pMatch = pathname.match(/\/p\/[^/]+\/-\/(A-\d+)/i);
  if (pMatch) {
    const productId = pMatch[1];
    const productName = pathname.split('/p/')[1]?.split('/-/')[0];
    if (productName) {
      return `${parsedUrl.protocol}//${parsedUrl.hostname}/p/${productName}/-/${productId}`;
    }
  }

  return `${parsedUrl.protocol}//${parsedUrl.hostname}${parsedUrl.pathname}`;
}

/**
 * Simplifies Etsy URLs to just domain + /listing/PRODUCT_ID
 */
function simplifyEtsyUrl(parsedUrl: URL): string {
  const pathname = parsedUrl.pathname;

  // Etsy URLs: /listing/12345678/product-name
  const listingMatch = pathname.match(/\/listing\/(\d+)/i);
  if (listingMatch) {
    const productId = listingMatch[1];
    return `${parsedUrl.protocol}//${parsedUrl.hostname}/listing/${productId}`;
  }

  return `${parsedUrl.protocol}//${parsedUrl.hostname}${parsedUrl.pathname}`;
}

/**
 * Simplifies eBay URLs to just domain + /itm/PRODUCT_ID
 */
function simplifyEbayUrl(parsedUrl: URL): string {
  const pathname = parsedUrl.pathname;

  // eBay URLs: /itm/12345678 or /itm/Product-Name/12345678
  const itmMatch = pathname.match(/\/itm\/(?:[^/]+\/)?(\d+)/i);
  if (itmMatch) {
    const productId = itmMatch[1];
    return `${parsedUrl.protocol}//${parsedUrl.hostname}/itm/${productId}`;
  }

  return `${parsedUrl.protocol}//${parsedUrl.hostname}${parsedUrl.pathname}`;
}

/**
 * Simplifies Best Buy URLs to just domain + /site/PRODUCT_NAME/PRODUCT_ID.p
 */
function simplifyBestBuyUrl(parsedUrl: URL): string {
  const pathname = parsedUrl.pathname;

  // Best Buy URLs: /site/product-name/12345678.p
  const siteMatch = pathname.match(/\/site\/([^/]+)\/(\d+)\.p/i);
  if (siteMatch) {
    const productName = siteMatch[1];
    const productId = siteMatch[2];
    return `${parsedUrl.protocol}//${parsedUrl.hostname}/site/${productName}/${productId}.p`;
  }

  return `${parsedUrl.protocol}//${parsedUrl.hostname}${parsedUrl.pathname}`;
}

/**
 * Simplifies Home Depot URLs to just domain + /p/PRODUCT_ID
 */
function simplifyHomeDepotUrl(parsedUrl: URL): string {
  const pathname = parsedUrl.pathname;

  // Home Depot URLs: /p/Product-Name/12345678 or /p/12345678
  const pMatch = pathname.match(/\/p\/(?:[^/]+\/)?(\d+)/i);
  if (pMatch) {
    const productId = pMatch[1];
    return `${parsedUrl.protocol}//${parsedUrl.hostname}/p/${productId}`;
  }

  return `${parsedUrl.protocol}//${parsedUrl.hostname}${parsedUrl.pathname}`;
}

/**
 * Simplifies Lowe's URLs to just domain + /pd/PRODUCT_NAME/PRODUCT_ID
 */
function simplifyLowesUrl(parsedUrl: URL): string {
  const pathname = parsedUrl.pathname;

  // Lowe's URLs: /pd/Product-Name/12345678
  const pdMatch = pathname.match(/\/pd\/([^/]+)\/(\d+)/i);
  if (pdMatch) {
    const productName = pdMatch[1];
    const productId = pdMatch[2];
    return `${parsedUrl.protocol}//${parsedUrl.hostname}/pd/${productName}/${productId}`;
  }

  return `${parsedUrl.protocol}//${parsedUrl.hostname}${parsedUrl.pathname}`;
}

/**
 * Simplifies Wayfair URLs to just domain + /pdp/PRODUCT_NAME.html
 */
function simplifyWayfairUrl(parsedUrl: URL): string {
  const pathname = parsedUrl.pathname;

  // Wayfair URLs: /furniture/pdp/product-name-W123456.html or similar
  const pdpMatch = pathname.match(/\/pdp\/[^?]+\.html/i);
  if (pdpMatch) {
    return `${parsedUrl.protocol}//${parsedUrl.hostname}${pdpMatch[0]}`;
  }

  return `${parsedUrl.protocol}//${parsedUrl.hostname}${parsedUrl.pathname}`;
}

/**
 * Generic URL simplification: removes common tracking parameters
 * while preserving essential query params that might be needed for product identification
 */
function simplifyGenericUrl(parsedUrl: URL): string {
  // Common tracking parameters to remove (not exhaustive, but covers most cases)
  const trackingParams = new Set([
    // Analytics and tracking
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'utm_id',
    'gclid',
    'fbclid',
    'msclkid',
    'dclid',
    'gbraid',
    'wbraid',

    // Referral tracking
    'ref',
    'ref_',
    'referer',
    'referrer',
    'source',
    'campaign',

    // Session and user tracking
    'session',
    'session_id',
    'sessionid',
    'sid',
    's_cid',
    'cid',

    // Amazon-specific tracking
    'tag',
    'linkCode',
    'linkId',
    'creativeASIN',
    'creative',
    'ascsubtag',
    'ie',
    'psc',
    'th',
    'pf_rd_r',
    'pf_rd_p',
    'pf_rd_m',
    'pf_rd_s',
    'pf_rd_t',
    'pf_rd_i',
    'pd_rd_r',
    'pd_rd_w',
    'pd_rd_wg',
    'qid',
    'sr',
    'keywords',
    'sprefix',
    'crid',
    'dib',
    'dib_tag',

    // Social media
    'share',
    'shared',
    'smid',
    'sms_source',
    'source_caller',

    // Other common tracking
    '_ga',
    '_gl',
    'mc_cid',
    'mc_eid',
  ]);

  const cleanParams = new URLSearchParams();
  parsedUrl.searchParams.forEach((value, key) => {
    if (!trackingParams.has(key.toLowerCase())) {
      cleanParams.set(key, value);
    }
  });

  const queryString = cleanParams.toString();
  const pathname = parsedUrl.pathname;

  return `${parsedUrl.protocol}//${parsedUrl.hostname}${pathname}${queryString ? '?' + queryString : ''}`;
}
