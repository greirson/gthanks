/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';
import { metadataExtractor } from '@/lib/scraping/metadata-extractor';
import { logger } from '@/lib/services/logger';

/**
 * Debug API endpoint for URL scraping diagnostics
 *
 * Usage: GET /api/debug-scraper?url=<url-to-test>
 *
 * Returns comprehensive debug information including:
 * - Extracted metadata (title, price, image, etc.)
 * - Raw HTML content (first 50KB for inspection)
 * - HTTP response details
 * - Timing information
 * - Any errors encountered
 *
 * Security: Only available in development mode
 */
export async function GET(request: NextRequest) {
  // Security check: Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Debug endpoint only available in development' },
      { status: 403 }
    );
  }

  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json(
      {
        error: 'Missing required parameter',
        usage: 'GET /api/debug-scraper?url=<url-to-test>',
        example: 'http://localhost:3000/api/debug-scraper?url=https://www.amazon.com/dp/B08N5WRWNW',
      },
      { status: 400 }
    );
  }

  const startTime = Date.now();
  const debugInfo: Record<string, unknown> = {
    requestedUrl: url,
    timestamp: new Date().toISOString(),
  };

  try {
    // Step 1: Validate URL
    console.log('🔍 [DEBUG SCRAPER] Starting debug for:', url);
    debugInfo.urlValidation = 'pending';

    // Parse URL to check format
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
      debugInfo.urlValidation = 'valid';
      debugInfo.urlParts = {
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        pathname: parsedUrl.pathname,
        search: parsedUrl.search,
      };
    } catch (e) {
      debugInfo.urlValidation = 'invalid';
      debugInfo.urlError = e instanceof Error ? e.message : String(e);
      logger.error({ error: e }, '❌ [DEBUG SCRAPER] Invalid URL format');
      return NextResponse.json(debugInfo, { status: 400 });
    }

    // Step 2: Fetch the URL with detailed error handling
    console.log('🌐 [DEBUG SCRAPER] Fetching URL...');
    debugInfo.fetchStartTime = Date.now();

    let response: Response;
    let html: string;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      response = await fetch(url, {
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
        },
      });

      clearTimeout(timeoutId);

      debugInfo.fetchEndTime = Date.now();
      debugInfo.fetchDuration = debugInfo.fetchEndTime - debugInfo.fetchStartTime;

      // Capture response details
      debugInfo.response = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        url: response.url, // Final URL after redirects
        redirected: response.redirected,
      };

      console.log(`📥 [DEBUG SCRAPER] Response: ${response.status} ${response.statusText}`);
      console.log(`⏱️  [DEBUG SCRAPER] Fetch duration: ${String(debugInfo.fetchDuration)}ms`);

      if (!response.ok) {
        debugInfo.fetchSuccess = false;
        debugInfo.error = `HTTP ${response.status}: ${response.statusText}`;
        console.error('❌ [DEBUG SCRAPER] HTTP error:', debugInfo.error);
        return NextResponse.json(debugInfo, { status: response.status });
      }

      debugInfo.fetchSuccess = true;

      // Get HTML content
      html = await response.text();
      debugInfo.contentLength = html.length;
      console.log(`📄 [DEBUG SCRAPER] HTML length: ${html.length} characters`);

      // Store raw HTML (truncated for safety - first 50KB)
      const MAX_HTML_PREVIEW = 50000;
      debugInfo.rawHtml = html.substring(0, MAX_HTML_PREVIEW);
      if (html.length > MAX_HTML_PREVIEW) {
        debugInfo.rawHtmlTruncated = true;
        debugInfo.rawHtmlNote = `HTML truncated to first ${MAX_HTML_PREVIEW} characters (original: ${html.length})`;
      }
    } catch (e) {
      debugInfo.fetchSuccess = false;
      debugInfo.fetchError = e instanceof Error ? e.message : String(e);
      debugInfo.fetchErrorType = e instanceof Error ? e.name : typeof e;

      if (e instanceof Error && e.name === 'AbortError') {
        debugInfo.error = 'Request timeout (10 seconds)';
        logger.error('⏱️  [DEBUG SCRAPER] Timeout error');
      } else {
        debugInfo.error = debugInfo.fetchError;
        logger.error({ error: e }, '❌ [DEBUG SCRAPER] Fetch error');
      }

      return NextResponse.json(debugInfo, { status: 500 });
    }

    // Step 3: Extract metadata using existing extractor with detailed results
    console.log('🔍 [DEBUG SCRAPER] Extracting metadata...');
    debugInfo.extractionStartTime = Date.now();

    const extractionResult = await metadataExtractor.extractWithDetails(url);

    debugInfo.extractionEndTime = Date.now();
    debugInfo.extractionDuration = debugInfo.extractionEndTime - debugInfo.extractionStartTime;

    debugInfo.extractionResult = extractionResult;
    debugInfo.metadata = extractionResult.data || null;
    debugInfo.metadataSuccess = extractionResult.success;
    debugInfo.metadataWarning = extractionResult.warning || null;
    debugInfo.metadataError = extractionResult.error || null;

    console.log('✅ [DEBUG SCRAPER] Metadata extraction complete');
    console.log('📊 [DEBUG SCRAPER] Result:', JSON.stringify(extractionResult, null, 2));

    // Step 4: Calculate total duration
    const endTime = Date.now();
    debugInfo.totalDuration = endTime - startTime;

    console.log(`⏱️  [DEBUG SCRAPER] Total duration: ${String(debugInfo.totalDuration)}ms`);
    console.log('✅ [DEBUG SCRAPER] Debug complete\n');

    // Return comprehensive debug information
    return NextResponse.json(
      {
        success: true,
        ...debugInfo,
        instructions: {
          copyRawHtml: 'Copy the rawHtml field to inspect the HTML structure',
          checkMetadata: 'Check the metadata field to see what was extracted',
          checkWarning: 'Check metadataWarning for cases where data was extracted despite CAPTCHA',
          checkError: 'Check metadataError for extraction failures with partial data suggestions',
          timing: 'Review fetchDuration and extractionDuration for performance issues',
          headers: 'Check response.headers for content-type and other server info',
        },
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error({ error: error }, '❌ [DEBUG SCRAPER] Unexpected error');

    debugInfo.success = false;
    debugInfo.unexpectedError = error instanceof Error ? error.message : String(error);
    debugInfo.errorStack = error instanceof Error ? error.stack : undefined;

    return NextResponse.json(debugInfo, { status: 500 });
  }
}
