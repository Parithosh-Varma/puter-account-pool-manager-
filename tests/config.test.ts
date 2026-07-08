import { describe, it, expect, beforeEach } from 'vitest';
import { loadConfig, resetConfig } from '../src/config';

describe('Config', () => {
  beforeEach(() => {
    resetConfig();
  });

  it('should load default values when env vars are not set', () => {
    const config = loadConfig();
    expect(config.port).toBe(3000);
    expect(config.puterApiBaseUrl).toBe('https://api.puter.com');
    expect(config.schedulerStrategy).toBe('round-robin');
    expect(config.maxRetries).toBe(3);
    expect(config.requestTimeoutMs).toBe(30000);
    expect(config.maxQueueSize).toBe(1000);
  });

  it('should use environment variables when set', () => {
    process.env.PORT = '4000';
    process.env.SCHEDULER_STRATEGY = 'least-used';
    process.env.MAX_RETRIES = '5';
    process.env.LOG_LEVEL = 'debug';

    resetConfig();
    const config = loadConfig();
    expect(config.port).toBe(4000);
    expect(config.schedulerStrategy).toBe('least-used');
    expect(config.maxRetries).toBe(5);
    expect(config.logLevel).toBe('debug');

    delete process.env.PORT;
    delete process.env.SCHEDULER_STRATEGY;
    delete process.env.MAX_RETRIES;
    delete process.env.LOG_LEVEL;
  });

  it('should fall back to default for invalid strategy', () => {
    process.env.SCHEDULER_STRATEGY = 'random';
    resetConfig();
    const config = loadConfig();
    expect(config.schedulerStrategy).toBe('round-robin');
    delete process.env.SCHEDULER_STRATEGY;
  });

  it('should parse ACCOUNTS JSON', () => {
    process.env.ACCOUNTS = JSON.stringify([
      { id: 'a1', name: 'Test', token: 'tok1', dailyCreditLimit: 50 },
    ]);
    resetConfig();
    const config = loadConfig();
    expect(config.accounts).toHaveLength(1);
    expect(config.accounts[0].id).toBe('a1');
    expect(config.accounts[0].token).toBe('tok1');
    expect(config.accounts[0].dailyCreditLimit).toBe(50);
    delete process.env.ACCOUNTS;
  });

  it('should parse individual ACCOUNT_N vars', () => {
    process.env.ACCOUNT_1_ID = 'ind1';
    process.env.ACCOUNT_1_NAME = 'Individual 1';
    process.env.ACCOUNT_1_TOKEN = 'tok-ind-1';
    process.env.ACCOUNT_1_DAILY_LIMIT = '75';
    process.env.ACCOUNT_2_ID = 'ind2';
    process.env.ACCOUNT_2_TOKEN = 'tok-ind-2';

    resetConfig();
    const config = loadConfig();
    expect(config.accounts).toHaveLength(2);
    expect(config.accounts[0].id).toBe('ind1');
    expect(config.accounts[0].dailyCreditLimit).toBe(75);
    expect(config.accounts[1].id).toBe('ind2');
    expect(config.accounts[1].name).toBe('Account 2');

    delete process.env.ACCOUNT_1_ID;
    delete process.env.ACCOUNT_1_NAME;
    delete process.env.ACCOUNT_1_TOKEN;
    delete process.env.ACCOUNT_1_DAILY_LIMIT;
    delete process.env.ACCOUNT_2_ID;
    delete process.env.ACCOUNT_2_TOKEN;
  });
});
