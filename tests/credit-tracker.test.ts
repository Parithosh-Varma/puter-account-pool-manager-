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
      });

      const credit = creditTracker.getCredit(account.id);
      expect(credit).toBeDefined();
      expect(credit!.remaining).toBe(0.25);
      expect(credit!.limit).toBe(0.25);
      expect(credit!.used).toBe(0);
    });
  });

  describe('recordUsage', () => {
    it('should decrement remaining credit', () => {
      const account = accountManager.addAccount({
        name: 'Usage Test',
        token: 't',
      });

      creditTracker.recordUsage(account.id, 0.1);
      const credit = creditTracker.getCredit(account.id);
      expect(credit!.used).toBe(0.1);
      expect(credit!.remaining).toBe(0.15);
    });

    it('should not go below zero', () => {
      const account = accountManager.addAccount({
        name: 'Zero Test',
        token: 't',
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
        });

        creditTracker.on('credit:exhausted', ({ accountId, credit }) => {
          expect(accountId).toBe(account.id);
          expect(credit.remaining).toBe(0);
          done();
        });

        creditTracker.recordUsage(account.id, 0.25);
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
      const account = accountManager.addAccount({ name: 'No Credit', token: 't' });
      creditTracker.recordUsage(account.id, 0.25);
      expect(creditTracker.hasCredit(account.id)).toBe(false);
    });
  });

  describe('getAllCredits', () => {
    it('should return credits for all accounts', () => {
      accountManager.addAccount({ name: 'A', token: 't1' });
      accountManager.addAccount({ name: 'B', token: 't2' });

      const all = creditTracker.getAllCredits();
      expect(all).toHaveLength(2);
    });
  });

  describe('reset', () => {
    it('should reset a single account credit', () => {
      const account = accountManager.addAccount({ name: 'Reset', token: 't' });
      creditTracker.recordUsage(account.id, 0.25);
      expect(creditTracker.hasCredit(account.id)).toBe(false);

      creditTracker.resetCredit(account.id);
      expect(creditTracker.hasCredit(account.id)).toBe(true);
      expect(creditTracker.getCredit(account.id)!.remaining).toBe(0.25);
    });

    it('should reset all credits', () => {
      const a1 = accountManager.addAccount({ name: 'A', token: 't1' });
      const a2 = accountManager.addAccount({ name: 'B', token: 't2' });

      creditTracker.recordUsage(a1.id, 0.25);
      creditTracker.recordUsage(a2.id, 0.1);

      creditTracker.resetAllCredits();

      expect(creditTracker.getCredit(a1.id)!.remaining).toBe(0.5);
      expect(creditTracker.getCredit(a2.id)!.remaining).toBe(0.5);
    });
  });

  describe('total remaining', () => {
    it('should sum remaining across all accounts', () => {
      accountManager.addAccount({ name: 'A', token: 't1' });
      accountManager.addAccount({ name: 'B', token: 't2' });

      expect(creditTracker.getTotalRemaining()).toBe(1);
    });
  });
});
