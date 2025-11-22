'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';

interface ReserveDialogProps {
  wish: { id: string; title: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReserveDialog({ wish, open, onOpenChange }: ReserveDialogProps) {
  const { data: session } = useSession();
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Determine available OAuth providers from environment
  const availableProviders = {
    google: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    facebook: !!process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID,
    apple: !!process.env.NEXT_PUBLIC_APPLE_CLIENT_ID,
  };

  const hasOAuthProviders = Object.values(availableProviders).some(Boolean);

  // If already logged in, reserve immediately
  // FIX: Only trigger when session.user.id or open changes (prevents infinite loop)
  useEffect(() => {
    if (session?.user && open) {
      handleReserveNow();
      onOpenChange(false);
    }
  }, [session?.user?.id, open]); // Only trigger when these values change

  const handleReserveNow = async () => {
    try {
      await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wishId: wish.id }),
      });

      onOpenChange(false);

      toast({
        title: 'Item reserved!',
        description: 'Check "My Reservations" to see all your items.',
        action: <Button onClick={() => router.push('/my-reservations')}>View</Button>
      });
    } catch (error) {
      toast({
        title: 'Failed to reserve',
        description: 'Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const callbackUrl = `/my-reservations?reserved=${wish.id}`;

    // CRITICAL: Use redirect: false to keep user on page
    const result = await signIn('email', {
      email,
      callbackUrl,
      redirect: false // Keeps user on page, shows success message
    });

    setIsLoading(false);

    if (result?.ok) {
      setEmailSent(true); // Show "Check your email" message
    } else {
      toast({
        title: 'Failed to send magic link',
        description: 'Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleOAuth = (provider: string) => {
    const callbackUrl = `/my-reservations?reserved=${wish.id}`;
    // OAuth MUST do full page redirect (OAuth 2.0 spec requirement)
    signIn(provider, { callbackUrl });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign in to reserve</DialogTitle>
          <DialogDescription>
            Sign in to reserve "{wish.title}"
          </DialogDescription>
        </DialogHeader>

        {emailSent ? (
          <div className="text-center py-6 space-y-2">
            <p className="font-medium">Check your email!</p>
            <p className="text-sm text-muted-foreground">
              We sent a login link to {email}
            </p>
            <p className="text-sm text-muted-foreground">
              After signing in, you'll see this reservation in "My Reservations"
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* OAuth Buttons (if configured) */}
            {hasOAuthProviders && (
              <div className="space-y-2">
                {availableProviders.google && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleOAuth('google')}
                  >
                    Continue with Google
                  </Button>
                )}

                {availableProviders.facebook && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleOAuth('facebook')}
                  >
                    Continue with Facebook
                  </Button>
                )}

                {availableProviders.apple && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleOAuth('apple')}
                  >
                    Continue with Apple
                  </Button>
                )}
              </div>
            )}

            {hasOAuthProviders && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with email
                  </span>
                </div>
              </div>
            )}

            {/* Magic Link Form */}
            <form onSubmit={handleMagicLink} className="space-y-3">
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send Login Link'}
              </Button>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
