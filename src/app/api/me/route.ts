import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions, authRuntimeConfig } from '../auth/auth-options';

export async function GET() {
  if (!authRuntimeConfig.googleConfigured || !authRuntimeConfig.secretConfigured) {
    return NextResponse.json({
      authenticated: false,
      database: authRuntimeConfig.databaseConfigured,
      authReady: false,
      user: null,
    });
  }

  const session = await getServerSession(authOptions);

  return NextResponse.json({
    authenticated: Boolean(session?.user),
    database: authRuntimeConfig.databaseConfigured,
    authReady: true,
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
