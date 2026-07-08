import AccountCard from './AccountCard';

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
  accounts: Account[];
  onToggle: (id: string, status: string) => void;
  onRefresh: () => void;
  onDelete: (id: string) => void;
}

export default function AccountList({ accounts, onToggle, onRefresh, onDelete }: Props) {
  if (accounts.length === 0) {
    return (
      <div style={styles.empty}>
        <div style={styles.emptyIcon}>📭</div>
        <p style={styles.emptyText}>No accounts configured</p>
        <p style={styles.emptyHint}>Add accounts via the REST API or environment variables</p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={styles.heading}>
        Accounts
        <span style={styles.count}>{accounts.length}</span>
      </h2>
      <div style={styles.grid}>
        {accounts.map(account => (
          <AccountCard
            key={account.id}
            account={account}
            onToggle={() => onToggle(account.id, account.status)}
            onRefresh={onRefresh}
            onDelete={() => onDelete(account.id)}
          />
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  heading: {
    fontSize: 18,
    fontWeight: 600,
    color: '#e2e8f0',
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  count: {
    fontSize: 13,
    fontWeight: 500,
    color: '#64748b',
    background: '#1e293b',
    padding: '2px 8px',
    borderRadius: 10,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: 12,
  },
  empty: {
    textAlign: 'center',
    padding: 48,
    color: '#64748b',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 500,
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
  },
};
