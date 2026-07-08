import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import http from 'http';
import fetch from 'node-fetch';
import { AccountManager } from '../src/accounts/AccountManager';
import { CreditTracker } from '../src/credit/CreditTracker';
import { HealthChecker } from '../src/health/HealthChecker';
import { RequestScheduler } from '../src/scheduler/RequestScheduler';
import { AuthenticationManager } from '../src/auth/AuthenticationManager';
import { createRouter } from '../src/api/routes';
import { resetConfig, loadConfig } from '../src/config';
import { resetLogger } from '../src/logger';

process.env.ACCOUNTS = '[]';
process.env.LOG_LEVEL = 'silent';
process.env.NODE_ENV = 'development';

describe('Integration: API + Core Modules', () => {
  let server: http.Server;
  let baseUrl: string;
  let accountManager: AccountManager;
  let creditTracker: CreditTracker;
  let healthChecker: HealthChecker;
  let requestScheduler: RequestScheduler;
  let authManager: AuthenticationManager;

  beforeAll(async () => {
    resetConfig();
    resetLogger();
    loadConfig();

    accountManager = new AccountManager();
    await accountManager.initialize();
    authManager = new AuthenticationManager();
    creditTracker = new CreditTracker(accountManager);
    healthChecker = new HealthChecker(accountManager);
    requestScheduler = new RequestScheduler(accountManager, creditTracker, healthChecker);

    const app = express();
    app.use(express.json());
    const router = createRouter(accountManager, creditTracker, healthChecker, requestScheduler, authManager);
    app.use('/api', router);
    app.get('/healthz', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    return new Promise<void>(resolve => {
      server = app.listen(0, () => {
        const addr = server.address();
        baseUrl = `http://localhost:${(addr as { port: number }).port}`;
        resolve();
      });
    });
  });

  afterAll(() => {
    creditTracker.stop();
    healthChecker.stop();
    server?.close();
  });

  describe('GET /api/accounts', () => {
    it('should return empty list initially', async () => {
      const res = await fetch(`${baseUrl}/api/accounts`);
      expect(res.status).toBe(200);
      const data = await res.json() as { accounts: unknown[]; total: number };
      expect(data.accounts).toHaveLength(0);
      expect(data.total).toBe(0);
    });
  });

  describe('POST /api/accounts', () => {
    it('should add a new account', async () => {
      const res = await fetch(`${baseUrl}/api/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Integration Test',
          token: 'test-token-int',
          dailyCreditLimit: 50,
        }),
      });

      expect(res.status).toBe(201);
      const data = await res.json() as { id: string; name: string; token: string };
      expect(data.name).toBe('Integration Test');
      expect(data.token).toBe('***redacted***');
      expect(data.id).toBeDefined();
    });

    it('should reject missing name', async () => {
      const res = await fetch(`${baseUrl}/api/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'tok' }),
      });
      expect(res.status).toBe(400);
    });

    it('should reject missing token', async () => {
      const res = await fetch(`${baseUrl}/api/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'No Token' }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/accounts/:id', () => {
    it('should return a single account', async () => {
      const addRes = await fetch(`${baseUrl}/api/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Single', token: 'single-tok' }),
      });
      const added = await addRes.json() as { id: string };

      const res = await fetch(`${baseUrl}/api/accounts/${added.id}`);
      expect(res.status).toBe(200);
      const data = await res.json() as { id: string; name: string };
      expect(data.name).toBe('Single');
    });

    it('should return 404 for unknown', async () => {
      const res = await fetch(`${baseUrl}/api/accounts/nonexistent`);
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/accounts/:id', () => {
    it('should update account status', async () => {
      const addRes = await fetch(`${baseUrl}/api/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Patch Me', token: 'patch-tok' }),
      });
      const added = await addRes.json() as { id: string };

      const res = await fetch(`${baseUrl}/api/accounts/${added.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'disabled' }),
      });
      expect(res.status).toBe(200);
      const data = await res.json() as { status: string };
      expect(data.status).toBe('disabled');
    });
  });

  describe('DELETE /api/accounts/:id', () => {
    it('should remove an account', async () => {
      const addRes = await fetch(`${baseUrl}/api/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Delete Me', token: 'del-tok' }),
      });
      const added = await addRes.json() as { id: string };

      const res = await fetch(`${baseUrl}/api/accounts/${added.id}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(200);

      const getRes = await fetch(`${baseUrl}/api/accounts/${added.id}`);
      expect(getRes.status).toBe(404);
    });
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      expect(res.status).toBe(200);
      const data = await res.json() as { status: string; checks: unknown[] };
      expect(data.status).toBeDefined();
      expect(Array.isArray(data.checks)).toBe(true);
    });
  });

  describe('GET /api/stats', () => {
    it('should return pool statistics', async () => {
      const res = await fetch(`${baseUrl}/api/stats`);
      expect(res.status).toBe(200);
      const data = await res.json() as { totalAccounts: number; activeAccounts: number };
      expect(typeof data.totalAccounts).toBe('number');
      expect(typeof data.activeAccounts).toBe('number');
    });
  });

  describe('GET /api/queue', () => {
    it('should return queue info', async () => {
      const res = await fetch(`${baseUrl}/api/queue`);
      expect(res.status).toBe(200);
      const data = await res.json() as { queuedRequests: number; activeRequests: number };
      expect(typeof data.queuedRequests).toBe('number');
      expect(typeof data.activeRequests).toBe('number');
    });
  });

  describe('GET /api/strategy', () => {
    it('should return current strategy', async () => {
      const res = await fetch(`${baseUrl}/api/strategy`);
      expect(res.status).toBe(200);
      const data = await res.json() as { strategy: string };
      expect(data.strategy).toBeDefined();
    });
  });

  describe('PUT /api/strategy', () => {
    it('should update strategy', async () => {
      const res = await fetch(`${baseUrl}/api/strategy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy: 'least-used' }),
      });
      expect(res.status).toBe(200);
      const data = await res.json() as { strategy: string };
      expect(data.strategy).toBe('least-used');
    });

    it('should reject invalid strategy', async () => {
      const res = await fetch(`${baseUrl}/api/strategy`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategy: 'invalid' }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/dashboard', () => {
    it('should return dashboard data', async () => {
      const res = await fetch(`${baseUrl}/api/dashboard`);
      expect(res.status).toBe(200);
      const data = await res.json() as {
        pool: Record<string, unknown>;
        accounts: unknown[];
        recentRequests: unknown[];
      };
      expect(data.pool).toBeDefined();
      expect(Array.isArray(data.accounts)).toBe(true);
      expect(Array.isArray(data.recentRequests)).toBe(true);
    });
  });

  describe('GET /api/history', () => {
    it('should return request history', async () => {
      const res = await fetch(`${baseUrl}/api/history?limit=10`);
      expect(res.status).toBe(200);
      const data = await res.json() as { requests: unknown[] };
      expect(Array.isArray(data.requests)).toBe(true);
    });
  });

  describe('GET /healthz', () => {
    it('should return ok', async () => {
      const res = await fetch(`${baseUrl}/healthz`);
      expect(res.status).toBe(200);
      const data = await res.json() as { status: string };
      expect(data.status).toBe('ok');
    });
  });
});
