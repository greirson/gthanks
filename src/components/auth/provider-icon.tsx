import { siApple, siAuth0, siFacebook, siGithub, siGoogle, siOkta } from 'simple-icons';

interface ProviderIconProps {
  provider: string;
  size?: number;
  className?: string;
}

const providerIcons: Record<string, typeof siGoogle> = {
  google: siGoogle,
  facebook: siFacebook,
  apple: siApple,
  github: siGithub,
  auth0: siAuth0,
  okta: siOkta,
  oauth: siAuth0, // Default fallback for generic OAuth
};

export function ProviderIcon({ provider, size = 20, className = '' }: ProviderIconProps) {
  const icon = providerIcons[provider.toLowerCase()];

  if (!icon) {
    // Fallback for unknown providers
    return (
      <div
        className={`inline-flex items-center justify-center rounded ${className}`}
        style={{ width: size, height: size }}
      >
        🔐
      </div>
    );
  }

  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      fill="currentColor"
      aria-label={`${provider} icon`}
    >
      <path d={icon.path} />
    </svg>
  );
}
