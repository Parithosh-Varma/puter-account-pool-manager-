import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AccountManager } from '../src/accounts/AccountManager';
import { CreditTracker } from '../src/credit/CreditTracker';
import { resetConfig } from '../src/config';
import { resetLogger } from '../src/logger';

process.env.ACCOUNTS = '[]';
process.env.LOG_LEVEL = 'silent';

describe('CreditTracker', () => {
  let accountManager: AccountManager;
  let creditTracker: CreditTracker;

  beforeEach(async () => {
    resetConfig();
    resetLogger();
    accountManager = new AccountManager();
    await accountManager.initialize();
    creditTracker = new CreditTracker(accountManager);
    creditTracker.start();
  });

  afterEach(() => {
    creditTracker.stop();
  });

  describe('credit initialization', () => {
    it('should initialize credit when account is added', () => {
      const account = accountManager.addAccount({
        name: 'Credit Test',
        token: 't',
        dailyCreditLimit: 50,
      });

      const credit = creditTracker.getCredit(account.id);
      expect(credit).toBeDefined();
      expect(credit!.remaining).toBe(50);
      expect(credit!.limit).toBe(50);
      expect(credit!.used).toBe(0);
    });
  });

  describe('recordUsage', () => {
    it('should decrement remaining credit', () => {
      const account = accountManager.addAccount({
        name: 'Usage Test',
        token: 't',
        dailyCreditLimit: 100,
      });

      creditTracker.recordUsage(account.id, 10);
      const credit = creditTracker.getCredit(account.id);
      expect(credit!.used).toBe(10);
      expect(credit!.remaining).toBe(90);
    });

    it('should not go below zero', () => {
      const account = accountManager.addAccount({
        name: 'Zero Test',
        token: 't',
        dailyCreditLimit: 5,
      });

      creditTracker.recordUsage(account.id, 10);
      const credit = creditTracker.getCredit(account.id);
      expect(credit!.remaining).toBe(0);
    });

    it('should emit credit:exhausted when depleted', () => {
      return new Promise<void>(done => {
        const account = accountManager.addAccount({
          name: 'Exhaust Test',
          token: 't',
          dailyCreditLimit: 3,
        });

        creditTracker.on('credit:exhausted', ({ accountId, credit }) => {
          expect(accountId).toBe(account.id);
          expect(credit.remaining).toBe(0);
          done();
        });

        creditTracker.recordUsage(account.id, 3);
      });
    });

    it('should return undefined for unknown account', () => {
      const result = creditTracker.recordUsage('nonexistent', 1);
      expect(result).toBeUndefined();
    });
  });

  describe('hasCredit', () => {
    it('should return true when credit remains', () => {
      const account = accountManager.addAccount({ name: 'Has Credit', token: 't' });
      expect(creditTracker.hasCredit(account.id)).toBe(true);
    });

    it('should return false when exhausted', () => {
      const account = accountManager.addAccount({ name: 'No Credit', token: 't', dailyCreditLimit: 1 });
      creditTracker.recordUsage(account.id, 1);
      expect(creditTracker.hasCredit(account.id)).toBe(false);
    });
  });

  describe('getAllCredits', () => {
    it('should return credits for all accounts', () => {
      accountManager.addAccount({ name: 'A', token: 't1', dailyCreditLimit: 10 });
      accountManager.addAccount({ name: 'B', token: 't2', dailyCreditLimit: 20 });

      const all = creditTracker.getAllCredits();
      expect(all).toHaveLength(2);
    });
  });

  describe('reset', () => {
    it('should reset a single account credit', () => {
      const account = accountManager.addAccount({ name: 'Reset', token: 't', dailyCreditLimit: 10 });
      creditTracker.recordUsage(account.id, 10);
      expect(creditTracker.hasCredit(account.id)).toBe(false);

      creditTracker.resetCredit(account.id);
      expect(creditTracker.hasCredit(account.id)).toBe(true);
      expect(creditTracker.getCredit(account.id)!.remaining).toBe(10);
    });

    it('should reset all credits', () => {
      const a1 = accountManager.addAccount({ name: 'A', token: 't1', dailyCreditLimit: 5 });
      const a2 = accountManager.addAccount({ name: 'B', token: 't2', dailyCreditLimit: 5 });

      creditTracker.recordUsage(a1.id, 5);
      creditTracker.recordUsage(a2.id, 3);

      creditTracker.resetAllCredits();

      expect(creditTracker.getCredit(a1.id)!.remaining).toBe(5);
      expect(creditTracker.getCredit(a2.id)!.remaining).toBe(5);
    });
  });

  describe('total remaining', () => {
    it('should sum remaining across all accounts', () => {
      accountManager.addAccount({ name: 'A', token: 't1', dailyCreditLimit: 100 });
      accountManager.addAccount({ name: 'B', token: 't2', dailyCreditLimit: 200 });

      expect(creditTracker.getTotalRemaining()).toBe(300);
    });
  });
});
