import { EventEmitter } from 'events';
import fetch from 'node-fetch';
import { Account, HealthStatus, AccountStatus } from '../types';
import { getLogger } from '../logger';
import { getConfig } from '../config';
import { AccountManager } from '../accounts/AccountManager';

export class HealthChecker extends EventEmitter {
  private healthMap: Map<string, HealthStatus> = new Map();
  private accountManager: AccountManager;
  private checkTimer: NodeJS.Timeout | null = null;

  constructor(accountManager: AccountManager) {
    super();
    this.accountManager = accountManager;
  }

  start(): void {
    const config = getConfig();
    const log = getLogger();

    for (const account of this.accountManager.getAllAccounts()) {
      this.initializeHealth(account.id);
    }

    this.checkTimer = setInterval(() => {
      this.runHealthChecks();
    }, config.healthCheckIntervalMs);

    this.accountManager.on('account:added', (account) => {
      this.initializeHealth(account.id);
    });

    this.accountManager.on('account:removed', (account) => {
      this.healthMap.delete(account.id);
    });

    log.info('HealthChecker', `Health checks scheduled every ${config.healthCheckIntervalMs}ms`);
  }

  stop(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  private initializeHealth(accountId: string): void {
    this.healthMap.set(accountId, {
      accountId,
      status: 'pending_verification',
      lastCheck: null,
      lastSuccessAt: null,
      lastErrorAt: null,
      latency: 0,
      errorRate: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      consecutiveFailures: 0,
    });
  }

  async runHealthChecks(): Promise<Map<string, HealthStatus>> {
    const config = getConfig();
    const log = getLogger();
    const accounts = this.accountManager.getActiveAccounts();

    const results = await Promise.allSettled(
      accounts.map(acc => this.checkSingleAccount(acc)),
    );

    results.forEach((result, idx) => {
      if (result.status === 'rejected') {
        log.error('HealthChecker', `Health check for account ${accounts[idx].id} threw`, {
          accountId: accounts[idx].id,
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        });
      }
    });

    return new Map(this.healthMap);
  }

  async checkSingleAccount(account: Account): Promise<HealthStatus> {
    const config = getConfig();
    const log = getLogger();
    const startTime = Date.now();

    try {
      const response = await fetch(`${config.puterApiBaseUrl}/whoami`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${account.token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'PuterAccountPoolManager/1.0',
        },
        signal: AbortSignal.timeout(config.healthCheckTimeoutMs),
      });

      const latency = Date.now() - startTime;
      const health = this.healthMap.get(account.id)!;

      health.lastCheck = new Date();
      health.latency = latency;
      health.totalRequests++;

      if (response.ok) {
        health.lastSuccessAt = new Date();
        health.successfulRequests++;
        health.consecutiveFailures = 0;
        health.status = 'active';

        if (health.errorRate > 0) {
          health.errorRate = health.failedRequests / Math.max(1, health.totalRequests);
        }
      } else {
        health.lastErrorAt = new Date();
        health.failedRequests++;
        health.consecutiveFailures++;
        health.errorRate = health.failedRequests / Math.max(1, health.totalRequests);

        if (response.status === 429 || response.status === 402) {
          health.status = 'exhausted';
        } else if (response.status === 401) {
          health.status = 'error';
        }

        if (health.consecutiveFailures >= 3) {
          log.warn('HealthChecker', `Account ${account.id} has ${health.consecutiveFailures} consecutive failures, marking as error`, {
            accountId: account.id,
            consecutiveFailures: health.consecutiveFailures,
          });
        }
      }

      this.healthMap.set(account.id, health);
      this.emit('health:updated', { accountId: account.id, health });
      return { ...health };
    } catch (err) {
      const latency = Date.now() - startTime;
      const health = this.healthMap.get(account.id)!;
      const errorMsg = err instanceof Error ? err.message : String(err);

      health.lastCheck = new Date();
      health.lastErrorAt = new Date();
      health.latency = latency;
      health.totalRequests++;
      health.failedRequests++;
      health.consecutiveFailures++;
      health.errorRate = health.failedRequests / Math.max(1, health.totalRequests);

      if (health.consecutiveFailures >= 5) {
        health.status = 'error';
      }

      this.healthMap.set(account.id, health);
      this.emit('health:updated', { accountId: account.id, health });

      log.warn('HealthChecker', `Health check failed for ${account.id}`, {
        accountId: account.id,
        error: errorMsg,
        consecutiveFailures: health.consecutiveFailures,
      });

      return { ...health };
    }
  }

  getHealth(accountId: string): HealthStatus | undefined {
    const health = this.healthMap.get(accountId);
    return health ? { ...health } : undefined;
  }

  setHealthStatus(accountId: string, status: HealthStatus): void {
    this.healthMap.set(accountId, status);
  }

  getAllHealth(): HealthStatus[] {
    return Array.from(this.healthMap.values()).map(h => ({ ...h }));
  }

  isHealthy(accountId: string): boolean {
    const health = this.healthMap.get(accountId);
    return health !== undefined && health.status === 'active';
  }
}
