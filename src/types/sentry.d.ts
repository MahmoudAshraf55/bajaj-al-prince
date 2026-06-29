declare module '@sentry/nextjs' {
  export function init(options: Record<string, unknown>): void;
  export function captureException(error: Error, options?: Record<string, unknown>): void;
}
