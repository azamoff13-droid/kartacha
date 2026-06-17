import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions, authRuntimeConfig } from '../../auth/auth-options';
import { prisma } from '@/src/lib/prisma';

export async function GET() {
  if (!authRuntimeConfig.databaseConfigured) {
    return NextResponse.json({ ok: false, message: 'Database is not configured.' }, { status: 503 });
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ ok: false, message: 'Authentication required.' }, { status: 401 });
  }

  const [decks, reviews, activity] = await Promise.all([
    prisma.deck.findMany({
      where: { userId },
      include: {
        cards: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.review.findMany({
      where: { userId },
      orderBy: { reviewedAt: 'desc' },
    }),
    prisma.activity.findUnique({ where: { userId } }),
  ]);

  const latestReviewByCard = new Map<string, (typeof reviews)[number]>();
  for (const review of reviews) {
    if (!latestReviewByCard.has(review.cardId)) {
      latestReviewByCard.set(review.cardId, review);
    }
  }

  return NextResponse.json({
    ok: true,
    decks: decks.map((deck) => ({
      id: deck.id,
      key: deck.key || deck.language,
      name: deck.name,
      language: deck.language,
      cards: deck.cards.map((card) => ({
        id: card.id,
        front: card.front,
        translation: card.back,
        pos: card.pos || undefined,
        example: card.example || undefined,
        source: card.source,
        review: latestReviewByCard.get(card.id) || null,
      })),
    })),
    activity: activity || null,
  });
}
