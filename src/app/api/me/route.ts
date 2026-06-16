import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions, authRuntimeConfig } from '../auth/auth-options';

export async function GET() {
  const session = await getServerSession(authOptions);

  return NextResponse.json({
    authenticated: Boolean(session?.user),
    database: authRuntimeConfig.databaseConfigured,
    user: session?.user
      ? {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        }
      : null,
  });
}
