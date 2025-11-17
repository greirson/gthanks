import NextAuth from 'next-auth';
import type { NextRequest } from 'next/server';

import { authOptions } from '@/lib/auth';

/**
 * NextAuth.js authentication handler for all authentication operations
 *
 * @description Handles all authentication-related requests including sign-in, sign-out, session management, and OAuth callbacks
 * @constant {NextAuthHandler} handler - The configured NextAuth.js handler with all authentication providers and options
 *
 * @public Available authentication endpoints:
 * - GET/POST /api/auth/signin - Authentication sign-in page and credential processing
 * - GET/POST /api/auth/signout - Sign-out confirmation and session termination
 * - GET /api/auth/session - Current user session retrieval
 * - GET /api/auth/providers - Available authentication providers list
 * - GET/POST /api/auth/callback/[provider] - OAuth provider callbacks
 *
 * @security Handles CSRF protection, session management, and secure cookie handling
 * @see {@link authOptions} for authentication configuration
 * @see {@link NextAuth} for framework documentation
 */
const handler: (req: NextRequest, ctx: { params: { nextauth: string[] } }) => Promise<Response> =
  NextAuth(authOptions) as (
    req: NextRequest,
    ctx: { params: { nextauth: string[] } }
  ) => Promise<Response>;

/**
 * Handles GET requests for authentication operations
 *
 * @description Processes authentication GET requests including sign-in pages, session data, and provider information
 * @param {NextRequest} request - The incoming HTTP request object
 * @returns {Promise<NextResponse>} Authentication response (HTML pages, JSON data, or redirects)
 *
 * @throws {400} Bad Request - Invalid authentication parameters
 * @throws {401} Unauthorized - Authentication failure
 * @throws {500} Internal Server Error - Authentication system errors
 *
 * @example
 * // Get current session
 * GET /api/auth/session
 * // Get available providers
 * GET /api/auth/providers
 *
 * @see {@link authOptions} for configuration details
 */
export const GET: (req: NextRequest, ctx: { params: { nextauth: string[] } }) => Promise<Response> =
  handler;

/**
 * Handles POST requests for authentication operations
 *
 * @description Processes authentication POST requests including credential submission, sign-out requests, and OAuth callbacks
 * @param {NextRequest} request - The incoming HTTP request object with authentication data
 * @returns {Promise<NextResponse>} Authentication response (redirects or error responses)
 *
 * @throws {400} Bad Request - Invalid credentials or authentication data
 * @throws {401} Unauthorized - Authentication failure
 * @throws {403} Forbidden - CSRF token validation failure
 * @throws {500} Internal Server Error - Authentication system errors
 *
 * @example
 * // Sign in with credentials
 * POST /api/auth/signin
 * // Sign out current user
 * POST /api/auth/signout
 *
 * @security Includes CSRF protection and secure session handling
 * @see {@link authOptions} for configuration details
 */
export const POST: (
  req: NextRequest,
  ctx: { params: { nextauth: string[] } }
) => Promise<Response> = handler;
