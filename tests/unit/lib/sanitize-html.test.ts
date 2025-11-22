import { sanitizeLoginMessage } from '@/lib/sanitize-html';

describe('sanitizeLoginMessage', () => {
  describe('script tag removal', () => {
    it('removes script tags completely', () => {
      const dirty = '<script>alert("xss")</script><p>Safe</p>';
      const clean = sanitizeLoginMessage(dirty);
      expect(clean).not.toContain('script');
      expect(clean).toContain('Safe');
    });

    it('removes multiple script tags', () => {
      const dirty = '<script>alert(1)</script><p>Text</p><script>alert(2)</script>';
      const clean = sanitizeLoginMessage(dirty);
      expect(clean).not.toContain('script');
      expect(clean).toContain('Text');
    });

    it('removes scripts with attributes', () => {
      const dirty = '<script type="text/javascript">evil()</script><p>Good</p>';
      const clean = sanitizeLoginMessage(dirty);
      expect(clean).not.toContain('script');
    });
  });

  describe('iframe blocking', () => {
    it('removes iframe tags', () => {
      const dirty = '<p>Text</p><iframe src="evil.com"></iframe>';
      const clean = sanitizeLoginMessage(dirty);
      expect(clean).not.toContain('iframe');
      expect(clean).toContain('Text');
    });

    it('removes multiple iframes', () => {
      const dirty = '<iframe src="a.com"></iframe><p>Safe</p><iframe src="b.com"></iframe>';
      const clean = sanitizeLoginMessage(dirty);
      expect(clean).not.toContain('iframe');
      expect(clean).toContain('Safe');
    });
  });

  describe('event handler removal', () => {
    it('removes onclick attributes', () => {
      const dirty = '<p onclick="alert(1)">Click me</p>';
      const clean = sanitizeLoginMessage(dirty);
      expect(clean).not.toContain('onclick');
      expect(clean).toContain('Click me');
    });

    it('removes onerror attributes', () => {
      const dirty = '<img src="x" onerror="alert(1)" /><p>Safe</p>';
      const clean = sanitizeLoginMessage(dirty);
      expect(clean).not.toContain('onerror');
      expect(clean).not.toContain('img');
    });

    it('removes onload attributes', () => {
      const dirty = '<body onload="evil()"><p>Text</p></body>';
      const clean = sanitizeLoginMessage(dirty);
      expect(clean).not.toContain('onload');
    });

    it('removes onmouseover attributes', () => {
      const dirty = '<p onmouseover="attack()">Hover</p>';
      const clean = sanitizeLoginMessage(dirty);
      expect(clean).not.toContain('onmouseover');
      expect(clean).toContain('Hover');
    });

    it('removes multiple event handlers from same element', () => {
      const dirty = '<p onclick="a()" onerror="b()" onload="c()">Text</p>';
      const clean = sanitizeLoginMessage(dirty);
      expect(clean).not.toContain('onclick');
      expect(clean).not.toContain('onerror');
      expect(clean).not.toContain('onload');
      expect(clean).toContain('Text');
    });
  });

  describe('allowed tags', () => {
    it('preserves paragraph tags', () => {
      const html = '<p>This is a paragraph</p>';
      const clean = sanitizeLoginMessage(html);
      expect(clean).toContain('<p>');
      expect(clean).toContain('</p>');
    });

    it('preserves strong tags', () => {
      const html = '<p><strong>Bold text</strong></p>';
      const clean = sanitizeLoginMessage(html);
      expect(clean).toContain('<strong>');
      expect(clean).toContain('</strong>');
    });

    it('preserves em tags', () => {
      const html = '<p><em>Italic text</em></p>';
      const clean = sanitizeLoginMessage(html);
      expect(clean).toContain('<em>');
      expect(clean).toContain('</em>');
    });

    it('preserves link tags with href', () => {
      const html = '<p><a href="https://example.com">Link</a></p>';
      const clean = sanitizeLoginMessage(html);
      expect(clean).toContain('<a');
      expect(clean).toContain('href="https://example.com"');
      expect(clean).toContain('</a>');
    });

    it('preserves unordered lists', () => {
      const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const clean = sanitizeLoginMessage(html);
      expect(clean).toContain('<ul>');
      expect(clean).toContain('</ul>');
      expect(clean).toContain('<li>');
    });

    it('preserves ordered lists', () => {
      const html = '<ol><li>Item 1</li><li>Item 2</li></ol>';
      const clean = sanitizeLoginMessage(html);
      expect(clean).toContain('<ol>');
      expect(clean).toContain('</ol>');
      expect(clean).toContain('<li>');
    });

    it('preserves h1 through h6 tags', () => {
      const html = '<h1>H1</h1><h2>H2</h2><h3>H3</h3><h4>H4</h4><h5>H5</h5><h6>H6</h6>';
      const clean = sanitizeLoginMessage(html);
      expect(clean).toContain('<h1>');
      expect(clean).toContain('<h2>');
      expect(clean).toContain('<h3>');
      expect(clean).toContain('<h4>');
      expect(clean).toContain('<h5>');
      expect(clean).toContain('<h6>');
    });

    it('preserves br tags', () => {
      const html = '<p>Line 1<br />Line 2</p>';
      const clean = sanitizeLoginMessage(html);
      expect(clean).toContain('<br');
    });
  });

  describe('link safety', () => {
    it('adds rel="noopener noreferrer" to links', () => {
      const html = '<a href="https://example.com">Link</a>';
      const clean = sanitizeLoginMessage(html);
      expect(clean).toContain('rel="noopener noreferrer"');
    });

    it('preserves existing href attribute', () => {
      const html = '<a href="https://example.com">Link</a>';
      const clean = sanitizeLoginMessage(html);
      expect(clean).toContain('href="https://example.com"');
    });

    it('removes javascript: protocol from links', () => {
      const html = '<a href="javascript:alert(1)">Click</a>';
      const clean = sanitizeLoginMessage(html);
      expect(clean).not.toContain('javascript:');
    });

    it('allows target attribute', () => {
      const html = '<a href="https://example.com" target="_blank">Link</a>';
      const clean = sanitizeLoginMessage(html);
      expect(clean).toContain('target="_blank"');
    });

    it('allows title attribute', () => {
      const html = '<a href="https://example.com" title="Example">Link</a>';
      const clean = sanitizeLoginMessage(html);
      expect(clean).toContain('title="Example"');
    });
  });

  describe('character limit (2000 chars text content)', () => {
    it('accepts content under 2000 characters', () => {
      const html = '<p>' + 'a'.repeat(1999) + '</p>';
      const clean = sanitizeLoginMessage(html);
      expect(clean).toBeTruthy();
    });

    it('accepts content exactly 2000 characters', () => {
      const html = '<p>' + 'a'.repeat(2000) + '</p>';
      const clean = sanitizeLoginMessage(html);
      expect(clean).toBeTruthy();
    });

    it('throws error if text content exceeds 2000 characters', () => {
      const html = '<p>' + 'a'.repeat(2001) + '</p>';
      expect(() => sanitizeLoginMessage(html)).toThrow(
        'Login message text content exceeds 2000 characters'
      );
    });

    it('counts text content, not HTML markup', () => {
      // HTML markup shouldn't count toward limit
      const textContent = 'a'.repeat(1900);
      const html = `<p>${textContent}</p><strong>bold</strong><em>italic</em><u>underline</u>`;
      const clean = sanitizeLoginMessage(html);
      expect(clean).toBeTruthy();
    });

    it('counts text across multiple tags correctly', () => {
      const html = '<p>aaa</p><p>bbb</p><p>ccc</p>';
      // Total text = 9 chars
      const clean = sanitizeLoginMessage(html);
      expect(clean).toBeTruthy();
    });

    it('throws error when total text across tags exceeds 2000', () => {
      const html =
        '<p>' +
        'a'.repeat(1000) +
        '</p><p>' +
        'b'.repeat(1000) +
        '</p><p>' +
        'c'.repeat(100) +
        '</p>';
      // Total = 2100 chars
      expect(() => sanitizeLoginMessage(html)).toThrow(
        'Login message text content exceeds 2000 characters'
      );
    });
  });

  describe('double-encoding prevention', () => {
    it('handles HTML entities without double-encoding', () => {
      const html = '<p>Test &amp; Example</p>';
      const clean = sanitizeLoginMessage(html);
      // Should not double-encode
      expect(clean).toContain('&amp;');
      expect(clean).not.toContain('&amp;amp;');
    });

    it('handles already-encoded characters', () => {
      const html = '<p>Test &lt;tag&gt; here</p>';
      const clean = sanitizeLoginMessage(html);
      expect(clean).toContain('&lt;');
      expect(clean).toContain('&gt;');
    });

    it('handles mixed plain and encoded text', () => {
      const html = '<p>Hello &amp; goodbye</p>';
      const clean = sanitizeLoginMessage(html);
      expect(clean).toContain('Hello');
      expect(clean).toContain('goodbye');
    });
  });

  describe('edge cases', () => {
    it('handles empty string', () => {
      const clean = sanitizeLoginMessage('');
      expect(clean).toBe('');
    });

    it('handles plain text without HTML', () => {
      const clean = sanitizeLoginMessage('Just plain text');
      expect(clean).toBeTruthy();
    });

    it('handles nested tags', () => {
      const html = '<p><strong><em>Bold and italic</em></strong></p>';
      const clean = sanitizeLoginMessage(html);
      expect(clean).toContain('<strong>');
      expect(clean).toContain('<em>');
      expect(clean).toContain('Bold and italic');
    });

    it('removes style attributes', () => {
      const html = '<p style="color: red; font-size: 100px;">Text</p>';
      const clean = sanitizeLoginMessage(html);
      expect(clean).not.toContain('style');
      expect(clean).toContain('Text');
    });

    it('removes class attributes', () => {
      const html = '<p class="danger alert">Text</p>';
      const clean = sanitizeLoginMessage(html);
      expect(clean).not.toContain('class');
      expect(clean).toContain('Text');
    });

    it('removes data attributes', () => {
      const html = '<p data-evil="value">Text</p>';
      const clean = sanitizeLoginMessage(html);
      expect(clean).not.toContain('data-');
      expect(clean).toContain('Text');
    });

    it('removes unknown tags', () => {
      const html = '<p>Text</p><unknown>Should be removed</unknown>';
      const clean = sanitizeLoginMessage(html);
      expect(clean).toContain('Text');
      expect(clean).not.toContain('unknown');
    });

    it('handles whitespace and newlines', () => {
      const html = `
        <p>
          Text with
          newlines
        </p>
      `;
      const clean = sanitizeLoginMessage(html);
      expect(clean).toBeTruthy();
      expect(clean).toContain('Text');
    });
  });

  describe('complex real-world examples', () => {
    it('sanitizes admin message with formatting', () => {
      const html = `
        <h2>Important Update</h2>
        <p>We're upgrading our systems this <strong>Saturday</strong>.</p>
        <p>Please <a href="https://status.example.com">check our status page</a> for details.</p>
        <ul>
          <li>Maintenance window: 2am - 4am UTC</li>
          <li>All features will be offline</li>
        </ul>
      `;
      const clean = sanitizeLoginMessage(html);
      expect(clean).toContain('<h2>');
      expect(clean).toContain('<strong>');
      expect(clean).toContain('href=');
      expect(clean).toContain('<ul>');
      expect(clean).not.toContain('script');
      expect(clean).not.toContain('onclick');
    });

    it('rejects XSS attempt with script in attributes', () => {
      const html = '<p onmouseover="fetch(\'https://evil.com\')">Hover me</p>';
      const clean = sanitizeLoginMessage(html);
      expect(clean).not.toContain('onmouseover');
      expect(clean).not.toContain('fetch');
    });

    it('blocks iframe embed attempt', () => {
      const html = `
        <p>Check this out:</p>
        <iframe src="https://malicious.com"></iframe>
      `;
      const clean = sanitizeLoginMessage(html);
      expect(clean).not.toContain('iframe');
    });

    it('handles mixed safe and unsafe content', () => {
      const html = `
        <h3>Welcome!</h3>
        <p>Please <a href="https://gthanks.app/login">login here</a>.</p>
        <script>alert('xss')</script>
        <p>Best regards, <strong>The Team</strong></p>
      `;
      const clean = sanitizeLoginMessage(html);
      expect(clean).toContain('<h3>');
      expect(clean).toContain('href=');
      expect(clean).toContain('<strong>');
      expect(clean).not.toContain('script');
      expect(clean).not.toContain('alert');
    });
  });
});
