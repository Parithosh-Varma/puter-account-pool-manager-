import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import fetch from 'node-fetch';
import {
  Account,
  AIRequestInput,
  AIRequestResult,
  RequestRecord,
  QueuedRequest,
  SchedulerStrategy,
} from '../types';
import { getLogger } from '../logger';
import { getConfig } from '../config';
import { AccountManager } from '../accounts/AccountManager';
import { CreditTracker } from '../credit/CreditTracker';
import { HealthChecker } from '../health/HealthChecker';

export class RequestScheduler extends EventEmitter {
  private accountManager: AccountManager;
  private creditTracker: CreditTracker;
  private healthChecker: HealthChecker;
  private queue: QueuedRequest[] = [];
  private requestHistory: RequestRecord[] = [];
  private roundRobinIndex = 0;
  private activeRequests = 0;
  private processing = false;
  private maxHistorySize = 10000;

  constructor(
    accountManager: AccountManager,
    creditTracker: CreditTracker,
    healthChecker: HealthChecker,
  ) {
    super();
    this.accountManager = accountManager;
    this.creditTracker = creditTracker;
    this.healthChecker = healthChecker;
  }

  async submitRequest(input: AIRequestInput): Promise<AIRequestResult> {
    const config = getConfig();
    const log = getLogger();
    const startTime = Date.now();

    const account = this.selectAccount();
    if (!account) {
      const hasAnyAccounts = this.accountManager.hasAccounts();
      if (hasAnyAccounts && this.queue.length < config.maxQueueSize) {
        log.info('RequestScheduler', 'No accounts available, queuing request');
        return this.enqueueRequest(input);
      }
      const reason = hasAnyAccounts
        ? 'No accounts available and queue is full'
        : 'No accounts configured';
      return {
        success: false,
        response: null,
        accountId: null,
        latency: Date.now() - startTime,
        retryCount: 0,
        statusCode: null,
        error: reason,
      };
    }

    return this.executeWithRetry(input, account, 0, startTime);
  }

  private async executeWithRetry(
    input: AIRequestInput,
    account: Account,
    retryCount: number,
    startTime: number,
  ): Promise<AIRequestResult> {
    const config = getConfig();
    const log = getLogger();
    const requestId = uuidv4();

    try {
      this.activeRequests++;
      const result = await this.executeRequest(input, account, requestId);
      this.activeRequests--;

      if (result.success) {
        this.creditTracker.recordUsage(account.id);
        this.recordHistory(requestId, account.id, input, result, startTime);
        return result;
      }

      if (retryCount < config.maxRetries) {
        log.warn('RequestScheduler', `Request failed on ${account.id}, retrying (${retryCount + 1}/${config.maxRetries})`, {
          accountId: account.id,
          requestId,
          error: result.error,
          metadata: { retryCount: retryCount + 1 } as Record<string, unknown>,
        });

        this.accountManager.setAccountStatus(account.id, 'error');

        const nextAccount = this.selectAccount(account.id);
        if (nextAccount) {
          return this.executeWithRetry(input, nextAccount, retryCount + 1, startTime);
        }
      }

      this.recordHistory(requestId, account.id, input, result, startTime);
      return {
        ...result,
        retryCount,
        latency: Date.now() - startTime,
      };
    } catch (err) {
      this.activeRequests--;
      const errorMsg = err instanceof Error ? err.message : String(err);
      log.error('RequestScheduler', `Request execution threw`, {
        requestId,
        accountId: account.id,
        error: errorMsg,
      });

      if (retryCount < config.maxRetries) {
        const nextAccount = this.selectAccount(account.id);
        if (nextAccount) {
          return this.executeWithRetry(input, nextAccount, retryCount + 1, startTime);
        }
      }

      const result: AIRequestResult = {
        success: false,
        response: null,
        accountId: account.id,
        latency: Date.now() - startTime,
        retryCount,
        statusCode: null,
        error: errorMsg,
      };
      this.recordHistory(requestId, account.id, input, result, startTime);
      return result;
    }
  }

  private async executeRequest(
    input: AIRequestInput,
    account: Account,
    requestId: string,
  ): Promise<AIRequestResult> {
    const config = getConfig();
    const log = getLogger();
    const startTime = Date.now();

    log.info('RequestScheduler', `Executing request on account ${account.id}`, {
      accountId: account.id,
      requestId,
      model: input.model,
    });

    try {
      const response = await fetch(`${config.puterApiBaseUrl}/ai/chat`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${account.token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'PuterAccountPoolManager/1.0',
        },
        body: JSON.stringify({
          model: input.model,
          messages: [{ role: 'user', content: input.prompt }],
          stream: input.stream ?? false,
          max_tokens: input.maxTokens,
          temperature: input.temperature,
        }),
        signal: AbortSignal.timeout(config.requestTimeoutMs),
      });

      const latency = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json() as { message?: { content?: string }; choices?: Array<{ message?: { content?: string } }> };
        const content = data?.message?.content || data?.choices?.[0]?.message?.content || JSON.stringify(data);

        log.info('RequestScheduler', `Request succeeded on ${account.id}`, {
          accountId: account.id,
          requestId,
          latency,
        });

        return {
          success: true,
          response: content,
          accountId: account.id,
          latency,
          retryCount: 0,
          statusCode: response.status,
          error: null,
        };
      }

