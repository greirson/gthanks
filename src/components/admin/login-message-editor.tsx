'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { sanitizeLoginMessage } from '@/lib/sanitize-html';
import { AlertCircle } from 'lucide-react';

interface LoginMessageEditorProps {
  initialMessage: string | null;
}

/**
 * Extracts plain text content from HTML (removes tags).
 * Used for character counting.
 */
function extractTextContent(html: string): string {
  if (!html) {
    return '';
  }

  // Remove all HTML tags
  const textOnly = html.replace(/<[^>]*>/g, '');

  // Decode common HTML entities
  const entities: { [key: string]: string } = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
  };

  let decoded = textOnly;
  Object.entries(entities).forEach(([entity, char]) => {
    decoded = decoded.replace(new RegExp(entity, 'g'), char);
  });

  // Handle numeric entities
  decoded = decoded.replace(/&#(\d+);/g, (_match: string, code: string) => {
    return String.fromCharCode(parseInt(code, 10));
  });

  decoded = decoded.replace(/&#x([0-9A-F]+);/gi, (_match: string, code: string) => {
    return String.fromCharCode(parseInt(code, 16));
  });

  return decoded;
}

export function LoginMessageEditor({ initialMessage }: LoginMessageEditorProps) {
  const [message, setMessage] = useState(initialMessage ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Real-time sanitized preview
  const sanitizedPreview = useMemo(() => {
    try {
      return message ? sanitizeLoginMessage(message) : null;
    } catch {
      return null;
    }
  }, [message]);

  // Count TEXT content (not HTML)
  const contentLength = useMemo(() => {
    return extractTextContent(message).length;
  }, [message]);

  // Validation state
  const isTooLong = contentLength > 2000;
  const hasValidationError = Boolean(message && !sanitizedPreview);

  const handleSave = async () => {
    // Client-side validation
    if (isTooLong) {
      toast({
        title: 'Message too long',
        description: 'Text content must be 2000 characters or less',
        variant: 'destructive',
      });
      return;
    }

    if (hasValidationError) {
      toast({
        title: 'Invalid HTML',
        description: 'The HTML contains invalid or disallowed tags',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message || null }),
      });

      if (!res.ok) {
        const data: unknown = await res.json();
        const errorMessage =
          data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
            ? data.error
            : 'Failed to save';
        throw new Error(errorMessage);
      }

      toast({
        title: 'Success',
        description: 'Login message saved successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save message',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    if (
      confirm(
        'Are you sure you want to clear the login message? This will remove it from the login page.'
      )
    ) {
      setMessage('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Editor */}
      <div>
        <label htmlFor="message-editor" className="text-sm font-medium">
          HTML Content
        </label>
        <p className="mb-2 mt-1 text-xs text-muted-foreground">
          Allowed tags: p, br, strong, em, a, ul, ol, li, h1-h6. Links automatically get security
          attributes.
        </p>
        <Textarea
          id="message-editor"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={10}
          className="font-mono text-sm"
          placeholder="<p>Welcome! Please sign in to continue.</p>"
          disabled={isLoading}
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Content: {contentLength} / 2000 characters
            {isTooLong && (
              <span className="ml-2 font-medium text-destructive">
                ⚠️ Too long! ({contentLength - 2000} over limit)
              </span>
            )}
          </p>
        </div>
        {hasValidationError && (
          <div className="mt-2 flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
            <div className="text-sm">
              <p className="font-medium text-destructive">Invalid HTML</p>
              <p className="mt-1 text-muted-foreground">
                The HTML contains invalid or disallowed tags. Check the allowed tags list above.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Live Preview */}
      <div>
        <p className="text-sm font-medium">Preview (as users will see it)</p>
        <p className="mb-2 mt-1 text-xs text-muted-foreground">
          This is how the message will appear on the login page
        </p>
        <div className="rounded-lg border-l-4 border-blue-500 bg-blue-50 p-4 dark:bg-blue-950">
          {sanitizedPreview ? (
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizedPreview }}
            />
          ) : (
            <p className="text-sm italic text-muted-foreground">
              {message ? 'Invalid HTML (see error above)' : 'No message set'}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          onClick={() => void handleSave()}
          disabled={isLoading || isTooLong || hasValidationError}
          className="w-full sm:w-auto"
        >
          {isLoading ? 'Saving...' : 'Save Message'}
        </Button>
        <Button
          variant="outline"
          onClick={handleClear}
          disabled={isLoading || !message}
          className="w-full sm:w-auto"
        >
          Clear Message
        </Button>
      </div>

      {/* Helper Text */}
      <div className="rounded-md bg-muted p-4">
        <h4 className="mb-2 text-sm font-medium">HTML Tips</h4>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>
            • Use {'<p>'} for paragraphs, {'<strong>'} for bold, {'<em>'} for italics
          </li>
          <li>• Links are automatically secured with rel=&quot;noopener noreferrer&quot;</li>
          <li>
            • Headings: {'<h1>'}, {'<h2>'}, {'<h3>'}, {'<h4>'}, {'<h5>'}, {'<h6>'}
          </li>
          <li>
            • Lists: {'<ul><li>Item</li></ul>'} (unordered), {'<ol><li>Item</li></ol>'} (ordered)
          </li>
          <li>• Scripts, iframes, and event handlers are automatically removed for security</li>
        </ul>
      </div>
    </div>
  );
}
