/**
 * Sentry Error Tracking — production-ready, requires @sentry/nextjs + SENTRY_DSN
 *
 * To activate:
 * 1. npm install @sentry/nextjs
 * 2. Add SENTRY_DSN to .env
 * 3. The instrumentation.ts will call initSentry() automatically
 */

type SentryLike = {
  init: (opts: Record<string, unknown>) => void;
  captureException: (err: Error, opts?: Record<string, unknown>) => void;
};

let sentryModule: SentryLike | null = null;
let initialized = false;

async function loadSentry(): Promise<SentryLike | null> {
  if (sentryModule) return sentryModule;
  try {
    const mod = await import(/* webpackIgnore: true */ '@sentry/nextjs');
    sentryModule = mod as unknown as SentryLike;
    return sentryModule;
  } catch {
    return null;
  }
}

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    console.warn('[sentry] SENTRY_DSN not configured. Skipping Sentry initialization.');
    return;
  }
  if (initialized) return;

  loadSentry().then((Sentry) => {
    if (!Sentry) {
      console.warn('[sentry] @sentry/nextjs not installed. Skipping.');
      return;
    }
    Sentry.init({
      dsn,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      environment: process.env.NODE_ENV || 'development',
    });
    initialized = true;
    console.info('[sentry] Initialized successfully');
  }).catch(() => {
    console.warn('[sentry] Failed to initialize');
  });
}

export function captureException(error: Error, context?: Record<string, unknown>): void {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    console.error('[error]', error.message, context || '');
    return;
  }

  loadSentry().then((Sentry) => {
    if (Sentry) {
      Sentry.captureException(error, { extra: context });
    } else {
      console.error('[error]', error.message, context || '');
    }
  }).catch(() => {
    console.error('[error]', error.message, context || '');
  });
}