      const errorBody = await response.text().catch(() => '');
      let errorMsg = `HTTP ${response.status}`;
      if (errorBody) errorMsg += `: ${errorBody.slice(0, 200)}`;

      if (response.status === 429 || response.status === 402) {
        this.accountManager.setAccountStatus(account.id, 'exhausted');
        log.warn('RequestScheduler', `Account ${account.id} rate limited/credit exhausted`, {
          accountId: account.id,
          requestId,
          statusCode: response.status,
        });
      }

      return {
        success: false,
        response: null,
        accountId: account.id,
        latency,
        retryCount: 0,
        statusCode: response.status,
        error: errorMsg,
      };
    } catch (err) {
      const latency = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        response: null,
        accountId: account.id,
        latency,
        retryCount: 0,
        statusCode: null,
        error: errorMsg,
      };
    }
  }

  private selectAccount(excludeId?: string): Account | null {
    const config = getConfig();
    let candidates = this.accountManager.getActiveAccounts().filter(
      a => a.id !== excludeId && this.creditTracker.hasCredit(a.id) && this.healthChecker.isHealthy(a.id),
    );

    if (candidates.length === 0) {
      candidates = this.accountManager.getActiveAccounts().filter(
        a => a.id !== excludeId && this.healthChecker.isHealthy(a.id),
      );
    }

    if (candidates.length === 0) return null;

    if (config.schedulerStrategy === 'least-used') {
      return this.selectLeastUsed(candidates);
    }
    return this.selectRoundRobin(candidates);
  }

  private selectRoundRobin(candidates: Account[]): Account {
    const index = this.roundRobinIndex % candidates.length;
    this.roundRobinIndex = (this.roundRobinIndex + 1) % candidates.length;
    return candidates[index];
  }

  private selectLeastUsed(candidates: Account[]): Account {
    let minUsage = Infinity;
    let selected = candidates[0];

    for (const acc of candidates) {
      const credit = this.creditTracker.getCredit(acc.id);
      const usage = credit ? credit.used : 0;
      if (usage < minUsage) {
        minUsage = usage;
        selected = acc;
      }
    }

    return selected;
  }

  private enqueueRequest(input: AIRequestInput): Promise<AIRequestResult> {
    const config = getConfig();
    return new Promise<AIRequestResult>((resolve, reject) => {
      const timeout = setTimeout(() => {
        const idx = this.queue.findIndex(q => q.id === request.id);
        if (idx !== -1) this.queue.splice(idx, 1);
        resolve({
          success: false,
          response: null,
          accountId: null,
          latency: 0,
          retryCount: 0,
          statusCode: null,
          error: 'Request timed out in queue',
        });
      }, config.requestTimeoutMs);

      const request: QueuedRequest = {
        id: uuidv4(),
        model: input.model,
        prompt: input.prompt,
        resolve,
        reject,
        retryCount: 0,
        queuedAt: new Date(),
        timeout,
      };

      this.queue.push(request);
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const account = this.selectAccount();
      if (!account) break;

      const request = this.queue.shift()!;
      clearTimeout(request.timeout);

      const result = await this.submitRequest({
        model: request.model,
        prompt: request.prompt,
      });

      request.resolve(result);
    }

    this.processing = false;
  }

  private recordHistory(
    requestId: string,
    accountId: string | null,
    input: AIRequestInput,
    result: AIRequestResult,
    startTime: number,
  ): void {
    const record: RequestRecord = {
      id: requestId,
      accountId: result.accountId || accountId,
      model: input.model,
      prompt: input.prompt.slice(0, 200),
      response: result.response ? result.response.slice(0, 200) : null,
      latency: result.latency,
      success: result.success,
      retryCount: result.retryCount,
      statusCode: result.statusCode,
      error: result.error,
      timestamp: new Date(),
    };

    this.requestHistory.push(record);
    if (this.requestHistory.length > this.maxHistorySize) {
      this.requestHistory = this.requestHistory.slice(-this.maxHistorySize);
    }

    this.emit('request:completed', record);
    const log = getLogger();
    log.info('RequestScheduler', `Request ${result.success ? 'completed' : 'failed'}`, {
      requestId,
      accountId: record.accountId,
      latency: record.latency,
      metadata: { success: result.success, retryCount: result.retryCount } as Record<string, unknown>,
    });
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  getActiveRequestCount(): number {
    return this.activeRequests;
  }

  getRequestHistory(limit: number = 100): RequestRecord[] {
    return this.requestHistory.slice(-limit);
  }

  getStats() {
    const total = this.requestHistory.length;
    const successful = this.requestHistory.filter(r => r.success).length;
    const failed = total - successful;
    const totalLatency = this.requestHistory.reduce((sum, r) => sum + r.latency, 0);
    const averageLatency = total > 0 ? totalLatency / total : 0;

    return {
      totalRequests: total,
      successfulRequests: successful,
      failedRequests: failed,
      averageLatency: Math.round(averageLatency * 100) / 100,
      queuedRequests: this.queue.length,
      activeRequests: this.activeRequests,
    };
  }

  setStrategy(strategy: SchedulerStrategy): void {
    const config = getConfig();
    const log = getLogger();
    (config as { schedulerStrategy: SchedulerStrategy }).schedulerStrategy = strategy;
    this.roundRobinIndex = 0;
    log.info('RequestScheduler', `Switched scheduling strategy to ${strategy}`);
  }
}
