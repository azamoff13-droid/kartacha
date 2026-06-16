import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const databaseConfigured = Boolean(process.env.DATABASE_URL);

function getDatabaseAdapter(): NextAuthOptions['adapter'] {
  if (!databaseConfigured) return undefined;

  const { PrismaAdapter } = require('@next-auth/prisma-adapter') as typeof import('@next-auth/prisma-adapter');
  const { prisma } = require('@/src/lib/prisma') as typeof import('@/src/lib/prisma');
  return PrismaAdapter(prisma);
}

export const authOptions: NextAuthOptions = {
  adapter: getDatabaseAdapter(),
  providers: googleConfigured
    ? [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID as string,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        }),
      ]
    : [],
  session: {
    strategy: databaseConfigured ? 'database' : 'jwt',
  },
  pages: {
    signIn: '/',
  },
  callbacks: {
    session({ session, token, user }) {
      const userId = user?.id || token?.sub;
      if (session.user && userId) {
        session.user.id = userId;
      }
      return session;
    },
  },
};

export const authRuntimeConfig = {
  googleConfigured,
  databaseConfigured,
};
