/**
 * Safari Extension OAuth Callback
 * Creates PAT after OAuth success, redirects to extension with tokens
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
    const tokens = await tokenService.createToken({
      userId: session.user.id,
      name: 'Safari Extension',
      deviceType: 'safari_extension',
    });

    const callback = new URL('gthanks-extension://auth/callback');
    callback.searchParams.set('accessToken', tokens.accessToken);
    callback.searchParams.set('refreshToken', tokens.refreshToken);
    callback.searchParams.set('expiresAt', tokens.expiresAt.getTime().toString());

    return NextResponse.redirect(callback.toString());
  } catch {
    const errorUrl = new URL('gthanks-extension://auth/callback');
    errorUrl.searchParams.set('error', 'token_creation_failed');
    return NextResponse.redirect(errorUrl.toString());
  }
}
