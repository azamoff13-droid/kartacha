import { PrismaAdapter } from '@next-auth/prisma-adapter';
import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from '@/src/lib/prisma';

const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const databaseConfigured = Boolean(process.env.DATABASE_URL);

export const authOptions: NextAuthOptions = {
  adapter: databaseConfigured ? PrismaAdapter(prisma) : undefined,
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
