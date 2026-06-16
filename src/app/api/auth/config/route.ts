import { NextResponse } from 'next/server';
import { authRuntimeConfig } from '../auth-options';

export function GET() {
  return NextResponse.json({
    google: authRuntimeConfig.googleConfigured,
    database: authRuntimeConfig.databaseConfigured,
    secret: authRuntimeConfig.secretConfigured,
  });
}
