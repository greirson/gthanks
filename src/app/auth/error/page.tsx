'use client';

import { Suspense } from 'react';

import { useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'RegistrationDisabled':
        return 'New user registration is currently disabled on this instance. Please contact the administrator if you need access.';
      case 'Configuration':
        return 'There is a problem with the server configuration.';
      case 'AccessDenied':
        return 'You do not have permission to sign in.';
      case 'Verification':
        return 'The verification token has expired or has already been used.';
      case 'EmailRequired':
        return 'Your authentication provider must share your email address to sign in.';
      case 'AccountLinkFailed':
        return 'Unable to link your account. Please try again or use a different sign-in method.';
      case 'DatabaseError':
        return 'A server error occurred. Please try again later.';
      case 'Default':
      default:
        return 'An error occurred during authentication.';
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-destructive">Authentication Error</CardTitle>
          <CardDescription>{getErrorMessage(error)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please try signing in again. If the problem persists, contact support.
            </p>
            <Button onClick={() => (window.location.href = '/auth/login')} className="w-full">
              Back to Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Card className="w-full max-w-md">
            <CardContent className="flex items-center justify-center p-6">
              <div className="text-center">Loading...</div>
            </CardContent>
          </Card>
        </div>
      }
    >
      <ErrorContent />
    </Suspense>
  );
}
