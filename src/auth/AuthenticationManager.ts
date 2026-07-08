import { EventEmitter } from 'events';
import fetch from 'node-fetch';
import { Account, AccountStatus } from '../types';
import { getLogger } from '../logger';
import { getConfig } from '../config';

export interface AuthResult {
  valid: boolean;
  accountId: string;
  user?: Record<string, unknown>;
  error?: string;
}

export class AuthenticationManager extends EventEmitter {
  private verificationInProgress = new Set<string>();

  async verifyAccount(account: Account): Promise<AuthResult> {
    const log = getLogger();
    const config = getConfig();

    if (this.verificationInProgress.has(account.id)) {
      return { valid: false, accountId: account.id, error: 'Verification already in progress' };
    }

    this.verificationInProgress.add(account.id);

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

      if (response.ok) {
        const data = await response.json() as Record<string, unknown>;
        log.info('AuthenticationManager', `Account ${account.id} verified successfully`, {
          accountId: account.id,
        });
        return { valid: true, accountId: account.id, user: data };
      }

      if (response.status === 401) {
        log.warn('AuthenticationManager', `Account ${account.id} has invalid token`, {
          accountId: account.id,
          statusCode: response.status,
        });
        return { valid: false, accountId: account.id, error: 'Invalid token (401)' };
      }

      if (response.status === 403) {
        log.warn('AuthenticationManager', `Account ${account.id} access denied`, {
          accountId: account.id,
          statusCode: response.status,
        });
        return { valid: false, accountId: account.id, error: 'Access denied (403)' };
      }

      log.warn('AuthenticationManager', `Account ${account.id} verification returned ${response.status}`, {
        accountId: account.id,
        statusCode: response.status,
      });
      return { valid: false, accountId: account.id, error: `Unexpected status: ${response.status}` };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      log.error('AuthenticationManager', `Account ${account.id} verification failed`, {
        accountId: account.id,
        error: errorMsg,
      });
      return { valid: false, accountId: account.id, error: errorMsg };
    } finally {
      this.verificationInProgress.delete(account.id);
    }
  }

  async verifyMultiple(accounts: Account[]): Promise<Map<string, AuthResult>> {
    const results = new Map<string, AuthResult>();
    const batch = await Promise.allSettled(
      accounts.map(acc => this.verifyAccount(acc)),
    );
    accounts.forEach((acc, idx) => {
      const result = batch[idx];
      if (result.status === 'fulfilled') {
        results.set(acc.id, result.value);
      } else {
        results.set(acc.id, {
          valid: false,
          accountId: acc.id,
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        });
      }
    });
    return results;
  }
}
