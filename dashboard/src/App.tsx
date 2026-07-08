import { useApi } from './hooks/useApi';
import AccountList from './components/AccountList';
import Statistics from './components/Statistics';
import UsageGraph from './components/UsageGraph';
import StrategyControl from './components/StrategyControl';

export default function App() {
  const {
    dashboardData,
    stats,
    loading,
    error,
    refreshInterval,
    setRefreshInterval,
    toggleAccount,
    setStrategy,
  } = useApi();

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner} />
        <p style={styles.loadingText}>Connecting to Account Pool Manager...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>Puter Account Pool</h1>
          {stats && (
            <span style={{
              ...styles.statusBadge,
              background: stats.activeAccounts > 0 ? '#22c55e' : '#ef4444',
            }}>
              {stats.activeAccounts > 0 ? 'ONLINE' : 'OFFLINE'}
            </span>
          )}
        </div>
        <div style={styles.headerRight}>
          <label style={styles.refreshLabel}>
            Refresh:
            <select
              value={refreshInterval}
              onChange={e => setRefreshInterval(Number(e.target.value))}
              style={styles.refreshSelect}
            >
              <option value={2000}>2s</option>
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
              <option value={30000}>30s</option>
            </select>
          </label>
        </div>
      </header>

      {error && (
        <div style={styles.errorBar}>
          {error}
          <button onClick={() => window.location.reload()} style={styles.retryBtn}>Retry</button>
        </div>
      )}

      {stats && <Statistics stats={stats} />}

      {dashboardData && (
        <>
          <div style={styles.grid}>
            <div style={styles.card}>
              <div style={styles.cardHeader}>Scheduling Strategy</div>
              <StrategyControl
                current={stats?.strategy || 'round-robin'}
                onSet={setStrategy}
              />
            </div>
            <div style={styles.card}>
              <div style={styles.cardHeader}>Queue Status</div>
              <div style={styles.cardBody}>
                <div style={styles.statRow}>
                  <span style={styles.statLabel}>Queued Requests</span>
                  <span style={styles.statValue}>{stats?.queuedRequests ?? 0}</span>
                </div>
                <div style={styles.statRow}>
                  <span style={styles.statLabel}>Uptime</span>
                  <span style={styles.statValue}>
                    {stats ? formatUptime(stats.uptime) : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <UsageGraph requests={dashboardData.recentRequests} />

          <AccountList
            accounts={dashboardData.accounts}
            onToggle={toggleAccount}
          />
        </>
      )}
    </div>
  );
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${mins}m`);
  return parts.join(' ');
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '24px 16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#e2e8f0',
    background: '#0f172a',
    minHeight: '100vh',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: '#0f172a',
    color: '#e2e8f0',
  },
  loadingSpinner: {
    width: 48,
    height: 48,
    border: '4px solid #1e293b',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#94a3b8',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottom: '1px solid #1e293b',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    margin: 0,
    fontSize: 28,
    fontWeight: 700,
    color: '#f1f5f9',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
    color: '#fff',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  refreshLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 14,
    color: '#94a3b8',
  },
  refreshSelect: {
    padding: '4px 8px',
    borderRadius: 6,
    border: '1px solid #334155',
    background: '#1e293b',
    color: '#e2e8f0',
    fontSize: 14,
  },
  errorBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    marginBottom: 16,
    borderRadius: 8,
    background: '#7f1d1d',
    color: '#fca5a5',
    fontSize: 14,
  },
  retryBtn: {
    padding: '4px 12px',
    borderRadius: 6,
    border: '1px solid #fca5a5',
    background: 'transparent',
    color: '#fca5a5',
    cursor: 'pointer',
    fontSize: 12,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 16,
    marginBottom: 24,
  },
  card: {
    background: '#1e293b',
    borderRadius: 12,
    padding: 20,
    border: '1px solid #334155',
  },
  cardHeader: {
    fontSize: 14,
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 16,
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 0',
  },
  statLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 600,
    color: '#f1f5f9',
  },
};
