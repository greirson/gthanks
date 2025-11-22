import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { LoginForm } from '@/components/auth/login-form';
import { authOptions } from '@/lib/auth';
import { settingsService } from '@/lib/services/settings-service';

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  // Redirect authenticated users to wishes
  if (session) {
    redirect('/wishes');
  }

  // Determine available OAuth providers based on environment variables
  const availableProviders = {
    google: !!process.env.GOOGLE_CLIENT_ID,
    facebook: !!process.env.FACEBOOK_CLIENT_ID,
    apple: !!process.env.APPLE_CLIENT_ID,
    oauth: !!(
      process.env.OAUTH_CLIENT_ID &&
      process.env.OAUTH_CLIENT_SECRET &&
      process.env.OAUTH_ISSUER
    ),
  };

  const oauthConfig = {
    name: process.env.OAUTH_NAME || 'OAuth',
    displayName: process.env.OAUTH_NAME || 'OAuth Provider',
  };

  // Fetch login message (Server Component, cached)
  const loginMessage = await settingsService.getLoginMessage();

  return (
    <LoginForm
      availableProviders={availableProviders}
      oauthConfig={oauthConfig}
      loginMessage={loginMessage}
    />
  );
}
