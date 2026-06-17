import { ReviewRating } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions, authRuntimeConfig } from '../../auth/auth-options';
import { DECKS } from '@/src/lib/decks';
import { prisma } from '@/src/lib/prisma';
import { ensureCard, ensureDeck } from '@/src/lib/profile-sync';

type ImportedReview = {
  rating?: ReviewRating;
  dueAt?: number;
  intervalDays?: number;
  lapses?: number;
};

type ImportedCard = {
  id?: string;
  front: string;
  translation: string;
  pos?: string;
  example?: string;
  source?: 'base' | 'custom';
};

type ImportedStore = {
  custom?: Record<string, ImportedCard[]>;
  reviews?: Record<string, Record<string, ImportedReview>>;
  known?: Record<string, Record<string, boolean>>;
  activity?: {
    streak?: number;
    bestStreak?: number;
    totalReviews?: number;
    lastStudyDate?: string;
  };
};

function toImportedStore(body: any): ImportedStore | null {
  const store = body?.store || body;
  if (!store || typeof store !== 'object') return null;
  return store;
}

function cardKey(card: ImportedCard) {
  return card.source === 'custom' && card.id ? card.id : card.front;
}

function validRating(value: unknown): value is ReviewRating {
  return typeof value === 'string' && Object.values(ReviewRating).includes(value as ReviewRating);
}

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
  const store = toImportedStore(body);

  if (!store) {
    return NextResponse.json({ ok: false, message: 'Invalid import payload.' }, { status: 400 });
  }

  let importedCards = 0;
  let importedReviews = 0;

  for (const [deckKey, deck] of Object.entries(DECKS)) {
    const customCards = store.custom?.[deckKey] || [];
    const cards: ImportedCard[] = [
      ...deck.cards.map((card) => ({ ...card, source: 'base' as const })),
      ...customCards.map((card) => ({ ...card, source: 'custom' as const })),
    ];
    const cardsByKey = new Map<string, ImportedCard>();
    for (const card of cards) {
      cardsByKey.set(cardKey(card), card);
      cardsByKey.set(card.front, card);
      if (card.id) cardsByKey.set(card.id, card);
    }

    const serverDeck = await ensureDeck(prisma, userId, deckKey);

    for (const card of customCards) {
      await ensureCard(prisma, userId, serverDeck.id, card);
      importedCards += 1;
    }

    const reviewMap = store.reviews?.[deckKey] || {};
    const knownMap = store.known?.[deckKey] || {};
    const reviewEntries = new Map<string, ImportedReview>();

    for (const [id, review] of Object.entries(reviewMap)) {
      reviewEntries.set(id, review);
    }

    for (const [id, known] of Object.entries(knownMap)) {
      if (known && !reviewEntries.has(id)) {
        reviewEntries.set(id, {
          rating: 'good',
          intervalDays: 2,
          dueAt: Date.now() + 2 * 24 * 60 * 60 * 1000,
          lapses: 0,
        });
      }
    }

    for (const [id, review] of reviewEntries) {
      const card = cardsByKey.get(id);
      if (!card || !validRating(review.rating)) continue;

      const serverCard = await ensureCard(prisma, userId, serverDeck.id, card);
      await prisma.review.create({
        data: {
          userId,
          cardId: serverCard.id,
          rating: review.rating,
          intervalDays: Math.max(0, Number(review.intervalDays || 0)),
          dueAt: new Date(Number(review.dueAt || Date.now())),
          reviewedAt: new Date(),
          lapses: Math.max(0, Number(review.lapses || 0)),
        },
      });
      importedReviews += 1;
    }
  }

  if (store.activity) {
    const lastStudyDate = store.activity.lastStudyDate ? new Date(store.activity.lastStudyDate) : null;
    await prisma.activity.upsert({
      where: { userId },
      create: {
        userId,
        streak: Math.max(0, Number(store.activity.streak || 0)),
        bestStreak: Math.max(0, Number(store.activity.bestStreak || 0)),
        totalReviews: Math.max(0, Number(store.activity.totalReviews || importedReviews)),
        lastStudyDate,
      },
      update: {
        streak: Math.max(0, Number(store.activity.streak || 0)),
        bestStreak: Math.max(0, Number(store.activity.bestStreak || 0)),
        totalReviews: Math.max(0, Number(store.activity.totalReviews || importedReviews)),
        lastStudyDate,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    importedCards,
    importedReviews,
    message: 'Progress imported.',
  });
}
