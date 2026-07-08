import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { LogEntry, LogLevel } from '../types';
import { getConfig } from '../config';

class Logger {
  private logger: winston.Logger;

  constructor() {
    const config = getConfig();

    const logDir = path.dirname(config.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
          winston.format.printf(({ timestamp, level, message, module, accountId, requestId, latency, error, ...meta }) => {
            let line = `${timestamp} [${level}] [${module}]`;
            if (accountId) line += ` [account:${accountId}]`;
            if (requestId) line += ` [req:${requestId}]`;
            if (latency !== undefined) line += ` [${latency}ms]`;
            line += ` ${message}`;
            if (error) line += ` | error: ${error}`;
            const rest = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
            return line + rest;
          }),
        ),
        level: config.logLevel,
      }),
    ];

    if (config.nodeEnv === 'production') {
      transports.push(
        new winston.transports.File({
          filename: config.logFile,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          ),
          level: config.logLevel,
          maxsize: 10 * 1024 * 1024,
          maxFiles: 5,
        }),
      );
    }

    this.logger = winston.createLogger({
      level: config.logLevel,
      transports,
    });
  }

  private log(level: LogLevel, entry: Omit<LogEntry, 'timestamp'>): void {
    this.logger.log(level, entry.message, {
      module: entry.module,
      accountId: entry.accountId,
      requestId: entry.requestId,
      latency: entry.latency,
      error: entry.error,
      status: entry.status,
      statusCode: entry.statusCode,
      consecutiveFailures: entry.consecutiveFailures,
      used: entry.used,
      model: entry.model,
      ip: entry.ip,
      ...(entry.metadata ? { metadata: entry.metadata } : {}),
    });
  }

  info(module: string, message: string, meta?: Partial<Omit<LogEntry, 'timestamp' | 'level' | 'message' | 'module'>>): void {
    this.log('info', { module, message, ...meta } as Omit<LogEntry, 'timestamp'>);
  }

  warn(module: string, message: string, meta?: Partial<Omit<LogEntry, 'timestamp' | 'level' | 'message' | 'module'>>): void {
    this.log('warn', { module, message, ...meta } as Omit<LogEntry, 'timestamp'>);
  }

  error(module: string, message: string, meta?: Partial<Omit<LogEntry, 'timestamp' | 'level' | 'message' | 'module'>>): void {
    this.log('error', { module, message, ...meta } as Omit<LogEntry, 'timestamp'>);
  }

  debug(module: string, message: string, meta?: Partial<Omit<LogEntry, 'timestamp' | 'level' | 'message' | 'module'>>): void {
    this.log('debug', { module, message, ...meta } as Omit<LogEntry, 'timestamp'>);
  }
}

let instance: Logger | null = null;

export function getLogger(): Logger {
  if (!instance) {
    instance = new Logger();
  }
  return instance;
}

export function resetLogger(): void {
  instance = null;
}

export default Logger;
