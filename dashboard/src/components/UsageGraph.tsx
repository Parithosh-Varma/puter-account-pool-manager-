import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

interface Request {
  id: string;
  accountId: string;
  model: string;
  latency: number;
  success: boolean;
  retryCount: number;
  timestamp: string;
}

interface Props {
  requests: Request[];
  theme?: 'dark' | 'light';
}

export default function UsageGraph({ requests, theme = 'dark' }: Props) {
  const recentRequests = requests.slice(-50);

  const latencyData = recentRequests.map((r, idx) => ({
    index: idx,
    latency: r.latency,
    success: r.success ? 1 : 0,
  }));

  const modelCounts: Record<string, number> = {};
  const successCounts = { success: 0, failed: 0 };

  for (const r of recentRequests) {
    const model = r.model || 'unknown';
    modelCounts[model] = (modelCounts[model] || 0) + 1;
    if (r.success) successCounts.success++;
    else successCounts.failed++;
  }

  const modelData = Object.entries(modelCounts).map(([model, count]) => ({
    model: model.length > 15 ? model.slice(0, 15) + '...' : model,
    count,
  }));

  const pieData = [
    { name: 'Success', value: successCounts.success, fill: '#10b981' },
    { name: 'Failed', value: successCounts.failed, fill: '#f43f5e' },
  ];

  if (recentRequests.length === 0) {
    return (
      <div style={styles.empty}>
        <p style={styles.emptyText}>No request data yet. Submit AI requests to see graphs.</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Request Analytics</h2>
      <div style={styles.grid}>
        <div style={styles.chartCard}>
          <div style={styles.chartTitle}>Latency (ms)</div>
          <ResponsiveContainer width="100%" height={200} key={theme}>
            <LineChart data={latencyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="index" tick={false} stroke="var(--text-secondary)" />
              <YAxis stroke="var(--text-secondary)" fontSize={10} />
              <Tooltip
                contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--card-border)', borderRadius: 12 }}
                labelStyle={{ color: 'var(--text-secondary)' }}
              />
              <Line
                type="monotone"
                dataKey="latency"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={styles.chartCard}>
          <div style={styles.chartTitle}>Requests by Model</div>
          <ResponsiveContainer width="100%" height={200} key={theme}>
            <BarChart data={modelData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="model" stroke="var(--text-secondary)" fontSize={9} />
              <YAxis stroke="var(--text-secondary)" fontSize={10} />
              <Tooltip
                contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--card-border)', borderRadius: 12 }}
              />
              <Bar dataKey="count" fill="#818cf8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={styles.chartCard}>
          <div style={styles.chartTitle}>Success vs Failure</div>
          <ResponsiveContainer width="100%" height={200} key={theme}>
            <BarChart data={pieData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
              <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={10} />
              <YAxis stroke="var(--text-secondary)" fontSize={10} />
              <Tooltip
                contentStyle={{ background: 'var(--chart-tooltip-bg)', border: '1px solid var(--card-border)', borderRadius: 12 }}
              />
              <Legend />
              <Bar dataKey="value" name="Requests" radius={[4, 4, 0, 0]}>
                {pieData.map(entry => (
                  <rect key={entry.name} fill={entry.name === 'Success' ? '#10b981' : '#f43f5e'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: 32,
  },
  heading: {
    fontSize: 18,
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: 16,
    letterSpacing: '-0.01em',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: 20,
  },
  chartCard: {
    background: 'var(--card-bg)',
    borderRadius: 16,
    padding: 20,
    border: '1px solid var(--card-border)',
    backdropFilter: 'blur(8px)',
  },
  chartTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  },
  empty: {
    textAlign: 'center',
    padding: 48,
    color: 'var(--text-secondary)',
    background: 'var(--card-bg)',
    borderRadius: 16,
    border: '1px solid var(--card-border)',
    marginBottom: 32,
  },
  emptyText: {
    fontSize: 14,
  },
};
