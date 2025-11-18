import { JSDOM } from 'jsdom';
import NodeCache from 'node-cache';
import { z } from 'zod';
import { simplifyProductUrl } from '@/lib/utils/url-simplification';

// Warning constants
const CAPTCHA_WARNING = 'captcha_encountered_but_data_extracted' as const;

export interface ProductMetadata {
  title?: string;
  description?: string;
  price?: {
    amount: number;
    currency: string;
    text: string;
  };
  imageUrl?: string;
  siteName?: string;
}

export interface MetadataExtractionResult {
  success: boolean;
  data?: ProductMetadata;
  warning?: string; // Signals when data was extracted despite challenges (e.g., CAPTCHA page)
  error?: {
    type: 'captcha_detected' | 'network_error' | 'invalid_url' | 'parse_error' | 'timeout';
    message: string;
    url: string;
    partial?: {
      domain?: string;
      siteName?: string;
      suggestedTitle?: string;
    };
  };
}

export class MetadataExtractor {
  private timeout: number = 8000; // 8 seconds - increased for better reliability
  private cache: NodeCache;

  // Blocked domains for security (instead of restrictive allowlist approach)
  // This allows extracting metadata from any legitimate site while maintaining security
  private blockedHosts: Set<string> = new Set([
    // Known malicious or problematic domains can be added here
    // For now, we'll rely on basic security checks (SSRF protection, HTTPS-only, etc.)
  ]);

  constructor() {
    this.cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour
  }

  /**
   * Cache metadata result with domain-specific TTL
   * Amazon: 24 hours (reduce CAPTCHA trigger frequency)
   * Others: 1 hour (standard cache duration)
   */
  private cacheResult(url: string, metadata: ProductMetadata, sanitizedUrl: string): void {
    if (metadata && metadata.title) {
      const parsedUrl = new URL(sanitizedUrl);
      const domain = parsedUrl.hostname;
      const ttl = domain.includes('amazon.com') ? 86400 : 3600; // 24h for Amazon, 1h for others
      this.cache.set(url, metadata, ttl);
    }
  }

  /**
   * Validates that extracted metadata contains useful product information,
   * not just generic site metadata (e.g., "Amazon.com" from CAPTCHA pages)
   *
   * Quality criteria:
   * 1. Title must not be a generic site name
   * 2. Must have at least one additional field (price, description, or image)
   */
  private isQualityMetadata(metadata: ProductMetadata, url: string): boolean {
    if (!metadata || !metadata.title) {return false;}

    try {
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname.replace(/^www\./, '');
      const siteName = hostname.split('.')[0]; // e.g., "amazon" from "amazon.com"

      const titleLower = metadata.title.toLowerCase().trim();

      // Generic title patterns to reject
      const genericPatterns = [
        hostname.toLowerCase(), // "amazon.com"
        siteName.toLowerCase(), // "amazon"
        `${siteName}.com`, // "amazon.com"
        `shop ${siteName}`, // "shop amazon"
        `${siteName}.com: online shopping`, // "amazon.com: online shopping"
      ];

      // If title matches generic pattern, it's not quality data
      for (const pattern of genericPatterns) {
        if (titleLower === pattern || titleLower.startsWith(pattern)) {
          return false;
        }
      }

      // Quality metadata should have title + at least one other field
      const hasAdditionalData = !!(metadata.price || metadata.description || metadata.imageUrl);
      return hasAdditionalData;
    } catch {
      // If URL parsing fails, be conservative and reject
      return false;
    }
  }

