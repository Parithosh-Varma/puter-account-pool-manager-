import { useState, useEffect, useCallback } from 'react';

interface DashboardData {
  pool: {
    totalAccounts: number;
    activeAccounts: number;
    disabledAccounts: number;
    exhaustedAccounts: number;
    errorAccounts: number;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageLatency: number;
    queuedRequests: number;
    uptime: number;
    strategy: string;
  };
  accounts: Array<{
    id: string;
    name: string;
    status: string;
    health: {
      status: string;
      lastCheck: string | null;
      latency: number;
      errorRate: number;
      totalRequests: number;
      successfulRequests: number;
      failedRequests: number;
      consecutiveFailures: number;
    };
    credit: {
      remaining: number;
      limit: number;
      used: number;
      resetAt: string;
    };
  }>;
  recentRequests: Array<{
    id: string;
    accountId: string;
    model: string;
    latency: number;
    success: boolean;
    retryCount: number;
    error: string | null;
    timestamp: string;
  }>;
}

interface PoolStats {
  totalAccounts: number;
  activeAccounts: number;
  disabledAccounts: number;
  exhaustedAccounts: number;
  errorAccounts: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  queuedRequests: number;
  uptime: number;
  strategy: string;
}

function authHeaders(idToken: string | null): Record<string, string> {
  if (!idToken) return {};
  return { Authorization: `Bearer ${idToken}` };
}

export function useApi(idToken: string | null) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [stats, setStats] = useState<PoolStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(5000);

  const fetchData = useCallback(async () => {
    try {
      const headers = authHeaders(idToken);
      const [dashboardRes, statsRes] = await Promise.all([
        fetch('/api/dashboard', { headers }),
        fetch('/api/stats', { headers }),
      ]);

      if (!dashboardRes.ok || !statsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [dashboard, poolStats] = await Promise.all([
        dashboardRes.json(),
        statsRes.json(),
      ]);

      setDashboardData(dashboard);
      setStats(poolStats);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection error');
    } finally {
      setLoading(false);
    }
  }, [idToken]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval]);

  const toggleAccount = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'disabled' ? 'active' : 'disabled';
    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders(idToken) },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch {
      setError('Failed to toggle account');
    }
  };

  const deleteAccount = async (id: string) => {
    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: 'DELETE',
        headers: authHeaders(idToken),
      });
      if (res.ok) {
        await fetchData();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete account');
      }
    } catch {
      setError('Failed to delete account');
    }
  };

  const setStrategy = async (strategy: string) => {
    try {
      const res = await fetch('/api/strategy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders(idToken) },
        body: JSON.stringify({ strategy }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch {
      setError('Failed to set strategy');
    }
  };

  return {
    dashboardData,
    stats,
    loading,
    error,
    refreshInterval,
    setRefreshInterval,
    toggleAccount,
    deleteAccount,
    setStrategy,
    refetch: fetchData,
  };
}
