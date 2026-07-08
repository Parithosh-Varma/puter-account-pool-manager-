import { createClient, SupabaseClient } from '@supabase/supabase-js';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const WebSocket = require('ws');
import { RequestRecord } from '../types';
import { getLogger } from '../logger';
import { getConfig } from '../config';

interface ResponseRow {
  id: string;
  account_id: string | null;
  model: string;
  prompt: string;
  response: string | null;
  latency_ms: number;
  success: boolean;
  retry_count: number;
  status_code: number | null;
  error_message: string | null;
  created_at: string;
}

interface AccountRow {
  id: string;
  name: string;
  token: string;
  status: string;
  daily_credit_limit: number;
  model: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export class Database {
  private client: SupabaseClient | null = null;
  private responsesTable = 'ai_responses';
  private accountsTable = 'puter_accounts';

  initialize(): void {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) {
      getLogger().warn('Database', 'Supabase not configured');
      return;
    }
    this.client = createClient(url, key, {
      realtime: { transport: WebSocket },
    });
  }

  isConnected(): boolean {
    return this.client !== null;
  }

  // ── Response persistence ──

  async storeResponse(record: RequestRecord): Promise<void> {
    if (!this.client) return;
    const log = getLogger();

    try {
      const { error } = await this.client.from(this.responsesTable).insert({
        id: record.id,
        account_id: record.accountId,
        model: record.model,
        prompt: record.prompt,
        response: record.response,
        latency_ms: record.latency,
        success: record.success,
        retry_count: record.retryCount,
        status_code: record.statusCode,
        error_message: record.error,
        created_at: record.timestamp.toISOString(),
      });

      if (error) {
        log.error('Database', 'Failed to insert response', { error: error.message, requestId: record.id });
      }
    } catch (err) {
      log.error('Database', 'Failed to store response', {
        error: err instanceof Error ? err.message : String(err),
        requestId: record.id,
      });
    }
  }

  async getResponses(limit = 50, offset = 0): Promise<ResponseRow[]> {
    if (!this.client) return [];

    const { data, error } = await this.client
      .from(this.responsesTable)
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      getLogger().error('Database', 'Failed to query responses', { error: error.message });
      return [];
    }

    return (data as ResponseRow[]) || [];
  }

  async getResponsesByAccount(accountId: string, limit = 50): Promise<ResponseRow[]> {
    if (!this.client) return [];

    const { data, error } = await this.client
      .from(this.responsesTable)
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      getLogger().error('Database', 'Failed to query responses by account', { error: error.message });
      return [];
    }

    return (data as ResponseRow[]) || [];
  }

  async getResponseStats(): Promise<{
    total: number;
    successful: number;
    failed: number;
    avgLatency: number;
  }> {
    if (!this.client) return { total: 0, successful: 0, failed: 0, avgLatency: 0 };

    const { data, error } = await this.client
      .from(this.responsesTable)
      .select('success, latency_ms');

    if (error) {
      getLogger().error('Database', 'Failed to get stats', { error: error.message });
      return { total: 0, successful: 0, failed: 0, avgLatency: 0 };
    }

    const rows = (data as Array<{ success: boolean; latency_ms: number }>) || [];
    const total = rows.length;
    const successful = rows.filter(r => r.success).length;
    const totalLatency = rows.reduce((sum, r) => sum + (r.latency_ms || 0), 0);

    return {
      total,
      successful,
      failed: total - successful,
      avgLatency: total > 0 ? Math.round(totalLatency / total) : 0,
    };
  }

  // ── Account persistence ──

  async loadAccounts(): Promise<Array<{ id: string; name: string; token: string; dailyCreditLimit: number }>> {
    if (!this.client) return [];

    const { data, error } = await this.client
      .from(this.accountsTable)
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      getLogger().error('Database', 'Failed to load accounts', { error: error.message });
      return [];
    }

    return ((data as AccountRow[]) || []).map(r => ({
      id: r.id,
      name: r.name,
      token: r.token,
      dailyCreditLimit: r.daily_credit_limit,
    }));
  }

  async saveAccount(account: { id: string; name: string; token: string; dailyCreditLimit: number }): Promise<void> {
    if (!this.client) return;
    const log = getLogger();

    const { error } = await this.client.from(this.accountsTable).upsert({
      id: account.id,
      name: account.name,
      token: account.token,
      daily_credit_limit: account.dailyCreditLimit,
      status: 'pending_verification',
      updated_at: new Date().toISOString(),
    });

    if (error) {
      log.error('Database', 'Failed to save account', { error: error.message, accountId: account.id });
    }
  }

  async deleteAccount(id: string): Promise<void> {
    if (!this.client) return;

    const { error } = await this.client
      .from(this.accountsTable)
      .delete()
      .eq('id', id);

    if (error) {
      getLogger().error('Database', 'Failed to delete account', { error: error.message, accountId: id });
    }
  }

  async updateAccountStatus(id: string, status: string): Promise<void> {
    if (!this.client) return;

    const { error } = await this.client
      .from(this.accountsTable)
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      getLogger().error('Database', 'Failed to update account status', { error: error.message, accountId: id });
    }
  }
}
