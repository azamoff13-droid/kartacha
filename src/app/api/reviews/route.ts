import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions, authRuntimeConfig } from '../auth/auth-options';
import { prisma } from '@/src/lib/prisma';
import { normalizeReviewEvent, recordReviewEvent } from '@/src/lib/profile-sync';

export async function POST(request: Request) {
  if (!authRuntimeConfig.databaseConfigured) {
    return NextResponse.json({ ok: false, message: 'Database is not configured.' }, { status: 503 });
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ ok: false, message: 'Authentication required.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const rawEvents = Array.isArray(body?.events) ? body.events : body?.event ? [body.event] : [];
  const events = rawEvents.map(normalizeReviewEvent).filter(Boolean);

  if (!events.length) {
    return NextResponse.json({ ok: false, message: 'No valid review events.' }, { status: 400 });
  }

  const results = [];
  for (const event of events) {
    results.push(await recordReviewEvent(prisma, userId, event));
  }

  return NextResponse.json({
    ok: true,
    received: events.length,
    synced: results.filter((result) => !result.skipped).length,
    skipped: results.filter((result) => result.skipped).length,
  });
}
