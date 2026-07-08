interface Account {
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
}

interface Props {
  account: Account;
  onToggle: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  active: '#22c55e',
  disabled: '#64748b',
  exhausted: '#f59e0b',
  error: '#ef4444',
  pending_verification: '#3b82f6',
};

export default function AccountCard({ account, onToggle }: Props) {
  const statusColor = STATUS_COLORS[account.status] || '#64748b';
  const creditPct = account.credit.limit > 0
    ? (account.credit.used / account.credit.limit) * 100
    : 0;
  const healthStatus = account.health?.status || account.status;

  return (
    <div style={{
      ...styles.card,
      borderLeftColor: statusColor,
    }}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={{ ...styles.statusDot, background: statusColor }} />
          <div>
            <div style={styles.name}>{account.name}</div>
            <div style={styles.id}>{account.id}</div>
          </div>
        </div>
        <span style={{ ...styles.statusLabel, background: `${statusColor}20`, color: statusColor }}>
          {account.status.replace('_', ' ')}
        </span>
      </div>

      <div style={styles.stats}>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Health</span>
          <span style={{ ...styles.statValue, color: STATUS_COLORS[healthStatus] || '#64748b' }}>
            {healthStatus}
          </span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Latency</span>
          <span style={styles.statValue}>{account.health?.latency?.toFixed(0) || '-'}ms</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Requests</span>
          <span style={styles.statValue}>{account.health?.totalRequests || 0}</span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statLabel}>Errors</span>
          <span style={{ ...styles.statValue, color: account.health?.failedRequests > 0 ? '#ef4444' : undefined }}>
            {account.health?.failedRequests || 0}
          </span>
        </div>
      </div>

      <div style={styles.creditSection}>
        <div style={styles.creditHeader}>
          <span style={styles.creditLabel}>Credit Usage</span>
          <span style={styles.creditValue}>
            {account.credit.used} / {account.credit.limit}
          </span>
        </div>
        <div style={styles.barBg}>
          <div style={{
            ...styles.barFill,
            width: `${Math.min(creditPct, 100)}%`,
            background: creditPct > 80 ? '#ef4444' : creditPct > 50 ? '#f59e0b' : '#22c55e',
          }} />
        </div>
        <div style={styles.remaining}>
          {account.credit.remaining} remaining
        </div>
      </div>

      <button
        onClick={onToggle}
        style={{
          ...styles.toggleBtn,
          background: account.status === 'disabled' ? '#22c55e' : '#ef4444',
        }}
      >
        {account.status === 'disabled' ? 'Enable' : 'Disable'}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: '#1e293b',
    borderRadius: 12,
    padding: 16,
    border: '1px solid #334155',
    borderLeftWidth: 4,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
  },
  name: {
    fontSize: 15,
    fontWeight: 600,
    color: '#f1f5f9',
  },
  id: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'monospace',
  },
  statusLabel: {
    padding: '4px 10px',
    borderRadius: 8,
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 8,
    padding: '8px 0',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 600,
    color: '#e2e8f0',
  },
  creditSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  creditHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
  },
  creditLabel: {
    color: '#94a3b8',
  },
  creditValue: {
    color: '#e2e8f0',
    fontWeight: 500,
  },
  barBg: {
    height: 6,
    background: '#0f172a',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.5s',
  },
  remaining: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'right',
  },
  toggleBtn: {
    padding: '8px 16px',
    borderRadius: 8,
    border: 'none',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
};
