import { NextResponse } from 'next/server';
import { settingsService } from '@/lib/services/settings-service';

export const revalidate = 600; // 10 minutes

export async function GET() {
  try {
    const message = await settingsService.getLoginMessage();
    return NextResponse.json(
      { message },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('Failed to fetch login message:', error);
    return NextResponse.json({ message: null }); // Never error to users
  }
}
