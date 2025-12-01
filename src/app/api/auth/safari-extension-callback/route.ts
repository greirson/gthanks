/**
 * Safari Extension OAuth Callback
 * Creates PAT after OAuth success, redirects to extension with token
 */

import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth';
import { tokenService } from '@/lib/services/token-service';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  try {
    const created = await tokenService.createToken({
      userId: session.user.id,
      name: 'Safari Extension',
      deviceType: 'safari_extension',
      expiresIn: '1y', // Safari extension tokens last 1 year by default
    });

    const callback = new URL('gthanks-extension://auth/callback');
    callback.searchParams.set('token', created.token);
    // expiresAt may be null for never-expiring tokens
    callback.searchParams.set(
      'expiresAt',
      created.expiresAt ? created.expiresAt.getTime().toString() : 'never'
    );

    return NextResponse.redirect(callback.toString());
  } catch {
    const errorUrl = new URL('gthanks-extension://auth/callback');
    errorUrl.searchParams.set('error', 'token_creation_failed');
    return NextResponse.redirect(errorUrl.toString());
  }
}
