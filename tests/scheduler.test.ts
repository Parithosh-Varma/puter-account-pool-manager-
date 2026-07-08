import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AccountManager } from '../src/accounts/AccountManager';
import { CreditTracker } from '../src/credit/CreditTracker';
import { HealthChecker } from '../src/health/HealthChecker';
import { RequestScheduler } from '../src/scheduler/RequestScheduler';
import { resetConfig, loadConfig } from '../src/config';
import { resetLogger } from '../src/logger';

process.env.ACCOUNTS = '[]';
process.env.LOG_LEVEL = 'silent';

vi.mock('node-fetch', () => {
  const mockFetch = vi.fn();
  return {
    default: mockFetch,
  };
});

describe('RequestScheduler', () => {
  let accountManager: AccountManager;
  let creditTracker: CreditTracker;
  let healthChecker: HealthChecker;
  let scheduler: RequestScheduler;

  beforeEach(async () => {
    resetConfig();
    resetLogger();
    loadConfig();

    accountManager = new AccountManager();
    await accountManager.initialize();

    const acc1 = accountManager.addAccount({
      id: 'acc-1',
      name: 'Account 1',
      token: 'token-1',
      dailyCreditLimit: 100,
    });
    const acc2 = accountManager.addAccount({
      id: 'acc-2',
      name: 'Account 2',
      token: 'token-2',
      dailyCreditLimit: 100,
    });

    accountManager.setAccountStatus(acc1.id, 'active');
    accountManager.setAccountStatus(acc2.id, 'active');

    creditTracker = new CreditTracker(accountManager);
    creditTracker.start();

    healthChecker = new HealthChecker(accountManager);
    // Set health directly via the test helper
    for (const acc of accountManager.getAllAccounts()) {
      healthChecker.setHealthStatus(acc.id, {
        accountId: acc.id,
        status: 'active',
        lastCheck: new Date(),
        lastSuccessAt: new Date(),
        lastErrorAt: null,
        latency: 100,
        errorRate: 0,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        consecutiveFailures: 0,
      });
    }

    scheduler = new RequestScheduler(accountManager, creditTracker, healthChecker);
  });

  afterEach(() => {
    creditTracker.stop();
    healthChecker.stop();
  });

  describe('getStats', () => {
    it('should return zero-initialized stats', () => {
      const stats = scheduler.getStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.successfulRequests).toBe(0);
      expect(stats.failedRequests).toBe(0);
      expect(stats.queuedRequests).toBe(0);
      expect(stats.activeRequests).toBe(0);
    });
  });

  describe('setStrategy', () => {
    it('should change strategy without error', () => {
      scheduler.setStrategy('least-used');
      scheduler.setStrategy('round-robin');
    });
  });

  describe('submitRequest', () => {
    it('should return error when no accounts available', async () => {
      accountManager.removeAccount('acc-1');
      accountManager.removeAccount('acc-2');

      const result = await scheduler.submitRequest({
        model: 'gpt-4o-mini',
        prompt: 'Hello',
      });

      expect(result.success).toBe(false);
      expect(result.accountId).toBeNull();
      expect(result.error).toContain('No accounts');
    });
  });

  describe('getQueueLength / getActiveRequestCount', () => {
    it('should report queue metrics', () => {
      expect(scheduler.getQueueLength()).toBe(0);
      expect(scheduler.getActiveRequestCount()).toBe(0);
    });
  });

  describe('getRequestHistory', () => {
    it('should return empty initially', () => {
      expect(scheduler.getRequestHistory()).toHaveLength(0);
    });
  });
});
