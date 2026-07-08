import { EventEmitter } from 'events';
import { CreditInfo } from '../types';
import { getLogger } from '../logger';
import { AccountManager } from '../accounts/AccountManager';

export class CreditTracker extends EventEmitter {
  private creditMap: Map<string, CreditInfo> = new Map();
  private accountManager: AccountManager;

  constructor(accountManager: AccountManager) {
    super();
    this.accountManager = accountManager;
  }

  private computeLimit(): number {
    const count = Math.max(1, this.accountManager.getAllAccounts().length);
    return Math.max(0.25, count * 0.25);
  }

  start(): void {
    const log = getLogger();

    for (const account of this.accountManager.getAllAccounts()) {
      this.initializeCredit(account.id);
    }

    this.accountManager.on('account:added', () => {
      this.recomputeAll();
    });

    this.accountManager.on('account:removed', (account) => {
      this.creditMap.delete(account.id);
    });

    this.accountManager.on('account:updated', () => {
      this.recomputeAll();
    });

    log.info('CreditTracker', 'Credit tracker started (account count × 0.25)');
  }

  stop(): void {
    /* no-op */
  }

  private recomputeAll(): void {
    const limit = this.computeLimit();
    for (const account of this.accountManager.getAllAccounts()) {
      const existing = this.creditMap.get(account.id);
      if (existing) {
        existing.limit = limit;
        existing.remaining = Math.max(0, limit - existing.used);
      } else {
        this.initializeCredit(account.id);
      }
    }
  }

  private initializeCredit(accountId: string): void {
    const limit = this.computeLimit();
    this.creditMap.set(accountId, {
      accountId,
      remaining: limit,
      limit,
      used: 0,
      resetAt: new Date(Date.now() + 86400000),
      lastUpdated: new Date(),
    });
  }

  recordUsage(accountId: string, cost: number = 1): CreditInfo | undefined {
    const credit = this.creditMap.get(accountId);
    if (!credit) return undefined;

    credit.used += cost;
    credit.remaining = Math.max(0, credit.limit - credit.used);
    credit.lastUpdated = new Date();

    if (credit.remaining <= 0) {
      this.emit('credit:exhausted', { accountId, credit });
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
    this.initializeCredit(accountId);
  }

  resetAllCredits(): void {
    for (const account of this.accountManager.getAllAccounts()) {
      this.initializeCredit(account.id);
    }
  }
}