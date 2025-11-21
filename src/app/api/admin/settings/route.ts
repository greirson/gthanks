import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { settingsService } from '@/lib/services/settings-service';
import { getCurrentUser } from '@/lib/auth-utils';

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const message = await settingsService.getLoginMessage();
  return NextResponse.json({ message });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { message } = await req.json();

  try {
    await settingsService.updateLoginMessage(message, user.id);

    // CRITICAL: Invalidate login page cache immediately
    revalidatePath('/auth/login');

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update' },
      { status: 400 }
    );
  }
}
