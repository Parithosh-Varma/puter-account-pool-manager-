import { Request, Response, NextFunction } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { getConfig } from '../config';
import { getLogger } from '../logger';

const client = new OAuth2Client();

export interface AuthUser {
  uid: string;
  email: string | null;
  name: string | null;
  picture: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function firebaseAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const config = getConfig();
  const log = getLogger();

  if (config.nodeEnv === 'development') {
    req.user = { uid: 'dev-user', email: 'dev@localhost', name: 'Dev User', picture: null };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: config.googleClientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.sub) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    req.user = {
      uid: payload.sub,
      email: payload.email || null,
      name: payload.name || null,
      picture: payload.picture || null,
    };

    next();
  } catch (err) {
    log.warn('FirebaseAuth', 'Token verification failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
