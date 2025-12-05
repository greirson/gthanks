'use client';

import { useState } from 'react';

import { signIn } from 'next-auth/react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ThemeButton } from '@/components/ui/theme-button';
import { useToast } from '@/components/ui/use-toast';

import { ProviderIcon } from './provider-icon';

interface OAuthProvider {
  google: boolean;
  facebook: boolean;
  apple: boolean;
  oauth: boolean;
}

interface OAuthConfig {
  name: string;
  displayName: string;
}

interface LoginFormProps {
  availableProviders: OAuthProvider;
  oauthConfig: OAuthConfig;
  loginMessage?: string | null;
  showMagicLink?: boolean;
}

export function LoginForm({
  availableProviders,
  oauthConfig,
  loginMessage,
  showMagicLink = true,
}: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const error = searchParams.get('error');

  // Show error messages
  if (error) {
    const errorMessages: Record<string, string> = {
      missing_token: 'Login link is missing. Please try again.',
      invalid_token: 'Login link is invalid. Please request a new one.',
      expired_token: 'Login link has expired. Please request a new one.',
      verification_failed: 'Login failed. Please try again.',
    };

    if (errorMessages[error]) {
      toast({
        title: 'Error',
        description: errorMessages[error],
        variant: 'destructive',
      });
    }
  }

  const handleOAuthSignIn = async (provider: string) => {
    try {
      setOauthLoading(provider);
      await signIn(provider, {
        callbackUrl: searchParams.get('callbackUrl') || `${window.location.origin}/wishes`,
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to sign in with ' + provider,
        variant: 'destructive',
      });
      setOauthLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast({
        title: 'Error',
        description: 'Please enter your email address',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Use NextAuth email provider
      // NOTE: Do NOT use redirect: false with email provider - it breaks email sending
      // NextAuth email provider requires full page redirect to trigger sendVerificationRequest
      const callbackUrl = searchParams.get('callbackUrl') || `${window.location.origin}/wishes`;
      await signIn('email', {
        email,
        callbackUrl,
      });
      // Page will redirect to /auth/verify-request after email is sent
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send login link',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const hasAnyOAuthProvider = Object.values(availableProviders).some(Boolean);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      {/* Logo - purple in light mode, white in dark mode */}
      <div className="mb-6">
        <Image
          src="/logo-symbol.png"
          alt="gthanks logo"
          width={64}
          height={64}
          className="h-16 w-16 [filter:brightness(0)_sepia(1)_saturate(5)_hue-rotate(220deg)] dark:opacity-80 dark:[filter:none]"
          priority
        />
      </div>
      {loginMessage && (
        <div className="mb-6 w-full max-w-md rounded-lg border-l-4 border-blue-500 bg-blue-50 p-4 dark:bg-blue-950">
          <div
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: loginMessage }}
          />
        </div>
      )}
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle as="h1">Sign in to gthanks</CardTitle>
          <CardDescription>
            {hasAnyOAuthProvider && showMagicLink
              ? 'Choose your preferred sign-in method. Your account is linked to your email address, so you can use any provider with the same email.'
              : hasAnyOAuthProvider && !showMagicLink
                ? 'Sign in with your organization account.'
                : 'Enter your email to receive a magic login link'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={hasAnyOAuthProvider ? 'space-y-6' : ''}>
            {/* OAuth Buttons - Only show if providers are available */}
            {hasAnyOAuthProvider && (
              <>
                <div className="space-y-3">
                  {availableProviders.google && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleOAuthSignIn('google')}
                      disabled={oauthLoading !== null}
                      aria-label="Sign in with Google"
                      className="w-full"
                    >
                      {oauthLoading === 'google' ? (
                        'Signing in...'
                      ) : (
                        <>
                          <ProviderIcon provider="google" size={18} className="mr-2" />
                          Continue with Google
                        </>
                      )}
                    </Button>
                  )}

                  {availableProviders.facebook && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleOAuthSignIn('facebook')}
                      disabled={oauthLoading !== null}
                      className="w-full"
                    >
                      {oauthLoading === 'facebook' ? (
                        'Signing in...'
                      ) : (
                        <>
                          <ProviderIcon provider="facebook" size={18} className="mr-2" />
                          Continue with Facebook
                        </>
                      )}
                    </Button>
                  )}

                  {availableProviders.apple && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleOAuthSignIn('apple')}
                      disabled={oauthLoading !== null}
                      className="w-full"
                    >
                      {oauthLoading === 'apple' ? (
                        'Signing in...'
                      ) : (
                        <>
                          <ProviderIcon provider="apple" size={18} className="mr-2" />
                          Continue with Apple
                        </>
                      )}
                    </Button>
                  )}

                  {availableProviders.oauth && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleOAuthSignIn('oauth')}
                      disabled={oauthLoading !== null}
                      className="w-full"
                    >
                      {oauthLoading === 'oauth' ? (
                        'Signing in...'
                      ) : (
                        <>
                          <ProviderIcon provider="oauth" size={18} className="mr-2" />
                          Continue with {oauthConfig.displayName}
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* Divider - only show if magic link is enabled */}
                {showMagicLink && (
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or continue with email
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Magic Link Form - only show if enabled */}
            {showMagicLink && (
              <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                <div>
                  <label htmlFor="email-input" className="sr-only">
                    Email address
                  </label>
                  <Input
                    id="email-input"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading || oauthLoading !== null}
                    required
                    aria-describedby="email-help"
                    className="w-full"
                  />
                  <div id="email-help" className="sr-only">
                    Enter your email address to receive a magic login link
                  </div>
                </div>
                <ThemeButton
                  type="submit"
                  disabled={isLoading || oauthLoading !== null}
                  className="w-full"
                >
                  {isLoading ? 'Sending...' : 'Send Login Link'}
                </ThemeButton>
              </form>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
