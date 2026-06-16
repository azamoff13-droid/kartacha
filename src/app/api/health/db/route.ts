import { NextResponse } from 'next/server';

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      configured: false,
      ok: false,
      message: 'DATABASE_URL is not configured.',
    });
  }

  try {
    const { prisma } = await import('@/src/lib/prisma');
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({
      configured: true,
      ok: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        configured: true,
        ok: false,
        message: 'Database connection failed.',
      },
      { status: 500 },
    );
  }
}
