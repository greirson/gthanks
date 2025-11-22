import sanitizeHtml from 'sanitize-html';

const MAX_TEXT_LENGTH = 2000;

/**
 * Sanitizes HTML for login messages with strict security controls.
 *
 * Removes:
 * - Script tags
 * - Iframes
 * - Event handlers (onclick, onerror, onload, etc.)
 * - All attributes except specific allowed ones
 * - Unknown/disallowed tags
 *
 * Allows:
 * - Tags: p, br, strong, em, a, ul, ol, li, h1-h6
 * - Link attributes: href, title, target, rel
 * - Forces rel="noopener noreferrer" on all links
 *
 * Enforces:
 * - Text content (HTML markup excluded) must be <= 2000 characters
 *
 * @param html The HTML string to sanitize
 * @returns Sanitized HTML string
 * @throws Error if text content exceeds 2000 characters
 */
export function sanitizeLoginMessage(html: string): string {
  if (!html) {
    return '';
  }

  // Configure sanitize-html with strict security rules
  const sanitized = sanitizeHtml(html, {
    allowedTags: [
      'p',
      'br',
      'strong',
      'em',
      'a',
      'ul',
      'ol',
      'li',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      // All other tags have no attributes allowed (empty array means no attributes)
    },
    // Disallow all classes, styles, and IDs
    allowedClasses: {
      // No classes allowed on any tags
    },
    nonTextTags: ['style', 'script', 'textarea', 'option'],
  });

  // Process links to add security attributes
  let processed = sanitized;
  if (sanitized.includes('<a')) {
    processed = addLinkSecurityAttributes(sanitized);
  }

  // Extract text content and check length
  const textContent = extractTextContent(processed);
  if (textContent.length > MAX_TEXT_LENGTH) {
    throw new Error('Login message text content exceeds 2000 characters');
  }

  return processed;
}

/**
 * Adds rel="noopener noreferrer" to all links for security.
 */
function addLinkSecurityAttributes(html: string): string {
  // Use a simple regex to find all <a> tags and add/update rel attribute
  return html.replace(/<a\s+([^>]*)>/gi, (_match: string, attributes: string): string => {
    // Extract existing attributes
    let href = '';
    let title = '';
    let target = '';

    // Parse attributes with proper type guards
    const hrefMatch = attributes.match(/href=["']([^"']*)["']/i);
    if (hrefMatch && hrefMatch[0]) {
      href = hrefMatch[0];
    }

    const titleMatch = attributes.match(/title=["']([^"']*)["']/i);
    if (titleMatch && titleMatch[0]) {
      title = titleMatch[0];
    }

    const targetMatch = attributes.match(/target=["']([^"']*)["']/i);
    if (targetMatch && targetMatch[0]) {
      target = targetMatch[0];
    }

    // Build new tag with security attributes
    let newTag = '<a';

    if (href) {
      newTag += ` ${href}`;
    }

    if (title) {
      newTag += ` ${title}`;
    }

    if (target) {
      newTag += ` ${target}`;
    }

    // Always add security rel attribute
    newTag += ' rel="noopener noreferrer"';
    newTag += '>';

    return newTag;
  });
}

/**
 * Extracts plain text content from HTML (removes tags).
 */
function extractTextContent(html: string): string {
  // Remove all HTML tags
  const textOnly = html.replace(/<[^>]*>/g, '');
  // Decode HTML entities
  const decoded = decodeHtmlEntities(textOnly);
  return decoded;
}

/**
 * Decodes HTML entities to get actual character count.
 */
function decodeHtmlEntities(text: string): string {
  const textarea = typeof document !== 'undefined' ? document.createElement('textarea') : null;

  if (textarea) {
    // Browser environment
    textarea.innerHTML = text;
    return textarea.value;
  }

  // Node.js environment (for testing)
  // Simple mapping of common entities
  const entities: { [key: string]: string } = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
  };

  let decoded = text;
  Object.entries(entities).forEach(([entity, char]) => {
    decoded = decoded.replace(new RegExp(entity, 'g'), char);
  });

  // Handle numeric entities (decimal)
  decoded = decoded.replace(/&#(\d+);/g, (_match: string, code: string): string => {
    return String.fromCharCode(parseInt(code, 10));
  });

  // Handle numeric entities (hexadecimal)
  decoded = decoded.replace(/&#x([0-9A-F]+);/gi, (_match: string, code: string): string => {
    return String.fromCharCode(parseInt(code, 16));
  });

  return decoded;
}
