import { NextResponse } from 'next/server';
// eslint-disable-next-line local-rules/no-direct-db-import -- Health check endpoint requires direct db access to verify database connectivity
import { db } from '@/lib/db';
import packageJson from '../../../../package.json';

export async function GET() {
  try {
    // Basic database health check
    await db.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: 'ok',
        version: packageJson.version,
        timestamp: new Date().toISOString(),
        database: 'connected',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      {
        status: 'error',
        version: packageJson.version,
        timestamp: new Date().toISOString(),
        database: 'disconnected',
      },
      { status: 503 }
    );
  }
}
