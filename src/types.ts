export type AccountStatus = 'active' | 'disabled' | 'exhausted' | 'error' | 'pending_verification';

export type SchedulerStrategy = 'round-robin' | 'least-used';

export interface Account {
  id: string;
  name: string;
  token: string;
  model?: string;
  status: AccountStatus;
  dailyCreditLimit: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, unknown>;
}

export interface CreateAccountInput {
  id?: string;
  name: string;
  token: string;
  model?: string;
  dailyCreditLimit?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateAccountInput {
  name?: string;
  token?: string;
  model?: string;
  status?: AccountStatus;
  dailyCreditLimit?: number;
  metadata?: Record<string, unknown>;
}

export interface CreditInfo {
  accountId: string;
  remaining: number;
  limit: number;
  used: number;
  resetAt: Date;
  lastUpdated: Date;
}

export interface HealthStatus {
  accountId: string;
  status: AccountStatus;
  lastCheck: Date | null;
  lastSuccessAt: Date | null;
  lastErrorAt: Date | null;
  latency: number;
  errorRate: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  consecutiveFailures: number;
}

export interface RequestRecord {
  id: string;
  accountId: string | null;
  model: string;
  prompt: string;
  response: string | null;
  latency: number;
  success: boolean;
  retryCount: number;
  statusCode: number | null;
  error: string | null;
  timestamp: Date;
}

export interface QueuedRequest {
  id: string;
  model: string;
  prompt: string;
  resolve: (value: AIRequestResult) => void;
  reject: (reason: unknown) => void;
  retryCount: number;
  queuedAt: Date;
  timeout: NodeJS.Timeout;
}

export interface AIRequestInput {
  model: string;
  prompt: string;
  stream?: boolean;
  maxTokens?: number;
  temperature?: number;
}

export interface AIRequestResult {
  success: boolean;
  response: string | null;
  accountId: string | null;
  latency: number;
  retryCount: number;
  statusCode: number | null;
  error: string | null;
}

export interface PoolStats {
  totalAccounts: number;
  activeAccounts: number;
  disabledAccounts: number;
  exhaustedAccounts: number;
  errorAccounts: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  queuedRequests: number;
  averageLatency: number;
  uptime: number;
  strategy: SchedulerStrategy;
}

export interface DashboardStats {
  pool: PoolStats;
  accounts: Array<{
    id: string;
    name: string;
    status: AccountStatus;
    health: HealthStatus;
    credit: CreditInfo;
  }>;
  recentRequests: RequestRecord[];
}

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  module: string;
  accountId?: string | null;
  requestId?: string | null;
  latency?: number;
  error?: string | null;
  status?: string;
  statusCode?: number;
  consecutiveFailures?: number;
  used?: number;
  model?: string;
  ip?: string;
  metadata?: Record<string, unknown>;
}

export interface AppConfig {
  port: number;
  nodeEnv: string;
  puterApiBaseUrl: string;
  accounts: Array<{
    id: string;
    name: string;
    token: string;
    dailyCreditLimit: number;
  }>;
  schedulerStrategy: SchedulerStrategy;
  healthCheckIntervalMs: number;
  healthCheckTimeoutMs: number;
  creditResetIntervalMs: number;
  defaultDailyCreditLimit: number;
  maxQueueSize: number;
  requestTimeoutMs: number;
  maxRetries: number;
  logLevel: LogLevel;
  logFile: string;
  apiKey: string;
}
