import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { Account, AccountStatus, CreateAccountInput, UpdateAccountInput } from '../types';
import { getLogger } from '../logger';
import { getConfig } from '../config';
import { Database } from '../database';

export type AccountEvent = 'account:added' | 'account:removed' | 'account:updated' | 'account:status-changed';

export class AccountManager extends EventEmitter {
  private accounts: Map<string, Account> = new Map();
  private initialized = false;
  private db?: Database;

  constructor(database?: Database) {
    super();
    this.setMaxListeners(100);
    this.db = database;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    const config = getConfig();
    const log = getLogger();

    const loadedFromDb = this.db?.isConnected() ? await this.db.loadAccounts() : [];

    if (loadedFromDb.length > 0) {
      for (const acc of loadedFromDb) {
        this.accounts.set(acc.id, {
          id: acc.id,
          name: acc.name,
          token: acc.token,
          status: 'pending_verification',
          dailyCreditLimit: acc.dailyCreditLimit,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        log.info('AccountManager', `Loaded account from DB: ${acc.id} (${acc.name})`);
      }
    } else if (config.accounts.length > 0) {
      for (const acc of config.accounts) {
        this.accounts.set(acc.id, {
          id: acc.id,
          name: acc.name,
          token: acc.token,
          status: 'pending_verification',
          dailyCreditLimit: acc.dailyCreditLimit,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        this.db?.saveAccount({ id: acc.id, name: acc.name, token: acc.token, dailyCreditLimit: acc.dailyCreditLimit });
        log.info('AccountManager', `Loaded account from env: ${acc.id} (${acc.name})`);
      }
    }

    this.initialized = true;
    log.info('AccountManager', `Initialized with ${this.accounts.size} accounts`);
  }

  addAccount(input: CreateAccountInput): Account {
    const log = getLogger();
    const id = input.id || uuidv4();

    if (this.accounts.has(id)) {
      throw new Error(`Account with id "${id}" already exists`);
    }

    const account: Account = {
      id,
      name: input.name,
      token: input.token,
      status: 'pending_verification',
      dailyCreditLimit: input.dailyCreditLimit ?? getConfig().defaultDailyCreditLimit,
      createdAt: new Date(),
      updatedAt: new Date(),
      model: input.model,
      metadata: input.metadata,
    };

    this.accounts.set(id, account);
    this.db?.saveAccount({ id, name: input.name, token: input.token, dailyCreditLimit: account.dailyCreditLimit });
    this.emit('account:added', account);
    log.info('AccountManager', `Added account: ${id} (${input.name})`);
    return account;
  }

  removeAccount(id: string): boolean {
    const log = getLogger();
    const account = this.accounts.get(id);
    if (!account) {
      log.warn('AccountManager', `Attempted to remove non-existent account: ${id}`);
      return false;
    }
    this.accounts.delete(id);
    this.db?.deleteAccount(id);
    this.emit('account:removed', account);
    log.info('AccountManager', `Removed account: ${id} (${account.name})`);
    return true;
  }

  updateAccount(id: string, input: UpdateAccountInput): Account | null {
    const log = getLogger();
    const account = this.accounts.get(id);
    if (!account) {
      log.warn('AccountManager', `Attempted to update non-existent account: ${id}`);
      return null;
    }

    const updated: Account = {
      ...account,
      ...input,
      updatedAt: new Date(),
    };
    this.accounts.set(id, updated);

    if (input.status && input.status !== account.status) {
      this.emit('account:status-changed', { account: updated, previousStatus: account.status });
    }

    this.emit('account:updated', updated);
    log.info('AccountManager', `Updated account: ${id}`, { status: updated.status, metadata: { previousStatus: input.status } });
    return updated;
  }

  setAccountStatus(id: string, status: AccountStatus): Account | null {
    const result = this.updateAccount(id, { status });
    if (result) {
      this.db?.updateAccountStatus(id, status);
    }
    return result;
  }

  getAccount(id: string): Account | undefined {
    return this.accounts.get(id);
  }

  getAllAccounts(): Account[] {
    return Array.from(this.accounts.values());
  }

  getActiveAccounts(): Account[] {
    return this.getAllAccounts().filter(a => a.status === 'active');
  }

  getCount(): number {
    return this.accounts.size;
  }

  getActiveCount(): number {
    return this.getActiveAccounts().length;
  }

  hasAccounts(): boolean {
    return this.accounts.size > 0;
  }

  hasActiveAccounts(): boolean {
    return this.getActiveCount() > 0;
  }
}
