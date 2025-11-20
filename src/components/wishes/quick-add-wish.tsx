'use client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { wishesApi } from '@/lib/api/wishes';
import { cn } from '@/lib/utils';
import { WishCreateInput } from '@/lib/validators/wish';
interface QuickAddWishProps {
  className?: string;
  onSuccess?: () => void;
}
/**
 * URL detection function to determine if input is a URL
 */
function isUrl(input: string): boolean {
  const trimmed = input.trim();
  // Check for explicit http(s) protocol
  if (/^https?:\/\//i.test(trimmed)) {
    return true;
  }
  // Check for domain pattern (e.g., amazon.com, shop.example.com)
  if (/^[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}/.test(trimmed)) {
    return true;
  }
  return false;
}
/**
 * Quick add wish component for dashboard
 * Allows users to quickly add a wish by entering either a URL or plain text
 */
export function QuickAddWish({ className, onSuccess }: QuickAddWishProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  // Focus input on mount for immediate usability
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  const createWishMutation = useMutation({
    mutationFn: async (data: WishCreateInput) => {
      return await wishesApi.createWish(data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['wishes'] });
      void queryClient.invalidateQueries({ queryKey: ['wishes', 'count'] });
      setInput('');
      toast({
        title: 'Wish added successfully',
        description: 'Your wish has been added to your wishlist.',
      });
      // Focus the input for quick subsequent additions
      inputRef.current?.focus();
      onSuccess?.();
    },
    onError: (error) => {
      let errorMessage = 'Failed to add wish';
      if (error && typeof error === 'object' && 'response' in error) {
        const response = error.response as { data?: { error?: string } };
        errorMessage = response.data?.error || errorMessage;
      }
      toast({
        title: 'Error adding wish',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void (async () => {
      const trimmedInput = input.trim();
      if (!trimmedInput) {
        return;
      }
      setIsLoading(true);
      try {
        if (isUrl(trimmedInput)) {
          // If it's a URL, normalize it and attempt metadata extraction
          let normalizedUrl = trimmedInput;
          if (!/^https?:\/\//i.test(normalizedUrl)) {
            normalizedUrl = `https://${normalizedUrl}`;
          }

          // Try to extract metadata with enhanced error handling
          try {
            const result = await wishesApi.extractMetadataWithDetails(normalizedUrl);

            // Debug logging - ALWAYS show in development

            if (result.success) {
              // Successful extraction - use the metadata
              const metadata = result.data;
              const wishData = {
                title: metadata.title || normalizedUrl,
                url: normalizedUrl,
                price: metadata.price ? metadata.price : undefined,
                imageUrl: metadata.imageUrl || undefined,
                quantity: 1,
              };
              await createWishMutation.mutateAsync(wishData);
            } else {
              // Extraction failed but we have error details
              const { type, partial } = result.error;

              // Create wish with partial data
              const fallbackTitle = partial?.suggestedTitle || partial?.siteName || normalizedUrl;

              // Show user-friendly message based on error type

              if (type === 'captcha_detected') {
                toast({
                  title: 'Ah crap, fancy anti-bot tools detected',
                  description: `${partial?.siteName || 'This site'} has security that blocks us. Wish saved - you can add the price and details yourself.`,
                });
              } else if (type === 'timeout') {
                toast({
                  title: 'Site took too long to respond',
                  description:
                    'The website was really slow. Wish saved with the link - you can add details yourself.',
                });
              } else if (type === 'parse_error') {
                toast({
                  title: "Couldn't read the page details",
                  description: `We saved the link for you, but couldn't grab the price or description from ${partial?.siteName || 'this site'}. You can add those yourself.`,
                });
              } else if (type === 'network_error') {
                toast({
                  title: "Couldn't reach that website",
                  description:
                    "The site might be down or blocking us. We saved the link - you'll need to add the price and details manually.",
                });
              } else if (type === 'invalid_url') {
                toast({
                  title: 'Hmm, that URL looks weird',
                  description:
                    'We saved it anyway - you can fix the link and add details yourself.',
                });
              } else {
              }

              await createWishMutation.mutateAsync({
                title: fallbackTitle,
                url: normalizedUrl,
                quantity: 1,
              });
            }
          } catch {
            // Unexpected error - fallback to URL as title

            await createWishMutation.mutateAsync({
              title: normalizedUrl,
              url: normalizedUrl,
              quantity: 1,
            });
          }
        } else {
          // Plain text wish
          await createWishMutation.mutateAsync({
            title: trimmedInput,
            url: null,
            quantity: 1,
          });
        }
      } finally {
        setIsLoading(false);
      }
    })();
  };
  return (
    <form onSubmit={handleSubmit} className={cn('flex gap-2', className)}>
      <Input
        ref={inputRef}
        type="text"
        placeholder="Quick add: paste a URL or type a wish..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        disabled={isLoading}
        className="flex-1"
        aria-label="Quick add wish"
      />
      <Button
        type="submit"
        disabled={!input.trim() || isLoading}
        size="icon"
        className="shrink-0"
        aria-label="Add wish"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
      </Button>
    </form>
  );
}
