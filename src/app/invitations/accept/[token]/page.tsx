'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function AcceptInvitationPage() {
  const params = useParams();
  const router = useRouter();
  const { data: _session, status } = useSession();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState<string>('');

  useEffect(() => {
    async function acceptInvitation() {
      // Wait for auth to load
      if (status === 'loading') {
        return;
      }

      // Redirect to login if not authenticated
      if (status === 'unauthenticated') {
        const token = Array.isArray(params.token) ? params.token[0] : params.token;
        router.push(`/auth/login?callbackUrl=/invitations/accept/${token}`);
        return;
      }

      // Accept the invitation
      try {
        const token = Array.isArray(params.token) ? params.token[0] : params.token;
        const response = await fetch(`/api/invitations/accept/${token}`, {
          method: 'POST',
        });

        if (!response.ok) {
          const data: { error?: string } = await response.json();
          throw new Error(data.error ?? 'Failed to accept invitation');
        }

        const data: { group: { name: string } } = await response.json();
        setGroupName(data.group.name);

        // Redirect to groups page after a brief delay
        setTimeout(() => {
          router.push('/groups');
        }, 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to accept invitation');
        setLoading(false);
      }
    }

    void acceptInvitation();
  }, [status, params.token, router]);

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600 mx-auto"></div>
          <p className="text-gray-600">Processing invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h1 className="mb-2 text-xl font-semibold text-red-900">Invitation Error</h1>
          <p className="mb-4 text-red-700">{error}</p>
          <button
            onClick={() => router.push('/groups')}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Go to Groups
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="max-w-md rounded-lg border border-green-200 bg-green-50 p-6 text-center">
        <div className="mb-4 text-4xl">✓</div>
        <h1 className="mb-2 text-xl font-semibold text-green-900">Invitation Accepted!</h1>
        <p className="mb-4 text-green-700">
          You&apos;ve successfully joined <strong>{groupName}</strong>
        </p>
        <p className="text-sm text-green-600">Redirecting to groups...</p>
      </div>
    </div>
  );
}
