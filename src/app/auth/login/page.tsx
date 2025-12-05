import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { LoginForm } from '@/components/auth/login-form';
import { authOptions } from '@/lib/auth';
import { getAvailableOAuthProviders, isMagicLinkDisabled } from '@/lib/oauth-providers';
import { settingsService } from '@/lib/services/settings-service';

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  // Redirect authenticated users to wishes
  if (session) {
    redirect('/wishes');
  }

  // Get available OAuth providers from centralized utility
  const { providers: availableProviders, oauthConfig } = getAvailableOAuthProviders();

  // Fetch login message (Server Component, cached)
  const loginMessage = await settingsService.getLoginMessage();

  // Check if magic link login is disabled
  const showMagicLink = !isMagicLinkDisabled();

  return (
    <LoginForm
      availableProviders={availableProviders}
      oauthConfig={oauthConfig}
      loginMessage={loginMessage}
      showMagicLink={showMagicLink}
    />
  );
}
