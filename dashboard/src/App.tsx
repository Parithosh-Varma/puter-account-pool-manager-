import { useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useApi } from './hooks/useApi';
import AccountList from './components/AccountList';
import Statistics from './components/Statistics';
import UsageGraph from './components/UsageGraph';
import StrategyControl from './components/StrategyControl';
import AddAccountForm from './components/AddAccountForm';
import Chat from './components/Chat';
import LoginPage from './components/LoginPage';

type Tab = 'dashboard' | 'chat';

function AppContent() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [theme, setTheme] = useState<'dark' | 'light'>((localStorage.getItem('theme') as 'dark' | 'light') || 'dark');
  const { user, idToken, logout } = useAuth();
  const {
    dashboardData,
    stats,
    loading,
    error,
    refreshInterval,
    setRefreshInterval,
    toggleAccount,
    deleteAccount,
    setStrategy,
    refetch,
  } = useApi(idToken);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  if (!user) {
    return <LoginPage />;
  }

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
              background: stats.activeAccounts > 0 ? '#10b981' : '#f43f5e',
            }}>
              {stats.activeAccounts > 0 ? 'ONLINE' : 'OFFLINE'}
            </span>
          )}
        </div>
        <div style={styles.headerRight}>
          {user && (
            <div style={styles.userBadge}>
              {user.picture ? <img src={user.picture} style={styles.userAvatar} /> : null}
              <span style={styles.userName}>{user.name || user.email}</span>
              <button onClick={logout} style={styles.logoutBtn}>Logout</button>
            </div>
          )}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            style={styles.themeToggle}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
          <div style={styles.tabs}>
            <button
              onClick={() => setTab('dashboard')}
              style={{ ...styles.tab, ...(tab === 'dashboard' ? styles.tabActive : {}) }}
            >Dashboard</button>
            <button
              onClick={() => setTab('chat')}
              style={{ ...styles.tab, ...(tab === 'chat' ? styles.tabActive : {}) }}
            >Chat</button>
          </div>
          {tab === 'dashboard' && (
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
          )}
        </div>
      </header>

      {error && (
        <div style={styles.errorBar}>
          {error}
          <button onClick={() => window.location.reload()} style={styles.retryBtn}>Retry</button>
        </div>
      )}

      {tab === 'chat' ? (
        <Chat />
      ) : (
        <>
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

              <UsageGraph requests={dashboardData.recentRequests} theme={theme} />

              <div style={styles.formSection}>
                <AddAccountForm onAdded={refetch} />
              </div>

              <AccountList
                accounts={dashboardData.accounts}
                onToggle={toggleAccount}
                onRefresh={refetch}
                onDelete={deleteAccount}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function App() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '275728447491-22lt385sjul4oj45vllkfv3nm19mga1l.apps.googleusercontent.com';
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </GoogleOAuthProvider>
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
    padding: '32px 24px',
    fontFamily: "'Outfit', -apple-system, sans-serif",
    color: 'var(--text-primary)',
    background: 'transparent',
    minHeight: '100vh',
    animation: 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: 'var(--bg-color)',
    color: 'var(--text-primary)',
    fontFamily: "'Outfit', -apple-system, sans-serif",
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    border: '3px solid var(--card-border)',
    borderTopColor: '#6366f1',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: 500,
    color: 'var(--text-secondary)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 36,
    paddingBottom: 20,
    borderBottom: '1px solid var(--card-border)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  title: {
    margin: 0,
    fontSize: 26,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    background: 'linear-gradient(135deg, var(--text-primary) 0%, #6366f1 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: 9999,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.05em',
    color: '#fff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  refreshLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-secondary)',
  },
  refreshSelect: {
    padding: '6px 12px',
    borderRadius: 8,
    border: '1px solid var(--card-border)',
    background: 'var(--input-bg)',
    color: 'var(--text-primary)',
    fontSize: 13,
    fontWeight: 500,
    outline: 'none',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  themeToggle: {
    background: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
    borderRadius: 10,
    width: 38,
    height: 38,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    cursor: 'pointer',
    color: 'var(--text-primary)',
    transition: 'all 0.2s',
  },
  errorBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 20px',
    marginBottom: 24,
    borderRadius: 12,
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: '#fca5a5',
    fontSize: 14,
  },
  retryBtn: {
    padding: '6px 14px',
    borderRadius: 8,
    border: '1px solid rgba(239, 68, 68, 0.3)',
    background: 'rgba(239, 68, 68, 0.2)',
    color: '#fca5a5',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    transition: 'all 0.2s',
  },
  formSection: {
    marginBottom: 28,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 20,
    marginBottom: 28,
  },
  card: {
    background: 'var(--card-bg)',
    borderRadius: 16,
    padding: 24,
    border: '1px solid var(--card-border)',
    backdropFilter: 'blur(8px)',
  },
  cardHeader: {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 18,
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
    borderBottom: '1px solid var(--border-subtle)',
  },
  statLabel: {
    fontSize: 14,
    color: 'var(--text-secondary)',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
    fontFamily: "'JetBrains Mono', monospace",
  },
  tabs: {
    display: 'flex',
    gap: 6,
    background: 'var(--panel-bg)',
    borderRadius: 10,
    padding: 4,
    border: '1px solid var(--card-border)',
  },
  tab: {
    padding: '6px 16px',
    borderRadius: 7,
    border: 'none',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  tabActive: {
    background: '#6366f1',
    color: '#ffffff',
    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)',
  },
  userBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 12px',
    borderRadius: 10,
    background: 'var(--panel-bg)',
    border: '1px solid var(--card-border)',
  },
  userAvatar: {
    width: 24,
    height: 24,
    borderRadius: '50%',
  },
  userName: {
    fontSize: 13,
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  logoutBtn: {
    padding: '4px 10px',
    borderRadius: 6,
    border: 'none',
    background: '#ef4444',
    color: '#fff',
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
  },
};
