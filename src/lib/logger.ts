import { captureException } from './sentry';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogPayload {
  message: string;
  level: LogLevel;
  timestamp: string;
  context?: string;
  userId?: string;
  tenantId?: string;
  error?: {
    message: string;
    stack?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

class StructuredLogger {
  private formatLog(level: LogLevel, message: string, meta: Record<string, unknown> = {}, error?: Error | unknown): LogPayload {
    const payload: LogPayload = {
      message,
      level,
      timestamp: new Date().toISOString(),
      ...meta,
    };

    if (error) {
      if (error instanceof Error) {
        payload.error = {
          message: error.message,
          stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
        };
      } else {
        payload.error = {
          message: String(error),
        };
      }
    }

    return payload;
  }

  private writeLog(level: LogLevel, payload: LogPayload) {
    if (process.env.NODE_ENV === 'production') {
      // In production, log JSON for cloud parser agents (Datadog, GCP, Axiom, CloudWatch, etc.)
      const logString = JSON.stringify(payload);
      if (level === 'error') {
        console.error(logString);
      } else if (level === 'warn') {
        console.warn(logString);
      } else {
        console.log(logString);
      }
    } else {
      // In development, pretty-print for better DX
      const color = {
        info: '\x1b[32m',  // green
        warn: '\x1b[33m',  // yellow
        error: '\x1b[31m', // red
        debug: '\x1b[34m', // blue
      }[level];
      const reset = '\x1b[0m';
      console.log(
        `[${payload.timestamp}] ${color}${level.toUpperCase()}${reset}: ${payload.message}`,
        payload.error ? payload.error : '',
        Object.keys(payload).length > 4 ? `\nMeta: ${JSON.stringify(payload, null, 2)}` : ''
      );
    }
  }

  info(message: string, meta?: Record<string, unknown>) {
    this.writeLog('info', this.formatLog('info', message, meta));
  }

  warn(message: string, meta?: Record<string, unknown>, error?: Error | unknown) {
    this.writeLog('warn', this.formatLog('warn', message, meta, error));
  }

  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>) {
    const payload = this.formatLog('error', message, meta, error);
    this.writeLog('error', payload);

    // Automatically send to Sentry for cloud tracking
    const sentryErr = error instanceof Error ? error : new Error(message);
    captureException(sentryErr, { message, ...meta });
  }

  debug(message: string, meta?: Record<string, unknown>) {
    if (process.env.NODE_ENV !== 'production') {
      this.writeLog('debug', this.formatLog('debug', message, meta));
    }
  }
}

export const logger = new StructuredLogger();
export default logger;
