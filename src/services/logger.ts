/**
 * 🛡️ Nexus Mind Vault — Zero-Knowledge Structured Telemetry & Audit Logger
 * Ensures all passphrases, AES-256 keys, and plaintexts are redacted before logging.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'audit';

export interface StructuredLogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
}

class ZeroKnowledgeLogger {
  private inMemoryLogs: StructuredLogEntry[] = [];
  private readonly maxBufferSize = 200;

  private sanitizeContext(context?: Record<string, any>): Record<string, any> | undefined {
    if (!context) return undefined;
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(context)) {
      const lower = key.toLowerCase();
      if (
        lower.includes('pin') ||
        lower.includes('secret') ||
        lower.includes('passphrase') ||
        lower.includes('key') ||
        lower.includes('content') ||
        lower.includes('token')
      ) {
        sanitized[key] = '[REDACTED_ZERO_KNOWLEDGE]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeContext(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>) {
    const entry: StructuredLogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: this.sanitizeContext(context),
    };

    this.inMemoryLogs.push(entry);
    if (this.inMemoryLogs.length > this.maxBufferSize) {
      this.inMemoryLogs.shift();
    }

    const logStr = `[${entry.timestamp}] [${level.toUpperCase()}] ${message}`;
    if (level === 'error') {
      console.error(logStr, entry.context || '');
    } else if (level === 'warn') {
      console.warn(logStr, entry.context || '');
    } else {
      console.info(logStr, entry.context || '');
    }
  }

  public debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context);
  }

  public info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }

  public warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context);
  }

  public error(message: string, context?: Record<string, any>) {
    this.log('error', message, context);
  }

  public audit(action: string, context?: Record<string, any>) {
    this.log('audit', `[AUDIT] ${action}`, context);
  }

  public getTelemetryLogs(): StructuredLogEntry[] {
    return [...this.inMemoryLogs];
  }
}

export const zkLogger = new ZeroKnowledgeLogger();
