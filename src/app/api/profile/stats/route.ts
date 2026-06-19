import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions, authRuntimeConfig } from '../../auth/auth-options';
import { prisma } from '@/src/lib/prisma';
import { formatMs } from '@/src/lib/profile-sync';

function getDueLabel(dueAt: Date, now = new Date()) {
  if (dueAt.getTime() <= now.getTime()) return 'bugun';
  const days = Math.ceil((dueAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  if (days === 1) return 'ertaga';
  return `${days} kunda`;
}

export async function GET() {
  if (!authRuntimeConfig.databaseConfigured) {
    return NextResponse.json({ ok: false, message: 'Database is not configured.' }, { status: 503 });
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ ok: false, message: 'Authentication required.' }, { status: 401 });
  }

  const [reviews, studyAggregate, activity] = await Promise.all([
    prisma.review.findMany({
      where: { userId },
      orderBy: { reviewedAt: 'desc' },
      include: { card: true },
    }),
    prisma.studyEvent.aggregate({
      where: { userId },
      _sum: { activeMs: true },
      _avg: { recallMs: true },
    }),
    prisma.activity.findUnique({ where: { userId } }),
  ]);

  const latestByCard = new Map<string, (typeof reviews)[number]>();
  for (const review of reviews) {
    if (!latestByCard.has(review.cardId)) {
      latestByCard.set(review.cardId, review);
    }
  }

  const latestReviews = Array.from(latestByCard.values());
  const learnedWords = latestReviews.filter((review) => (
    (review.rating === 'good' || review.rating === 'easy') && review.intervalDays >= 2
  ));
  const hardWords = latestReviews
    .filter((review) => review.rating === 'again' || review.rating === 'hard')
    .slice(0, 6)
    .map((review) => ({
      id: review.cardId,
      front: review.card.front,
      translation: review.card.back,
      rating: review.rating,
      dueLabel: getDueLabel(review.dueAt),
    }));

  const totalStudyMs = studyAggregate._sum.activeMs || 0;
  const averageRecallMs = studyAggregate._avg.recallMs || 0;

  return NextResponse.json({
    ok: true,
    identity: {
      name: session.user?.name || null,
      email: session.user?.email || null,
      image: session.user?.image || null,
    },
    stats: {
      learnedWords: learnedWords.length,
      totalReviews: reviews.length,
      totalStudyMs,
      totalStudyLabel: formatMs(totalStudyMs),
      averageRecallMs,
      averageRecallLabel: formatMs(averageRecallMs),
      streak: activity?.streak || 0,
      bestStreak: activity?.bestStreak || 0,
      hardWords,
    },
  });
}