  async extract(url: string): Promise<ProductMetadata | null> {
    try {
      // Simplify URL before processing (removes tracking params)
      const simplifiedUrl = simplifyProductUrl(url);

      // Check cache first (use simplified URL as cache key)
      const cached = this.cache.get<ProductMetadata>(simplifiedUrl);
      if (cached) {
        return cached;
      }

      // Validate and sanitize URL
      const sanitizedUrl = await this.validateUrl(simplifiedUrl);
      if (!sanitizedUrl) {
        console.error(`Invalid or blocked URL: ${simplifiedUrl}`);
        return null;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(sanitizedUrl, {
        signal: controller.signal,
        redirect: 'follow', // Allow redirects but we've already validated the initial URL
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          DNT: '1',
          Connection: 'keep-alive',
          'Upgrade-Insecure-Requests': '1', // Browser prefers HTTPS
          'Sec-Fetch-Dest': 'document', // Request is for a document
          'Sec-Fetch-Mode': 'navigate', // User-initiated navigation
          'Sec-Fetch-Site': 'none', // Top-level navigation (not subresource)
          'Sec-Fetch-User': '?1', // User activation indicator
          'Sec-CH-UA': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"', // Client Hints
          'Sec-CH-UA-Mobile': '?0', // Not a mobile device
          'Sec-CH-UA-Platform': '"Windows"', // Platform hint
          Referer: 'https://www.google.com/', // Mimic coming from search engine
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`Failed to fetch ${url}: ${response.status}`);
        return null;
      }

      const html = await response.text();
      const metadata = this.parseMetadata(html, sanitizedUrl);

      // Cache successful results (using simplified URL as key)
      this.cacheResult(simplifiedUrl, metadata, sanitizedUrl);

      return metadata;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`Timeout fetching ${url}`);
      } else {
        console.error(`Error fetching ${url}:`, error);
      }
      return null;
    }
  }

  /**
   * Enhanced extraction method with detailed error reporting
   */
  async extractWithDetails(url: string): Promise<MetadataExtractionResult> {
    try {
      // Simplify URL before processing (removes tracking params)
      const simplifiedUrl = simplifyProductUrl(url);

      // Check cache first (use simplified URL as cache key)
      const cached = this.cache.get<ProductMetadata>(simplifiedUrl);
      if (cached) {
        return { success: true, data: cached };
      }

      // Validate and sanitize URL
      const sanitizedUrl = await this.validateUrl(simplifiedUrl);
      if (!sanitizedUrl) {
        const parsedUrl = new URL(simplifiedUrl);
        return {
          success: false,
          error: {
            type: 'invalid_url',
            message: 'Invalid or blocked URL',
            url: simplifiedUrl,
            partial: {
              domain: parsedUrl.hostname,
            },
          },
        };
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(sanitizedUrl, {
        signal: controller.signal,
        redirect: 'follow',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          DNT: '1',
          Connection: 'keep-alive',
          'Upgrade-Insecure-Requests': '1', // Browser prefers HTTPS
          'Sec-Fetch-Dest': 'document', // Request is for a document
          'Sec-Fetch-Mode': 'navigate', // User-initiated navigation
          'Sec-Fetch-Site': 'none', // Top-level navigation (not subresource)
          'Sec-Fetch-User': '?1', // User activation indicator
          'Sec-CH-UA': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"', // Client Hints
          'Sec-CH-UA-Mobile': '?0', // Not a mobile device
          'Sec-CH-UA-Platform': '"Windows"', // Platform hint
          Referer: 'https://www.google.com/', // Mimic coming from search engine
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const parsedUrl = new URL(sanitizedUrl);
        return {
          success: false,
          error: {
            type: 'network_error',
            message: `HTTP ${response.status}: ${response.statusText}`,
            url: sanitizedUrl,
            partial: {
              domain: parsedUrl.hostname,
            },
          },
        };
      }

      const html = await response.text();

      // CHANGED: Parse metadata BEFORE checking for CAPTCHA
      // This allows us to extract structured data (JSON-LD, meta tags) that may be present
      // even on CAPTCHA pages for SEO purposes
      const metadata = this.parseMetadata(html, sanitizedUrl);

      // Check for CAPTCHA after parsing
      if (this.detectCaptcha(html)) {
        const parsedUrl = new URL(sanitizedUrl);

        // If we extracted quality data despite CAPTCHA, return success with warning
        if (metadata && this.isQualityMetadata(metadata, sanitizedUrl)) {
          this.cacheResult(simplifiedUrl, metadata, sanitizedUrl);
          return {
            success: true,
            data: metadata,
            warning: CAPTCHA_WARNING,
          };
        }

        // No data extracted - return CAPTCHA error
        const suggestedTitle = this.extractTitleFromUrl(sanitizedUrl);
        return {
          success: false,
          error: {
            type: 'captcha_detected',
            message: "Ah crap, this website has fancy tools to stop us from reading it. You'll have to enter the info manually.",
            url: sanitizedUrl,
            partial: {
              domain: parsedUrl.hostname,
              siteName: parsedUrl.hostname.replace(/^www\./, ''),
              suggestedTitle,
            },
          },
        };
      }

      // No CAPTCHA - cache successful results with quality validation
      if (metadata && this.isQualityMetadata(metadata, sanitizedUrl)) {
        this.cacheResult(simplifiedUrl, metadata, sanitizedUrl);
        return { success: true, data: metadata };
      }

      // Parsing succeeded but no useful data
      const parsedUrl = new URL(sanitizedUrl);
      return {
        success: false,
        error: {
          type: 'parse_error',
          message: 'Could not extract product information',
          url: sanitizedUrl,
          partial: {
            domain: parsedUrl.hostname,
            suggestedTitle: this.extractTitleFromUrl(sanitizedUrl),
          },
        },
      };
    } catch (error) {
      const parsedUrl = new URL(url);

      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: {
            type: 'timeout',
            message: 'Request timed out',
            url,
            partial: {
              domain: parsedUrl.hostname,
              suggestedTitle: this.extractTitleFromUrl(url),
            },
          },
        };
      }

      return {
        success: false,
        error: {
          type: 'network_error',
          message: error instanceof Error ? error.message : 'Unknown error',
          url,
          partial: {
            domain: parsedUrl.hostname,
          },
        },
      };
    }
  }

  /**
   * Detects if the HTML response contains CAPTCHA/bot detection
   */
  private detectCaptcha(html: string): boolean {
    const captchaIndicators = [
      'To discuss automated access to Amazon data',
      'api-services-support@amazon.com',
      'Sorry, we just need to make sure you\'re not a robot',
      'Enter the characters you see below',
      'Type the characters you see in this image',
      'validateCaptcha',
      'opfcaptcha',
      '/errors/validateCaptcha',
    ];

    const htmlLower = html.toLowerCase();
    return captchaIndicators.some((indicator) => htmlLower.includes(indicator.toLowerCase()));
  }

  /**
   * Extracts a suggested title from the URL path
   */
  private extractTitleFromUrl(url: string): string {
    try {
      const parsedUrl = new URL(url);
      const pathParts = parsedUrl.pathname.split('/').filter((p) => p && p !== 'dp');

      // For Amazon URLs like /dp/B123, try to use the product ID
      if (pathParts.length > 0) {
        const lastPart = pathParts[pathParts.length - 1];
        // Clean up URL-encoded characters and hyphens
        return lastPart
          .replace(/-/g, ' ')
          .replace(/[_+]/g, ' ')
          .replace(/%20/g, ' ')
          .trim();
      }

      return parsedUrl.hostname;
    } catch {
      return url;
    }
  }

  private parseMetadata(html: string, url: string): ProductMetadata {
    // Extract image URLs from img tags before removing them (to avoid Canvas.Image errors)
    const extractedImageUrl = this.extractImageFromHtml(html, url);

    // Pre-process HTML to remove problematic elements that cause JSDOM parsing errors
    const cleanHtml = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove all style blocks
      .replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi, '') // Remove stylesheet links
      .replace(/<img[^>]*>/gi, ''); // Remove img tags (requires canvas package otherwise)

    const dom = new JSDOM(cleanHtml, {
      runScripts: 'outside-only',
    });
    const document = dom.window.document;
    let metadata: Partial<ProductMetadata> = {};

    try {
      // 1. Try JSON-LD structured data first (most reliable)
      metadata = this.extractJsonLD(document);

      // 2. If essential data missing, try site-specific extractors
      if (!metadata.price || !metadata.title) {
        const hostname = new URL(url).hostname;
        const domain = hostname.replace(/^www\./, '');
        const siteSpecific = this.extractSiteSpecific(document, domain);
        metadata = { ...siteSpecific, ...metadata }; // Prefer JSON-LD data
      }

      // 3. Fill gaps with Open Graph and meta tags
      if (!metadata.title || !metadata.imageUrl) {
        const metaTags = this.extractMetaTags(document);
        metadata = { ...metaTags, ...metadata }; // Prefer previously found data
      }

      // 4. Use regex-extracted image URL if still no image found
      if (!metadata.imageUrl && extractedImageUrl) {
        metadata.imageUrl = extractedImageUrl;
      }

      // Ensure we have at least a title
      if (!metadata.title) {
        return {};
      }

      return {
        title: metadata.title,
        description: metadata.description,
        price: metadata.price,
        imageUrl: metadata.imageUrl,
        siteName: metadata.siteName,
      };
    } catch (error) {
      console.error('Error parsing metadata:', error);
      return {};
    }
  }

  private extractJsonLD(document: Document): Partial<ProductMetadata> {
    // Define safe schema for JSON-LD Product data
    const OfferSchema = z.object({
      price: z.union([z.string(), z.number()]).optional(),
      priceCurrency: z.string().optional(),
      priceSpecification: z.any().optional(),
    });

    const ProductSchema = z.object({
      '@type': z.literal('Product'),
      name: z.string().optional(),
      description: z.string().optional(),
      image: z.unknown().optional(),
      offers: z.union([OfferSchema, z.array(OfferSchema)]).optional(),
    });

    try {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (let i = 0; i < scripts.length; i++) {
        const script = scripts[i];
        const content = script.innerHTML;
        if (!content) {
          continue;
        }

        const rawData = JSON.parse(content);
        const products = Array.isArray(rawData) ? rawData : [rawData];

        for (const item of products) {
          const productResult = ProductSchema.safeParse(item);
          if (productResult.success) {
            const product = productResult.data;
            const offer =
              product.offers &&
              (Array.isArray(product.offers) ? product.offers[0] : product.offers);

            const result: Partial<ProductMetadata> = {
              title: product.name,
              description: product.description,
              imageUrl: this.getImageUrl(product.image),
            };

            if (offer && offer.price) {
              const priceValue =
                typeof offer.price === 'string' ? parseFloat(offer.price) : offer.price;
              if (!isNaN(priceValue)) {
                const priceText = `${offer.priceCurrency || '$'}${priceValue}`;
                result.price = {
                  amount: priceValue,
                  currency: offer.priceCurrency || 'USD',
                  text: priceText,
                };
              }
            }

            return result;
          }
        }
      }
    } catch {
      // Ignore JSON parsing errors
    }
    return {};
  }

  private extractSiteSpecific(document: Document, domain: string): Partial<ProductMetadata> {
    switch (domain) {
      case 'amazon.com':
        return this.extractAmazonData(document);
      case 'walmart.com':
        return this.extractWalmartData(document);
      case 'target.com':
        return this.extractTargetData(document);
      case 'etsy.com':
        return this.extractEtsyData(document);
      default:
        return {};
    }
  }

  private extractAmazonData(document: Document): Partial<ProductMetadata> {
    const titleEl =
      document.querySelector('#productTitle') || document.querySelector('.product-title h1');
    const title = titleEl?.textContent?.trim() || '';

    const priceWholeEl = document.querySelector('.a-price-whole');
    const priceFractionEl = document.querySelector('.a-price-fraction');
    const priceSymbolEl = document.querySelector('.a-price-symbol');

    const priceWhole = priceWholeEl?.textContent?.replace(',', '') || '';
    const priceFraction = priceFractionEl?.textContent || '';
    const priceSymbol = priceSymbolEl?.textContent || '$';

    // Note: Image extraction is now handled by extractImageFromHtml() before JSDOM parsing
    // to avoid Canvas.Image errors. The <img> tags are removed from HTML before this method runs.

    const result: Partial<ProductMetadata> = {};

    if (title) {
      result.title = title;
    }

    if (priceWhole) {
      const amountStr = priceFraction ? `${priceWhole}.${priceFraction}` : priceWhole;
      const amount = parseFloat(amountStr);
      if (!isNaN(amount)) {
        result.price = {
          amount,
          currency: 'USD',
          text: `${priceSymbol}${priceWhole}${priceFraction ? '.' + priceFraction : ''}`,
        };
      }
    }

    return result;
  }

  private extractWalmartData(document: Document): Partial<ProductMetadata> {
    const titleEl =
      document.querySelector('[data-automation-id="product-title"]') ||
      document.querySelector('h1[data-testid="product-title"]');
    const title = titleEl?.textContent?.trim() || '';

    const priceEl =
      document.querySelector('[data-testid="price-current"]') ||
      document.querySelector('[data-automation-id="product-price"]');
    const priceText = priceEl?.textContent?.trim() || '';

    const imageEl =
      document.querySelector('[data-testid="hero-image-container"] img') ||
      document.querySelector('.prod-hero-image img');
    const imageUrl = (imageEl as HTMLImageElement)?.src || '';

    const result: Partial<ProductMetadata> = {};

    if (title) {
      result.title = title;
    }

    if (priceText) {
      const match = priceText.match(/\$?([\d,]+\.?\d*)/);
      if (match) {
        const amount = parseFloat(match[1].replace(',', ''));
        if (!isNaN(amount)) {
          result.price = {
            amount,
            currency: 'USD',
            text: priceText,
          };
        }
      }
    }

    if (imageUrl) {
      result.imageUrl = imageUrl;
    }

    return result;
  }

  private extractTargetData(document: Document): Partial<ProductMetadata> {
    const titleEl =
      document.querySelector('[data-test="product-title"]') ||
      document.querySelector('h1[data-testid="product-title"]');
    const title = titleEl?.textContent?.trim() || '';

    const priceEl =
      document.querySelector('[data-test="product-price"]') ||
      document.querySelector('.price-current');
    const priceText = priceEl?.textContent?.trim() || '';

    const imageEl =
      document.querySelector('[data-testid="product-detail-image"]') ||
      document.querySelector('.slide-image img');
    const imageUrl = (imageEl as HTMLImageElement)?.src || '';

    const result: Partial<ProductMetadata> = {};

    if (title) {
      result.title = title;
    }

    if (priceText) {
      const match = priceText.match(/\$?([\d,]+\.?\d*)/);
      if (match) {
        const amount = parseFloat(match[1].replace(',', ''));
        if (!isNaN(amount)) {
          result.price = {
            amount,
            currency: 'USD',
            text: priceText,
          };
        }
      }
    }

    if (imageUrl) {
      result.imageUrl = imageUrl;
    }

    return result;
  }

  private extractEtsyData(document: Document): Partial<ProductMetadata> {
    const titleEl =
      document.querySelector('[data-test-id="listing-page-title"]') || document.querySelector('h1');
    const title = titleEl?.textContent?.trim() || '';

    const priceEl =
      document.querySelector('.currency-value') || document.querySelector('[data-test-id="price"]');
    const priceText = priceEl?.textContent?.trim() || '';

    const imageEl =
      document.querySelector('[data-test-id="listing-page-image"] img') ||
      document.querySelector('.listing-page-image img');
    const imageUrl = (imageEl as HTMLImageElement)?.src || '';

    const result: Partial<ProductMetadata> = {};

    if (title) {
      result.title = title;
    }

    if (priceText) {
      const match = priceText.match(/([\d,]+\.?\d*)/);
      if (match) {
        const amount = parseFloat(match[1].replace(',', ''));
        if (!isNaN(amount)) {
          result.price = {
            amount,
            currency: 'USD',
            text: priceText,
          };
        }
      }
    }

    if (imageUrl) {
      result.imageUrl = imageUrl;
    }

    return result;
  }

  private extractMetaTags(document: Document): Partial<ProductMetadata> {
    const getMetaContent = (selector: string): string => {
      const meta = document.querySelector(selector);
      return meta?.getAttribute('content') || '';
    };

    const title =
      getMetaContent('meta[property="og:title"]') ||
      getMetaContent('meta[name="twitter:title"]') ||
      document.querySelector('title')?.textContent?.trim() ||
      '';

    const description =
      getMetaContent('meta[property="og:description"]') ||
      getMetaContent('meta[name="description"]') ||
      getMetaContent('meta[name="twitter:description"]');

    const imageUrl =
      getMetaContent('meta[property="og:image"]') || getMetaContent('meta[name="twitter:image"]');

    const siteName = getMetaContent('meta[property="og:site_name"]');

    // Try to extract price from meta tags
    const ogPriceAmount =
      getMetaContent('meta[property="og:price:amount"]') ||
      getMetaContent('meta[property="product:price:amount"]');
    const ogPriceCurrency =
      getMetaContent('meta[property="og:price:currency"]') ||
      getMetaContent('meta[property="product:price:currency"]');

    const result: Partial<ProductMetadata> = {
      title: title || undefined,
      description: description || undefined,
      imageUrl: imageUrl || undefined,
      siteName: siteName || undefined,
    };

    if (ogPriceAmount) {
      const amount = parseFloat(ogPriceAmount);
      if (!isNaN(amount)) {
        result.price = {
          amount,
          currency: ogPriceCurrency || 'USD',
          text: `${ogPriceCurrency || '$'}${amount}`,
        };
      }
    }

    return result;
  }

  private getImageUrl(image: unknown): string | undefined {
    if (typeof image === 'string') {
      return image;
    }
    if (Array.isArray(image) && image.length > 0) {
      const firstImage = image[0];
      if (typeof firstImage === 'string') {
        return firstImage;
      }
      if (firstImage && typeof firstImage === 'object' && 'url' in firstImage) {
        return (firstImage as { url: string }).url;
      }
      return undefined;
    }
    if (image && typeof image === 'object' && 'url' in image) {
      return (image as { url: string }).url;
    }
    return undefined;
  }

  /**
   * Extracts an image URL from raw HTML content using regex patterns.
   * This method is called before JSDOM parsing to avoid Canvas.Image errors
   * and acts as a fallback for image extraction.
   *
   * @param html The raw HTML content of the page
   * @param url The URL of the page, used for site-specific logic
   * @returns The extracted image URL, or undefined if not found
   */
  private extractImageFromHtml(html: string, url: string): string | undefined {
    // Extract image URLs from img tags using regex before JSDOM parsing
    // This avoids Canvas.Image errors while still capturing image data
    const hostname = new URL(url).hostname;
    const domain = hostname.replace(/^www\./, '');

    // Site-specific image extraction patterns
    let imageUrl: string | undefined;

    if (domain === 'amazon.com') {
      // Amazon: Look for product images (src comes BEFORE id/class in Amazon's HTML)
      const patterns = [
        /<img[^>]*src=["']([^"']+)["'][^>]*id=["']landingImage["']/i,
        /<img[^>]*src=["']([^"']+)["'][^>]*data-a-image-name=["']landingImage["']/i,
        /<img[^>]*src=["']([^"']+)["'][^>]*class=["'][^"']*a-dynamic-image/i,
      ];

      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          imageUrl = match[1];
          break;
        }
      }
    } else {
      // Generic: Look for Open Graph image in meta tags (already in HTML)
      const ogImageMatch = html.match(
        /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i
      );
      if (ogImageMatch && ogImageMatch[1]) {
        imageUrl = ogImageMatch[1];
      }
    }

    return imageUrl;
  }

  private async validateUrl(url: string): Promise<string | null> {
    try {
      const parsedUrl = new URL(url);

      // Only allow HTTPS for security
      if (parsedUrl.protocol !== 'https:') {
        if (process.env.NODE_ENV === 'development') {
          console.error(`Only HTTPS URLs are allowed: ${url}`);
        }
        return null;
      }

      // Block private/internal IP ranges to prevent SSRF attacks
      const hostname = parsedUrl.hostname.toLowerCase();

      // Block localhost and loopback
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
        if (process.env.NODE_ENV === 'development') {
          console.error(`Localhost access blocked: ${url}`);
        }
        return null;
      }

      // Block private IP ranges (RFC 1918 and others)
      if (
        hostname.match(/^10\./) ||
        hostname.match(/^192\.168\./) ||
        hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) ||
        hostname.match(/^169\.254\./) || // Link-local addresses
        hostname.startsWith('[fc') || // IPv6 private
        hostname.startsWith('[fd') // IPv6 private
      ) {
        if (process.env.NODE_ENV === 'development') {
          console.error(`Private IP range blocked: ${url}`);
        }
        return null;
      }

      // DNS resolution check to prevent DNS rebinding attacks
      // Skip in development to avoid hanging on slow DNS
      if (process.env.NODE_ENV !== 'development') {
        try {
          const dns = await import('dns').then((m) => m.promises);
          const addresses = await dns.lookup(hostname, { all: true });

          for (const { address } of addresses) {
            if (this.isPrivateIP(address)) {
              console.error(`DNS resolves to private IP: ${hostname} -> ${address}`);
              return null;
            }
          }
        } catch (dnsError) {
          console.error(`DNS resolution failed for ${hostname}:`, dnsError);
          return null;
        }
      }

      // Check if domain is explicitly blocked
      let isBlocked = false;
      this.blockedHosts.forEach((blockedHost) => {
        if (hostname === blockedHost || hostname.endsWith('.' + blockedHost)) {
          isBlocked = true;
        }
      });

      if (isBlocked) {
        if (process.env.NODE_ENV === 'development') {
          console.error(`Domain is blocked: ${hostname}`);
        }
        return null;
      }

      // Additional security check: block suspicious TLDs if needed
      const suspiciousTlds = ['.tk', '.ml', '.ga', '.cf']; // Known free domains often used maliciously
      if (suspiciousTlds.some((tld) => hostname.endsWith(tld))) {
        if (process.env.NODE_ENV === 'development') {
          console.error(`Suspicious TLD blocked: ${hostname}`);
        }
        return null;
      }

      return parsedUrl.toString();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`Invalid URL format: ${url}`, error);
      }
      return null;
    }
  }

  private isPrivateIP(ip: string): boolean {
    // IPv4 private ranges
    if (
      ip.match(/^127\./) || // Loopback
      ip.match(/^10\./) || // Private class A
      ip.match(/^192\.168\./) || // Private class C
      ip.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) || // Private class B
      ip.match(/^169\.254\./) || // Link-local
      ip.match(/^0\./) || // Reserved
      ip === '::1' || // IPv6 loopback
      ip.startsWith('fc') || // IPv6 private
      ip.startsWith('fd')
    ) {
      // IPv6 private
      return true;
    }
    return false;
  }
}

// Export singleton instance
export const metadataExtractor = new MetadataExtractor();
