import dotenv from 'dotenv';
import { AppConfig, LogLevel, SchedulerStrategy } from '../types';

dotenv.config();

function envInt(key: string, defaultVal: number): number {
  const val = process.env[key];
  if (val === undefined || val === '') return defaultVal;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? defaultVal : parsed;
}

function parseAccounts(): AppConfig['accounts'] {
  const json = process.env.ACCOUNTS;
  if (json) {
    try {
      return JSON.parse(json);
    } catch {
      console.warn('[Config] Failed to parse ACCOUNTS env var, trying individual vars');
    }
  }

  const accounts: AppConfig['accounts'] = [];
  let idx = 1;
  while (process.env[`ACCOUNT_${idx}_ID`] && process.env[`ACCOUNT_${idx}_TOKEN`]) {
    accounts.push({
      id: process.env[`ACCOUNT_${idx}_ID`]!,
      name: process.env[`ACCOUNT_${idx}_NAME`] || `Account ${idx}`,
      token: process.env[`ACCOUNT_${idx}_TOKEN`]!,
      dailyCreditLimit: envInt(`ACCOUNT_${idx}_DAILY_LIMIT`, 100),
    });
    idx++;
  }
  return accounts;
}

function parseStrategy(): SchedulerStrategy {
  const val = process.env.SCHEDULER_STRATEGY || 'round-robin';
  if (val !== 'round-robin' && val !== 'least-used') {
    console.warn(`[Config] Unknown strategy "${val}", falling back to round-robin`);
    return 'round-robin';
  }
  return val;
}

function parseLogLevel(): LogLevel {
  const val = process.env.LOG_LEVEL || 'info';
  if (!['error', 'warn', 'info', 'debug'].includes(val)) {
    return 'info';
  }
  return val as LogLevel;
}

let cachedConfig: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (cachedConfig) return cachedConfig;

  const config: AppConfig = {
    port: envInt('PORT', 3000),
    nodeEnv: process.env.NODE_ENV || 'development',
    puterApiBaseUrl: process.env.PUTER_API_BASE_URL || 'https://api.puter.com',
    accounts: parseAccounts(),
    schedulerStrategy: parseStrategy(),
    healthCheckIntervalMs: envInt('HEALTH_CHECK_INTERVAL_MS', 60000),
    healthCheckTimeoutMs: envInt('HEALTH_CHECK_TIMEOUT_MS', 10000),
    creditResetIntervalMs: envInt('CREDIT_RESET_INTERVAL_MS', 86400000),
    defaultDailyCreditLimit: envInt('DEFAULT_DAILY_CREDIT_LIMIT', 100),
    maxQueueSize: envInt('MAX_QUEUE_SIZE', 1000),
    requestTimeoutMs: envInt('REQUEST_TIMEOUT_MS', 30000),
    maxRetries: envInt('MAX_RETRIES', 3),
    logLevel: parseLogLevel(),
    logFile: process.env.LOG_FILE || 'logs/account-pool.log',
    apiKey: process.env.API_KEY || 'dev-api-key',
    googleClientId: process.env.GOOGLE_CLIENT_ID || '275728447491-g2f03lsnon3rritavjsbdg5pmeaj3hsa.apps.googleusercontent.com',
  };

  cachedConfig = config;
  return config;
}

export function getConfig(): AppConfig {
  if (!cachedConfig) return loadConfig();
  return cachedConfig;
}

export function resetConfig(): void {
  cachedConfig = null;
}
