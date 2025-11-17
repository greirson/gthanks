import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function VerifyRequestPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle as="h1">Check your email</CardTitle>
          <CardDescription>A sign-in link has been sent to your email address</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-center">
            <div className="text-6xl">📧</div>
            <p className="text-muted-foreground">
              Click the link in the email to sign in to your account.
            </p>
            <p className="text-sm text-muted-foreground">
              Didn&apos;t receive the email? Check your spam folder or try signing in again.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
