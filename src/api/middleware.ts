import { Request, Response, NextFunction } from 'express';
import { getConfig } from '../config';
import { getLogger } from '../logger';

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const config = getConfig();
  const log = getLogger();

  if (config.nodeEnv === 'development') {
    return next();
  }

  const apiKey = req.headers['x-api-key'] as string;
  if (!apiKey || apiKey !== config.apiKey) {
    log.warn('Middleware', 'Unauthorized API access attempt', {
      ip: req.ip,
      metadata: { path: req.path } as Record<string, unknown>,
    });
    res.status(401).json({ error: 'Unauthorized: invalid or missing API key' });
    return;
  }

  next();
}

export function requestLogger(req: Request, _res: Response, next: NextFunction): void {
  const log = getLogger();
  log.info('HTTP', `${req.method} ${req.path}`, {
    ip: req.ip,
    metadata: { query: req.query, path: req.path } as Record<string, unknown>,
  });
  next();
}
