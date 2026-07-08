import { EventEmitter } from 'events';
import { CreditInfo } from '../types';
import { getLogger } from '../logger';
import { getConfig } from '../config';
import { AccountManager } from '../accounts/AccountManager';

export class CreditTracker extends EventEmitter {
  private creditMap: Map<string, CreditInfo> = new Map();
  private accountManager: AccountManager;
  private resetTimer: NodeJS.Timeout | null = null;

  constructor(accountManager: AccountManager) {
    super();
    this.accountManager = accountManager;
  }

  start(): void {
    const config = getConfig();
    const log = getLogger();

    for (const account of this.accountManager.getAllAccounts()) {
      this.initializeCredit(account.id, account.dailyCreditLimit);
    }

    this.resetTimer = setInterval(() => {
      log.info('CreditTracker', 'Resetting daily credit limits');
      for (const account of this.accountManager.getAllAccounts()) {
        this.initializeCredit(account.id, account.dailyCreditLimit);
      }
    }, config.creditResetIntervalMs);

    this.accountManager.on('account:added', (account) => {
      this.initializeCredit(account.id, account.dailyCreditLimit);
    });

    this.accountManager.on('account:removed', (account) => {
      this.creditMap.delete(account.id);
    });

    this.accountManager.on('account:updated', (account) => {
      const existing = this.creditMap.get(account.id);
      if (existing && existing.limit !== account.dailyCreditLimit) {
        existing.limit = account.dailyCreditLimit;
        existing.remaining = Math.min(existing.remaining, account.dailyCreditLimit);
      }
    });

    log.info('CreditTracker', 'Credit tracker started');
  }

  stop(): void {
    if (this.resetTimer) {
      clearInterval(this.resetTimer);
      this.resetTimer = null;
    }
  }

  private initializeCredit(accountId: string, limit: number): void {
    const now = new Date();
    const config = getConfig();
    this.creditMap.set(accountId, {
      accountId,
      remaining: limit,
      limit,
      used: 0,
      resetAt: new Date(now.getTime() + config.creditResetIntervalMs),
      lastUpdated: now,
    });
  }

  recordUsage(accountId: string, cost: number = 1): CreditInfo | undefined {
    const log = getLogger();
    const credit = this.creditMap.get(accountId);
    if (!credit) {
      log.warn('CreditTracker', `No credit info for account ${accountId}`);
      return undefined;
    }

    credit.used += cost;
    credit.remaining = Math.max(0, credit.limit - credit.used);
    credit.lastUpdated = new Date();

    if (credit.remaining <= 0) {
      this.emit('credit:exhausted', { accountId, credit });
      log.info('CreditTracker', `Account ${accountId} credit exhausted`, {
        accountId,
        used: credit.used,
        metadata: { limit: credit.limit },
      });
    }

    return { ...credit };
  }

  getCredit(accountId: string): CreditInfo | undefined {
    const credit = this.creditMap.get(accountId);
    if (!credit) return undefined;
    return { ...credit };
  }

  getAllCredits(): CreditInfo[] {
    return Array.from(this.creditMap.values()).map(c => ({ ...c }));
  }

  hasCredit(accountId: string): boolean {
    const credit = this.creditMap.get(accountId);
    return credit !== undefined && credit.remaining > 0;
  }

  getTotalRemaining(): number {
    let total = 0;
    for (const credit of this.creditMap.values()) {
      total += credit.remaining;
    }
    return total;
  }

  resetCredit(accountId: string): void {
    const account = this.accountManager.getAccount(accountId);
    if (account) {
      this.initializeCredit(accountId, account.dailyCreditLimit);
    }
  }

  resetAllCredits(): void {
    for (const account of this.accountManager.getAllAccounts()) {
      this.initializeCredit(account.id, account.dailyCreditLimit);
    }
  }
}
