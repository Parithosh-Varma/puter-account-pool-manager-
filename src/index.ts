import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { loadConfig } from './config';
import { getLogger } from './logger';
import { AccountManager } from './accounts/AccountManager';
import { AuthenticationManager } from './auth/AuthenticationManager';
import { CreditTracker } from './credit/CreditTracker';
import { HealthChecker } from './health/HealthChecker';
import { RequestScheduler } from './scheduler/RequestScheduler';
import { Database } from './database';
import { createRouter } from './api/routes';
import { createOpenAIRouter } from './api/openai';
import { apiKeyAuth, requestLogger } from './api/middleware';
import { firebaseAuth } from './auth/FirebaseAuth';

async function main(): Promise<void> {
  const config = loadConfig();
  const log = getLogger();

  log.info('Main', 'Starting Puter Account Pool Manager', {
    metadata: {
      nodeEnv: config.nodeEnv,
      accounts: config.accounts.length,
      strategy: config.schedulerStrategy,
    },
  });

  // Initialize modules
  const database = new Database();
  database.initialize();

  const accountManager = new AccountManager(database);
  await accountManager.initialize();

  const authManager = new AuthenticationManager();
  const creditTracker = new CreditTracker(accountManager);
  const healthChecker = new HealthChecker(accountManager);
  const requestScheduler = new RequestScheduler(accountManager, creditTracker, healthChecker);

  // Wire database to record responses
  requestScheduler.on('request:completed', (record) => {
    database.storeResponse(record);
  });

  creditTracker.start();
  healthChecker.start();

  // Verify all accounts on startup
  log.info('Main', 'Verifying all accounts on startup');
  const verificationResults = await authManager.verifyMultiple(accountManager.getAllAccounts());
  for (const [accountId, result] of verificationResults) {
    if (result.valid) {
      accountManager.setAccountStatus(accountId, 'active');
      log.info('Main', `Account ${accountId} verified and active`);
    } else {
      accountManager.setAccountStatus(accountId, 'error');
      log.warn('Main', `Account ${accountId} verification failed: ${result.error}`);
    }
  }

  // Run initial health check
  await healthChecker.runHealthChecks();

  // Setup Express
  const app = express();

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://accounts.google.com"],
        frameSrc: ["'self'", "https://accounts.google.com"],
        connectSrc: ["'self'", "https://accounts.google.com"],
        imgSrc: ["'self'", "data:", "https://*.google.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  }));
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(requestLogger);

  // Rate limiting for the API
  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: config.nodeEnv === 'production' ? 100 : 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' },
  });
  app.use('/api/', limiter);

  // Mount routes
  const router = createRouter(
    accountManager,
    creditTracker,
    healthChecker,
    requestScheduler,
    authManager,
    database,
  );
  app.use('/api', router);

  // OpenAI-compatible API
  const openaiRouter = createOpenAIRouter(requestScheduler);
  app.use('/v1', openaiRouter);

  // Authenticated API routes
  if (config.nodeEnv === 'production') {
    app.use(/^\/(api|v1)\//, (req, res, next) => {
      if (req.path.startsWith('/api/auth/')) return next();
      firebaseAuth(req, res, next);
    });
  }

  // Serve dashboard static files (built by Dockerfile into ./public)
  app.use(express.static('public'));

  // Health probe for Docker/K8s
  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/readyz', (_req, res) => {
    const hasActive = accountManager.hasActiveAccounts();
    res.status(hasActive ? 200 : 503).json({
      status: hasActive ? 'ready' : 'not ready',
      activeAccounts: accountManager.getActiveCount(),
    });
  });

  // Start server
  const server = app.listen(config.port, () => {
    log.info('Main', `Server listening on port ${config.port}`, {
      metadata: {
        port: config.port,
        apiEndpoint: `http://localhost:${config.port}/api`,
        healthEndpoint: `http://localhost:${config.port}/healthz`,
      },
    });
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    log.info('Main', `Received ${signal}, shutting down gracefully`);
    server.close(() => {
      creditTracker.stop();
      healthChecker.stop();
      log.info('Main', 'Shutdown complete');
      process.exit(0);
    });

    setTimeout(() => {
      log.error('Main', 'Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('uncaughtException', (err) => {
    log.error('Main', 'Uncaught exception', { error: err.message, metadata: { stack: err.stack } });
    shutdown('uncaughtException');
  });
  process.on('unhandledRejection', (reason) => {
    log.error('Main', 'Unhandled rejection', {
      error: reason instanceof Error ? reason.message : String(reason),
    });
  });
}

main().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
