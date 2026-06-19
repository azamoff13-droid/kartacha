import { ReviewRating, type PrismaClient } from '@prisma/client';
import { DECKS } from '@/src/lib/decks';

export type ClientCardSnapshot = {
  id?: string;
  front: string;
  translation: string;
  pos?: string;
  example?: string;
  source?: 'base' | 'custom';
};

export type ClientReviewEvent = {
  clientEventId: string;
  cardId?: string;
  deckKey: string;
  rating: ReviewRating;
  shownAt: string;
  revealedAt?: string | null;
  ratedAt: string;
  activeMs: number;
  recallMs?: number | null;
  card: ClientCardSnapshot;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MAX_ACTIVE_MS = 60 * 1000;

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string) {
  const start = new Date(`${a}T00:00:00.000Z`).getTime();
  const end = new Date(`${b}T00:00:00.000Z`).getTime();
  return Math.round((end - start) / ONE_DAY_MS);
}

export function scheduleIntervalDays(currentInterval: number, rating: ReviewRating) {
  if (rating === 'again') return 1;
  if (rating === 'hard') return Math.max(1, Math.ceil(currentInterval * 1.2) || 1);
  if (rating === 'good') return Math.max(2, Math.ceil(currentInterval * 2.5) || 2);
  return Math.max(4, Math.ceil(currentInterval * 3.5) || 4);
}

export function nextActivityState(
  current: { streak: number; bestStreak: number; lastStudyDate: Date | null; totalReviews: number } | null,
  now = new Date(),
) {
  const today = todayKey(now);
  const last = current?.lastStudyDate ? todayKey(current.lastStudyDate) : null;
  const gap = last ? daysBetween(last, today) : null;
  const streak = gap === 0
    ? current?.streak || 1
    : gap === 1
      ? (current?.streak || 0) + 1
      : 1;

  return {
    streak,
    bestStreak: Math.max(current?.bestStreak || 0, streak),
    lastStudyDate: now,
    totalReviews: (current?.totalReviews || 0) + 1,
  };
}

export function normalizeReviewEvent(input: unknown): ClientReviewEvent | null {
  if (!input || typeof input !== 'object') return null;
  const value = input as Partial<ClientReviewEvent>;
  const card = value.card;
  if (!value.clientEventId || typeof value.clientEventId !== 'string') return null;
  if (!value.deckKey || typeof value.deckKey !== 'string') return null;
  if (!value.rating || !Object.values(ReviewRating).includes(value.rating)) return null;
  if (!value.shownAt || !value.ratedAt) return null;
  if (!card || typeof card.front !== 'string' || typeof card.translation !== 'string') return null;

  const activeMs = Number.isFinite(value.activeMs) ? Math.max(0, Math.min(MAX_ACTIVE_MS, Number(value.activeMs))) : 0;
  const recallMs = Number.isFinite(value.recallMs)
    ? Math.max(0, Math.min(MAX_ACTIVE_MS, Number(value.recallMs)))
    : null;

  return {
    clientEventId: value.clientEventId,
    cardId: typeof value.cardId === 'string' ? value.cardId : undefined,
    deckKey: value.deckKey,
    rating: value.rating,
    shownAt: value.shownAt,
    revealedAt: value.revealedAt || null,
    ratedAt: value.ratedAt,
    activeMs,
    recallMs,
    card: {
      id: typeof card.id === 'string' ? card.id : undefined,
      front: card.front.trim(),
      translation: card.translation.trim(),
      pos: card.pos?.trim() || undefined,
      example: card.example?.trim() || undefined,
      source: card.source === 'base' ? 'base' : 'custom',
    },
  };
}

export async function ensureDeck(prisma: PrismaClient, userId: string, deckKey: string) {
  const deck = DECKS[deckKey];

  return prisma.deck.upsert({
    where: {
      userId_key: {
        userId,
        key: deckKey,
      },
    },
    create: {
      userId,
      key: deckKey,
      name: deck?.name || deckKey.toUpperCase(),
      language: deckKey,
    },
    update: {
      name: deck?.name || deckKey.toUpperCase(),
      language: deckKey,
    },
  });
}

export async function ensureCard(
  prisma: PrismaClient,
  userId: string,
  deckId: string,
  card: ClientCardSnapshot,
) {
  return prisma.card.upsert({
    where: {
      userId_deckId_front: {
        userId,
        deckId,
        front: card.front.trim(),
      },
    },
    create: {
      userId,
      deckId,
      front: card.front.trim(),
      back: card.translation.trim(),
      pos: card.pos?.trim() || null,
      example: card.example?.trim() || null,
      source: card.source === 'base' ? 'default' : 'custom',
    },
    update: {
      back: card.translation.trim(),
      pos: card.pos?.trim() || null,
      example: card.example?.trim() || null,
    },
  });
}

export async function recordReviewEvent(prisma: PrismaClient, userId: string, event: ClientReviewEvent) {
  return prisma.$transaction(async (tx) => {
    const existingEvent = await tx.studyEvent.findUnique({
      where: { clientEventId: event.clientEventId },
      select: { id: true },
    });

    if (existingEvent) {
      return { skipped: true, studyEventId: existingEvent.id };
    }

    const deck = await ensureDeck(tx as PrismaClient, userId, event.deckKey);
    const card = await ensureCard(tx as PrismaClient, userId, deck.id, event.card);
    const ratedAt = new Date(event.ratedAt);
    const previousReview = await tx.review.findFirst({
      where: { userId, cardId: card.id },
      orderBy: { reviewedAt: 'desc' },
    });
    const intervalDays = scheduleIntervalDays(previousReview?.intervalDays || 0, event.rating);
    const dueAt = new Date(ratedAt.getTime() + intervalDays * ONE_DAY_MS);

    await tx.review.create({
      data: {
        userId,
        cardId: card.id,
        rating: event.rating,
        intervalDays,
        dueAt,
        reviewedAt: ratedAt,
        ease: previousReview?.ease || 2.5,
        lapses: (previousReview?.lapses || 0) + (event.rating === 'again' ? 1 : 0),
      },
    });

    const studyEvent = await tx.studyEvent.create({
      data: {
        clientEventId: event.clientEventId,
        userId,
        cardId: card.id,
        deckKey: event.deckKey,
        rating: event.rating,
        shownAt: new Date(event.shownAt),
        revealedAt: event.revealedAt ? new Date(event.revealedAt) : null,
        ratedAt,
        activeMs: event.activeMs,
        recallMs: event.recallMs,
      },
    });

    const activity = await tx.activity.findUnique({ where: { userId } });
    await tx.activity.upsert({
      where: { userId },
      create: {
        userId,
        ...nextActivityState(null, ratedAt),
      },
      update: nextActivityState(activity, ratedAt),
    });

    return { skipped: false, studyEventId: studyEvent.id, cardId: card.id };
  });
}

export function formatMs(ms: number | null | undefined) {
  if (!ms) return '0s';
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
}
