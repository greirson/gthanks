// Server-side utility to check which OAuth providers are configured
export function getAvailableOAuthProviders() {
  const providers = {
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    facebook: !!(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET),
    apple: !!(process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET),
    oauth: !!(
      process.env.OAUTH_CLIENT_ID &&
      process.env.OAUTH_CLIENT_SECRET &&
      process.env.OAUTH_ISSUER
    ),
  };

  const oauthConfig = {
    name: process.env.OAUTH_NAME || 'OAuth',
    displayName: process.env.OAUTH_NAME || 'OAuth',
  };

  return {
    providers,
    oauthConfig,
    hasAnyProvider: Object.values(providers).some(Boolean),
  };
}
