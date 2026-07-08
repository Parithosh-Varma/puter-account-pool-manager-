interface Stats {
  totalAccounts: number;
  activeAccounts: number;
  disabledAccounts: number;
  exhaustedAccounts: number;
  errorAccounts: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
}

interface Props {
  stats: Stats;
}

export default function Statistics({ stats }: Props) {
  const cards = [
    {
      label: 'Total Accounts',
      value: stats.totalAccounts,
      color: '#3b82f6',
    },
    {
      label: 'Active',
      value: stats.activeAccounts,
      color: '#22c55e',
    },
    {
      label: 'Disabled',
      value: stats.disabledAccounts,
      color: '#64748b',
    },
    {
      label: 'Exhausted',
      value: stats.exhaustedAccounts,
      color: '#f59e0b',
    },
    {
      label: 'Error',
      value: stats.errorAccounts,
      color: '#ef4444',
    },
    {
      label: 'Total Requests',
      value: stats.totalRequests.toLocaleString(),
      color: '#8b5cf6',
    },
    {
      label: 'Success Rate',
      value: stats.totalRequests > 0
        ? `${((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)}%`
        : 'N/A',
      color: '#22c55e',
    },
    {
      label: 'Avg Latency',
      value: `${stats.averageLatency.toFixed(0)}ms`,
      color: '#06b6d4',
    },
  ];

  return (
    <div style={styles.grid}>
      {cards.map(card => (
        <div key={card.label} style={styles.card}>
          <div style={styles.label}>{card.label}</div>
          <div style={{ ...styles.value, color: card.color }}>{card.value}</div>
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
    gap: 16,
    marginBottom: 28,
  },
  card: {
    background: 'var(--card-bg)',
    borderRadius: 14,
    padding: '20px 16px',
    textAlign: 'left',
    border: '1px solid var(--card-border)',
    backdropFilter: 'blur(8px)',
    transition: 'transform 0.2s, border-color 0.2s',
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 10,
  },
  value: {
    fontSize: 22,
    fontWeight: 700,
    fontFamily: "'JetBrains Mono', monospace",
  },
};
