/**
 * Sentry Error Tracking — Infrastructure ready, requires DSN in .env
 *
 * To activate:
 * 1. Install dependency: npm install @sentry/nextjs
 * 2. Add SENTRY_DSN to .env
 * 3. Uncomment the Sentry initialization below.
 */

/**
 * Initialize Sentry for the application.
 * Call this in src/app/layout.tsx or src/instrumentation.ts.
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (!dsn) {
    console.warn('[sentry] SENTRY_DSN not configured. Skipping Sentry initialization.');
    return;
  }

  // Uncomment after installing @sentry/nextjs:
  // import * as Sentry from '@sentry/nextjs';
  // Sentry.init({
  //   dsn,
  //   tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  //   environment: process.env.NODE_ENV || 'development',
  // });
}

/**
 * Capture an exception manually.
 */
export function captureException(error: Error, context?: Record<string, unknown>): void {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    console.error('[sentry]', error.message, context || '');
    return;
  }

  // Uncomment after installing @sentry/nextjs:
  // import * as Sentry from '@sentry/nextjs';
  // Sentry.captureException(error, { extra: context });
}
