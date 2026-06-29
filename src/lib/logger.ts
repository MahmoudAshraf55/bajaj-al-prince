type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  correlationId?: string;
  userId?: string;
  tenantId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;
  error?: string;
  stack?: string;
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
};

const minLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

let correlationId: string | undefined;

export function setCorrelationId(id: string): void {
  correlationId = id;
}

export function getCorrelationId(): string | undefined {
  return correlationId;
}

export function generateCorrelationId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (LOG_LEVELS[level] < LOG_LEVELS[minLevel]) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    correlationId,
    ...meta,
  };

  const output = JSON.stringify(entry);

  if (level === 'error' || level === 'fatal') {
    console.error(output);
  } else if (level === 'warn') {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  debug: (msg: string, meta?: unknown) => log('debug', msg, normalizeMeta(meta)),
  info: (msg: string, meta?: unknown) => log('info', msg, normalizeMeta(meta)),
  warn: (msg: string, meta?: unknown) => log('warn', msg, normalizeMeta(meta)),
  error: (msg: string, meta?: unknown, extraMeta?: Record<string, unknown>) => log('error', msg, { ...normalizeMeta(meta), ...extraMeta }),
  fatal: (msg: string, meta?: unknown) => log('fatal', msg, normalizeMeta(meta)),

  request: (method: string, path: string, statusCode: number, durationMs: number, meta?: Record<string, unknown>) => {
    log('info', `${method} ${path} ${statusCode}`, {
      method,
      path,
      statusCode,
      durationMs,
      ...meta,
    });
  },
};

function normalizeMeta(meta?: unknown): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  if (meta instanceof Error) {
    return { error: meta.message, stack: meta.stack };
  }
  if (typeof meta === 'object' && meta !== null) {
    return meta as Record<string, unknown>;
  }
  return { error: String(meta) };
}
