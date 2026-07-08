import { useState, useEffect } from 'react';

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
  onRefresh: () => void;
  onDelete: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  active: '#10b981',
  disabled: '#6b7280',
  exhausted: '#f59e0b',
  error: '#f43f5e',
  pending_verification: '#6366f1',
};

export default function AccountCard({ account, onToggle, onRefresh, onDelete }: Props) {
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'puter-auth' && e.data?.token) {
        const id = e.data.accountId || account.id;
        updateAccountToken(id, e.data.token);
      }
    };
    window.addEventListener('message', handler);
  }, [account.id]);

  const statusColor = STATUS_COLORS[account.status] || '#64748b';
  const creditPct = account.credit.limit > 0
    ? (account.credit.used / account.credit.limit) * 100
    : 0;
  const healthStatus = account.health?.status || account.status;

  const reauthWithPuter = () => {
    setSaving(true);
    setMsg('');
    const origin = window.location.origin;
    const callbackUrl = `${origin}/puter-callback.html?account=${encodeURIComponent(account.id)}`;
    const authUrl = `https://puter.com/?action=authme&redirectURL=${encodeURIComponent(callbackUrl)}`;
    window.open(authUrl, 'puter-auth', 'width=600,height=700');
  };

  const updateAccountToken = async (id: string, token: string) => {
    try {
      const res = await fetch(`/api/accounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, status: 'pending_verification' }),
      });
      if (res.ok) {
        setMsg('Token updated! Re-verifying...');
        onRefresh();
      } else {
        const data = await res.json();
        setMsg(data.error || 'Failed to update');
      }
    } catch {
      setMsg('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      ...styles.card,
      borderLeftColor: statusColor,
      borderRightColor: account.status === 'error' ? 'rgba(244, 63, 94, 0.3)' : 'var(--card-border)',
      borderTopColor: account.status === 'error' ? 'rgba(244, 63, 94, 0.3)' : 'var(--card-border)',
      borderBottomColor: account.status === 'error' ? 'rgba(244, 63, 94, 0.3)' : 'var(--card-border)',
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

      <div style={styles.actions}>
        <button onClick={onToggle} style={{
          ...styles.actionBtn,
          background: account.status === 'disabled' ? '#22c55e' : '#ef4444',
        }}>
          {account.status === 'disabled' ? 'Enable' : 'Disable'}
        </button>
        <button onClick={reauthWithPuter} disabled={saving} style={{
          ...styles.actionBtn,
          background: '#6366f1',
        }}>
          {saving ? 'Re-authenticating...' : 'Re-auth with Puter'}
        </button>
        {confirmDelete ? (
          <div style={styles.deleteConfirm}>
            <span style={styles.deleteWarning}>Delete?</span>
            <button onClick={() => { onDelete(); setConfirmDelete(false); }} style={styles.confirmBtn}>Yes</button>
            <button onClick={() => setConfirmDelete(false)} style={styles.cancelBtn}>No</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} style={{
            ...styles.actionBtn,
            background: '#dc2626',
          }}>
            Delete
          </button>
        )}
      </div>

      {msg && (
        <div style={{ ...styles.msg, color: msg.includes('error') || msg.includes('Failed') || msg.includes('Network') ? '#f43f5e' : '#10b981' }}>
          {msg}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--card-bg)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--card-border)',
    borderLeftWidth: 4,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    backdropFilter: 'blur(8px)',
    transition: 'transform 0.2s, border-color 0.2s',
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
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  name: {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--text-primary)',
    letterSpacing: '-0.01em',
  },
  id: {
    fontSize: 11,
    color: 'var(--text-secondary)',
    fontFamily: "'JetBrains Mono', monospace",
  },
  statusLabel: {
    padding: '4px 10px',
    borderRadius: 9999,
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
    padding: '12px 0',
    borderTop: '1px solid var(--border-subtle)',
    borderBottom: '1px solid var(--border-subtle)',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  statValue: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
    fontFamily: "'JetBrains Mono', monospace",
  },
  creditSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  creditHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
  },
  creditLabel: {
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  creditValue: {
    color: 'var(--text-primary)',
    fontWeight: 600,
    fontFamily: "'JetBrains Mono', monospace",
  },
  barBg: {
    height: 6,
    background: 'var(--panel-bg)',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 9999,
    transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  remaining: {
    fontSize: 11,
    color: 'var(--text-secondary)',
    textAlign: 'right',
  },
  actions: {
    display: 'flex',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    padding: '8px 16px',
    borderRadius: 10,
    border: 'none',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  msg: {
    fontSize: 12,
    fontWeight: 500,
    textAlign: 'center',
  },
  deleteConfirm: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '0 4px',
  },
  deleteWarning: {
    fontSize: 11,
    fontWeight: 600,
    color: '#f43f5e',
  },
  confirmBtn: {
    padding: '4px 10px',
    borderRadius: 6,
    border: 'none',
    background: '#dc2626',
    color: '#fff',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '4px 10px',
    borderRadius: 6,
    border: '1px solid var(--card-border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
  },
};
