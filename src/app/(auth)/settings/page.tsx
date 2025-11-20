import { redirect } from 'next/navigation';
import { Mail } from 'lucide-react';

import { AvatarUpload } from '@/components/profile/avatar-upload';
import { EmailManager } from '@/components/settings/email-manager';
import { NameForm } from '@/components/settings/name-form';
import { ProfileVisibilityToggle } from '@/components/settings/profile-visibility-toggle';
import { UsernameForm } from '@/components/settings/username-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/auth-utils';
import { db } from '@/lib/db';

export const metadata = {
  title: 'Settings',
  description: 'Manage your account settings',
};

interface PageProps {
  searchParams: Promise<{ emailVerified?: string; message?: string }>;
}

// OAuth provider icons component
function ConnectedAccounts({ accounts }: { accounts: Array<{ id: string; provider: string }> }) {
  const getProviderIcon = (_provider: string) => {
    // Use Mail icon for all providers for simplicity
    return <Mail className="h-4 w-4" />;
  };

  if (accounts.length === 0) {
    return <p className="text-sm text-muted-foreground">No connected accounts</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {accounts.map((account) => (
        <div
          key={account.id}
          className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs"
        >
          {getProviderIcon(account.provider)}
          <span className="capitalize">{account.provider}</span>
        </div>
      ))}
    </div>
  );
}

export default async function SettingsPage({ searchParams }: PageProps) {
  // Get current user
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch user's emails from database
  const userEmails = await db.userEmail.findMany({
    where: { userId: user.id },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      email: true,
      isPrimary: true,
      isVerified: true,
      verifiedAt: true,
    },
  });

  // Fetch OAuth accounts
  const accounts = await db.account.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      provider: true,
      providerAccountId: true,
    },
  });

  // Get search params for verification messages
  const params = await searchParams;
  const emailVerified = params.emailVerified;
  const message = params.message;

  return (
    <div className="container max-w-2xl space-y-6 py-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Display verification status messages */}
      {emailVerified === 'success' && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-green-600 dark:text-green-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Email verified successfully!
              </p>
            </div>
          </div>
        </div>
      )}

      {emailVerified === 'error' && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-600 dark:text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                {message || 'Email verification failed. Please try again.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Personal Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your profile information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Upload */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Profile Picture</p>
            <AvatarUpload
              currentAvatar={user.avatarUrl || undefined}
              userName={user.name || undefined}
              userId={user.id}
              userEmail={user.email || ''}
            />
          </div>

          {/* Primary Email */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Primary Email</p>
            <div className="text-sm text-muted-foreground">
              {userEmails.find((e) => e.isPrimary)?.email || user.email}
            </div>
          </div>

          {/* Editable Name */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Name</p>
            <NameForm currentName={user.name} />
          </div>

          {/* Connected OAuth accounts */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Connected Accounts</p>
            <ConnectedAccounts accounts={accounts} />
          </div>
        </CardContent>
      </Card>

      {/* Vanity URLs Card - Only if user has access */}
      {user.canUseVanityUrls && (
        <Card>
          <CardHeader>
            <CardTitle>Vanity URLs</CardTitle>
            <CardDescription>Customize your profile URL</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <UsernameForm
              currentUsername={user.username}
              canUseVanityUrls={user.canUseVanityUrls}
            />
            <ProfileVisibilityToggle
              username={user.username}
              initialValue={user.showPublicProfile}
            />
          </CardContent>
        </Card>
      )}

      {/* Email Management Card */}
      <Card>
        <CardHeader>
          <CardTitle>Email Addresses</CardTitle>
        </CardHeader>
        <CardContent>
          <EmailManager userEmails={userEmails} />
        </CardContent>
      </Card>
    </div>
  );
}
