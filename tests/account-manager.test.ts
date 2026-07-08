import { describe, it, expect, beforeEach } from 'vitest';
import { AccountManager } from '../src/accounts/AccountManager';
import { resetConfig } from '../src/config';
import { resetLogger } from '../src/logger';

process.env.ACCOUNTS = '[]';
process.env.LOG_LEVEL = 'silent';

describe('AccountManager', () => {
  let manager: AccountManager;

  beforeEach(async () => {
    resetConfig();
    resetLogger();
    manager = new AccountManager();
    await manager.initialize();
  });

  describe('addAccount', () => {
    it('should add a valid account', () => {
      const account = manager.addAccount({
        name: 'Test Account',
        token: 'test-token-123',
        dailyCreditLimit: 100,
      });

      expect(account.id).toBeDefined();
      expect(account.name).toBe('Test Account');
      expect(account.status).toBe('pending_verification');
      expect(account.dailyCreditLimit).toBe(100);
    });

    it('should accept a custom id', () => {
      const account = manager.addAccount({
        id: 'custom-id',
        name: 'Custom',
        token: 'token',
      });

      expect(account.id).toBe('custom-id');
    });

    it('should throw for duplicate id', () => {
      manager.addAccount({ id: 'dup', name: 'First', token: 't1' });
      expect(() => {
        manager.addAccount({ id: 'dup', name: 'Second', token: 't2' });
      }).toThrow('already exists');
    });

    it('should use default credit limit when not specified', () => {
      const account = manager.addAccount({
        name: 'Default Limit',
        token: 'token',
      });
      expect(account.dailyCreditLimit).toBe(100);
    });
  });

  describe('removeAccount', () => {
    it('should remove an existing account', () => {
      const account = manager.addAccount({ name: 'To Remove', token: 't' });
      expect(manager.getCount()).toBe(1);

      const removed = manager.removeAccount(account.id);
      expect(removed).toBe(true);
      expect(manager.getCount()).toBe(0);
    });

    it('should return false for non-existent account', () => {
      expect(manager.removeAccount('nonexistent')).toBe(false);
    });
  });

  describe('updateAccount', () => {
    it('should update account fields', () => {
      const account = manager.addAccount({ name: 'Original', token: 't' });

      const updated = manager.updateAccount(account.id, {
        name: 'Updated',
        status: 'active',
      });

      expect(updated).not.toBeNull();
      expect(updated!.name).toBe('Updated');
      expect(updated!.status).toBe('active');
    });

    it('should return null for non-existent account', () => {
      expect(manager.updateAccount('nonexistent', { name: 'Nope' })).toBeNull();
    });
  });

  describe('getAccount / getAllAccounts', () => {
    it('should retrieve an account by id', () => {
      const account = manager.addAccount({ name: 'Get Test', token: 't' });
      const retrieved = manager.getAccount(account.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(account.id);
    });

    it('should return undefined for unknown id', () => {
      expect(manager.getAccount('unknown')).toBeUndefined();
    });

    it('should list all accounts', () => {
      manager.addAccount({ name: 'A1', token: 't1' });
      manager.addAccount({ name: 'A2', token: 't2' });
      expect(manager.getAllAccounts()).toHaveLength(2);
    });
  });

  describe('active accounts', () => {
    it('should filter active accounts', () => {
      const a1 = manager.addAccount({ name: 'Active', token: 't1' });
      manager.addAccount({ name: 'Disabled', token: 't2' });

      manager.setAccountStatus(a1.id, 'active');

      const active = manager.getActiveAccounts();
      expect(active).toHaveLength(1);
      expect(active[0].id).toBe(a1.id);
    });

    it('should report whether active accounts exist', () => {
      expect(manager.hasActiveAccounts()).toBe(false);

      const acc = manager.addAccount({ name: 'A', token: 't' });
      manager.setAccountStatus(acc.id, 'active');

      expect(manager.hasActiveAccounts()).toBe(true);
    });
  });

  describe('events', () => {
    it('should emit account:added on add', () => {
      return new Promise<void>(done => {
        manager.on('account:added', (account) => {
          expect(account.name).toBe('Event Test');
          done();
        });
        manager.addAccount({ name: 'Event Test', token: 't' });
      });
    });

    it('should emit account:removed on remove', () => {
      return new Promise<void>(done => {
        const account = manager.addAccount({ name: 'Remove Me', token: 't' });
        manager.on('account:removed', (removed) => {
          expect(removed.id).toBe(account.id);
          done();
        });
        manager.removeAccount(account.id);
      });
    });

    it('should emit account:status-changed on status change', () => {
      return new Promise<void>(done => {
        const account = manager.addAccount({ name: 'Status Change', token: 't' });
        manager.on('account:status-changed', ({ account: updated, previousStatus }) => {
          expect(updated.status).toBe('active');
          expect(previousStatus).toBe('pending_verification');
          done();
        });
        manager.setAccountStatus(account.id, 'active');
      });
    });
  });
});
