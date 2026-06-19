import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions, authRuntimeConfig } from '../../auth/auth-options';
import { prisma } from '@/src/lib/prisma';
import { ensureDeck } from '@/src/lib/profile-sync';
import { validateCardImportRequest } from '@/src/lib/pdf-import/import-validation';
import { normalizeDuplicateKey } from '@/src/lib/pdf-import/vocabulary-parser';

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
  const validation = validateCardImportRequest(body);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, message: validation.message }, { status: 400 });
  }

  const deck = await ensureDeck(prisma, userId, validation.deckKey);
  const existingCards = await prisma.card.findMany({ where: { userId, deckId: deck.id } });
  const byFront = new Map(existingCards.map((card) => [normalizeDuplicateKey(card.front), card]));
  let added = 0;
  let updated = 0;
  let skipped = 0;
  const errors: Array<{ front: string; message: string }> = [];

  for (const card of validation.cards) {
    try {
      const key = normalizeDuplicateKey(card.front);
      const existing = byFront.get(key);
      if (existing) {
        if (card.duplicateAction !== 'update') {
          skipped += 1;
          continue;
        }
        const saved = await prisma.card.update({
          where: { id: existing.id },
          data: { front: card.front, back: card.translation, pos: card.pos, example: card.example || null },
        });
        byFront.set(key, saved);
        updated += 1;
        continue;
      }
      const saved = await prisma.card.create({
        data: {
          userId,
          deckId: deck.id,
          front: card.front,
          back: card.translation,
          pos: card.pos,
          example: card.example || null,
          source: 'custom',
        },
      });
      byFront.set(key, saved);
      added += 1;
    } catch (error) {
      errors.push({ front: card.front, message: error instanceof Error ? error.message : 'Import failed.' });
    }
  }

  return NextResponse.json({ ok: errors.length === 0, added, updated, skipped, errors });
}
