const { ALLOWED_IMAGE_REMOTE_PATTERNS } = require('./src/lib/config/allowed-domains.js');

/**
 * Security headers configuration for gthanks MVP
 * These headers provide essential security protections for production deployment
 *
 * Environment-aware configuration:
 * - Development: Includes 'unsafe-eval' for Next.js webpack HMR
 * - Production: Removes 'unsafe-eval' for better security
 */

// Detect environment for CSP configuration
const isDevelopment = process.env.NODE_ENV === 'development';

// Build script-src directive based on environment
// Development needs 'unsafe-eval' for webpack Hot Module Reloading
// Production removes it for security
const scriptSrc = isDevelopment
  ? "'self' 'unsafe-inline' 'unsafe-eval'"  // Dev: Allow eval for webpack HMR
  : "'self' 'unsafe-inline'";                // Prod: Block eval for security

const securityHeaders = [
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
    // Prevents browsers from MIME-sniffing responses away from declared content-type
    // This reduces exposure to drive-by download attacks
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
    // Prevents clickjacking attacks by only allowing the site to be framed by itself
    // SAMEORIGIN allows the app to use iframes for its own content while blocking external framing
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
    // Forces HTTPS connections for 1 year, including all subdomains
    // Critical for protecting authentication tokens and sensitive data in transit
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
    // Controls how much referrer information is sent with requests
    // Sends full URL to same-origin, only origin to cross-origin HTTPS, nothing to HTTP
  },
  {
    key: 'Content-Security-Policy',
    value: `default-src 'self'; script-src ${scriptSrc}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self'`,
    // Content Security Policy to prevent XSS attacks
    //
    // Environment-aware script-src:
    // - Development: Includes 'unsafe-eval' for Next.js webpack Hot Module Reloading (HMR)
    // - Production: Removes 'unsafe-eval' for better security
    //
    // NOTE: 'unsafe-inline' is used for MVP due to:
    // - Theme switching component (src/components/theme/theme-script.tsx) uses inline script
    // - Tailwind CSS may inject inline styles
    // - POST-MVP TODO: Implement nonce-based CSP to remove 'unsafe-inline'
    //
    // Directive explanations:
    // - default-src 'self': Only allow resources from the same origin by default
    // - script-src: Dynamic based on environment (see scriptSrc variable above)
    // - style-src 'self' 'unsafe-inline': Styles from same origin + inline styles (for Tailwind)
    // - img-src 'self' data: blob: https:: Images from same origin, data URIs, blob URLs (for previews), and any HTTPS source (for wish URLs)
    // - font-src 'self' data:: Fonts from same origin and data URIs
    // - connect-src 'self': API/WebSocket connections only to same origin
  },
];

/**
 * CORS (Cross-Origin Resource Sharing) Configuration
 * 
 * This configuration protects the API from CSRF attacks and controls which origins
 * can access the API endpoints. For the MVP, we use a single origin approach with
 * environment-based configuration.
 * 
 * Configuration options:
 * - CORS_ALLOWED_ORIGIN: Single origin allowed to access the API (defaults to NEXTAUTH_URL)
 * - If not set, falls back to http://localhost:3000 for development
 * 
 * Security considerations:
 * - Credentials are allowed (required for NextAuth session cookies)
 * - Only specific HTTP methods are allowed
 * - Headers are limited to those needed for the application
 */

// Determine the allowed origin for CORS
// Priority: CORS_ALLOWED_ORIGIN > NEXTAUTH_URL > localhost:3000
const allowedOrigin = process.env.CORS_ALLOWED_ORIGIN || 
                     process.env.NEXTAUTH_URL || 
                     'http://localhost:3000';

// CORS headers for API routes
const corsHeaders = [
  {
    key: 'Access-Control-Allow-Credentials',
    value: 'true',
    // Required for NextAuth session cookies to work across origins
  },
  {
    key: 'Access-Control-Allow-Origin',
    value: allowedOrigin,
    // Single origin allowed to access the API
    // For production, this should match your frontend domain (e.g., https://gthanks.app)
  },
  {
    key: 'Access-Control-Allow-Methods',
    value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS',
    // HTTP methods allowed for API requests
    // OPTIONS is included for preflight requests
  },
  {
    key: 'Access-Control-Allow-Headers',
    value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization',
    // Headers that clients are allowed to send
    // Includes standard headers plus those used by NextAuth and the application
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Enable standalone output for Docker deployment
  reactStrictMode: true,
  eslint: {
    // Allow production builds to complete with warnings
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: ALLOWED_IMAGE_REMOTE_PATTERNS,
  },
  experimental: {
    serverComponentsExternalPackages: ['@node-rs/argon2'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
      };
    }
    return config;
  },
  /**
   * Headers configuration for security and CORS
   *
   * Two separate configurations:
   * 1. Security headers applied to all routes
   * 2. CORS headers applied specifically to API routes
   *
   * The order matters - more specific patterns should come after general ones
   */
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Apply CORS headers specifically to API routes
        // This enables cross-origin requests to the API while maintaining security
        source: '/api/:path*',
        headers: corsHeaders,
      },
    ];
  },
  /**
   * Redirects configuration
   *
   * Handles route migrations and legacy URL support
   */
  async redirects() {
    return [
      {
        // Redirect old /profile route to /settings
        // The /profile page was merged into /settings as part of the vanity URL feature
        // This prevents 404 errors for users with bookmarked /profile URLs
        source: '/profile',
        destination: '/settings',
        permanent: true, // 308 redirect (permanent)
      },
    ];
  },
};

module.exports = nextConfig;
