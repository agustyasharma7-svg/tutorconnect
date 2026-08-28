/**
 * Sentry must initialize before Nest boots.
 * Import this file first from main.ts.
 * No-op when SENTRY_DSN is unset (local DX).
 */
import * as Sentry from '@sentry/node';

const dsn = process.env.SENTRY_DSN?.trim();

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn),
  environment: process.env.NODE_ENV ?? 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
});
