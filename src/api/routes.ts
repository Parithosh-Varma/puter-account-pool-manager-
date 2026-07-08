import { Router, Request, Response } from 'express';
import { AccountManager } from '../accounts/AccountManager';
import { CreditTracker } from '../credit/CreditTracker';
import { HealthChecker } from '../health/HealthChecker';
import { RequestScheduler } from '../scheduler/RequestScheduler';
import { AuthenticationManager } from '../auth/AuthenticationManager';
import { CreateAccountInput, UpdateAccountInput, AIRequestInput, DashboardStats, SchedulerStrategy } from '../types';
import { getLogger } from '../logger';
import { getConfig } from '../config';

export function createRouter(
  accountManager: AccountManager,
  creditTracker: CreditTracker,
  healthChecker: HealthChecker,
  requestScheduler: RequestScheduler,
  authManager: AuthenticationManager,
): Router {
  const router = Router();
  const log = getLogger();

  // List accounts
  router.get('/accounts', (_req: Request, res: Response) => {
    const accounts = accountManager.getAllAccounts();
    const result = accounts.map(acc => {
      const health = healthChecker.getHealth(acc.id) || null;
      const credit = creditTracker.getCredit(acc.id) || null;
      return {
        ...acc,
        token: '***redacted***',
        health,
        credit,
      };
    });
    res.json({ accounts: result, total: result.length });
  });

  // Get single account
  router.get('/accounts/:id', (req: Request, res: Response) => {
    const account = accountManager.getAccount(req.params.id as string);
    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    const health = healthChecker.getHealth(account.id) || null;
    const credit = creditTracker.getCredit(account.id) || null;
    res.json({
      ...account,
      token: '***redacted***',
      health,
      credit,
    });
  });

  // Add account
  router.post('/accounts', async (req: Request, res: Response) => {
    try {
      const input: CreateAccountInput = {
        name: req.body.name,
        token: req.body.token,
        model: req.body.model,
        dailyCreditLimit: req.body.dailyCreditLimit,
        metadata: req.body.metadata,
      };

      if (!input.name || !input.token) {
        res.status(400).json({ error: 'name and token are required' });
        return;
      }

      const account = accountManager.addAccount(input);

      const verificationResult = await authManager.verifyAccount(account);
      if (verificationResult.valid) {
        accountManager.setAccountStatus(account.id, 'active');
      }

      res.status(201).json({
        ...account,
        token: '***redacted***',
        verification: verificationResult,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      log.error('API', 'Failed to add account', { error: errorMsg });
      res.status(400).json({ error: errorMsg });
    }
  });

  // Remove account
  router.delete('/accounts/:id', (req: Request, res: Response) => {
    const removed = accountManager.removeAccount(req.params.id as string);
    if (!removed) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    res.json({ success: true, message: 'Account removed' });
  });

  // Update account
  router.patch('/accounts/:id', (req: Request, res: Response) => {
    const input: UpdateAccountInput = {};
    if (req.body.name !== undefined) input.name = req.body.name;
    if (req.body.token !== undefined) input.token = req.body.token;
    if (req.body.model !== undefined) input.model = req.body.model;
    if (req.body.status !== undefined) input.status = req.body.status;
    if (req.body.dailyCreditLimit !== undefined) input.dailyCreditLimit = req.body.dailyCreditLimit;
    if (req.body.metadata !== undefined) input.metadata = req.body.metadata;

    const updated = accountManager.updateAccount(req.params.id as string, input);
    if (!updated) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    res.json({ ...updated, token: '***redacted***' });
  });

  // View account status
  router.get('/accounts/:id/status', (req: Request, res: Response) => {
    const account = accountManager.getAccount(req.params.id as string);
    if (!account) {
      res.status(404).json({ error: 'Account not found' });
      return;
    }
    const health = healthChecker.getHealth(account.id);
    const credit = creditTracker.getCredit(account.id);
    res.json({
      id: account.id,
      name: account.name,
      status: account.status,
      health: health || null,
      credit: credit || null,
    });
  });

  // Remaining credit
  router.get('/accounts/:id/credit', (req: Request, res: Response) => {
    const credit = creditTracker.getCredit(req.params.id as string);
    if (!credit) {
      res.status(404).json({ error: 'Account not found or no credit data' });
      return;
    }
    res.json(credit);
  });

  // Submit AI request
  router.post('/ai/chat', async (req: Request, res: Response) => {
    try {
      const input: AIRequestInput = {
        model: req.body.model || 'gpt-4o-mini',
        prompt: req.body.prompt,
        stream: req.body.stream ?? false,
        maxTokens: req.body.maxTokens,
        temperature: req.body.temperature,
      };

      if (!input.prompt) {
        res.status(400).json({ error: 'prompt is required' });
        return;
      }

      const result = await requestScheduler.submitRequest(input);
      res.json(result);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      log.error('API', 'AI request failed', { error: errorMsg });
      res.status(500).json({ success: false, error: errorMsg, response: null });
    }
  });

  // Dashboard statistics
  router.get('/stats', (_req: Request, res: Response) => {
    const accounts = accountManager.getAllAccounts();
    const poolStats = {
      totalAccounts: accountManager.getCount(),
      activeAccounts: accountManager.getActiveCount(),
      disabledAccounts: accounts.filter(a => a.status === 'disabled').length,
      exhaustedAccounts: accounts.filter(a => a.status === 'exhausted').length,
      errorAccounts: accounts.filter(a => a.status === 'error').length,
      ...requestScheduler.getStats(),
      uptime: process.uptime(),
      strategy: getStrategy(),
    };

    res.json(poolStats);
  });

  // Full dashboard data
  router.get('/dashboard', (_req: Request, res: Response) => {
    const accounts = accountManager.getAllAccounts();
    const dashboard: DashboardStats = {
      pool: {
        totalAccounts: accountManager.getCount(),
        activeAccounts: accountManager.getActiveCount(),
        disabledAccounts: accounts.filter(a => a.status === 'disabled').length,
        exhaustedAccounts: accounts.filter(a => a.status === 'exhausted').length,
        errorAccounts: accounts.filter(a => a.status === 'error').length,
        ...requestScheduler.getStats(),
        uptime: process.uptime(),
        strategy: getStrategy(),
      },
      accounts: accounts.map(acc => ({
        id: acc.id,
        name: acc.name,
        status: acc.status,
        health: healthChecker.getHealth(acc.id) || {
          accountId: acc.id,
          status: acc.status,
          lastCheck: null,
          lastSuccessAt: null,
          lastErrorAt: null,
          latency: 0,
          errorRate: 0,
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
          consecutiveFailures: 0,
        },
        credit: creditTracker.getCredit(acc.id) || {
          accountId: acc.id,
          remaining: 0,
          limit: acc.dailyCreditLimit,
          used: 0,
          resetAt: new Date(),
          lastUpdated: new Date(),
        },
      })),
      recentRequests: requestScheduler.getRequestHistory(50),
    };

    res.json(dashboard);
  });

  // Health check endpoints
  router.get('/health', async (_req: Request, res: Response) => {
    const allHealth = healthChecker.getAllHealth();
    res.json({
      status: allHealth.some(h => h.status === 'active') ? 'ok' : 'degraded',
      checks: allHealth,
      timestamp: new Date().toISOString(),
    });
  });

  router.post('/health/run', async (_req: Request, res: Response) => {
    const results = await healthChecker.runHealthChecks();
    const output: Record<string, unknown> = {};
    results.forEach((health, id) => { output[id] = health; });
    res.json({ results: output });
  });

  // Queue info
  router.get('/queue', (_req: Request, res: Response) => {
    res.json({
      queuedRequests: requestScheduler.getQueueLength(),
      activeRequests: requestScheduler.getActiveRequestCount(),
    });
  });

  // Strategy management
  router.get('/strategy', (_req: Request, res: Response) => {
    res.json({ strategy: getStrategy() });
  });

  router.put('/strategy', (req: Request, res: Response) => {
    const strategy = req.body.strategy as SchedulerStrategy;
    if (strategy !== 'round-robin' && strategy !== 'least-used') {
      res.status(400).json({ error: 'Strategy must be "round-robin" or "least-used"' });
      return;
    }
    requestScheduler.setStrategy(strategy);
    res.json({ strategy });
  });

  // History
  router.get('/history', (req: Request, res: Response) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);
    res.json({ requests: requestScheduler.getRequestHistory(limit) });
  });

  function getStrategy(): SchedulerStrategy {
    return getConfig().schedulerStrategy;
  }

  return router;
}
