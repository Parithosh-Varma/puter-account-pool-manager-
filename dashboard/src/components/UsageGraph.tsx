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
}

export default function UsageGraph({ requests }: Props) {
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
    { name: 'Success', value: successCounts.success, fill: '#22c55e' },
    { name: 'Failed', value: successCounts.failed, fill: '#ef4444' },
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
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={latencyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="index" tick={false} stroke="#64748b" />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Line
                type="monotone"
                dataKey="latency"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={styles.chartCard}>
          <div style={styles.chartTitle}>Requests by Model</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={modelData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="model" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              />
              <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={styles.chartCard}>
          <div style={styles.chartTitle}>Success vs Failure</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={pieData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              />
              <Legend />
              <Bar dataKey="value" name="Requests" radius={[4, 4, 0, 0]}>
                {pieData.map(entry => (
                  <rect key={entry.name} fill={entry.fill} />
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
    marginBottom: 24,
  },
  heading: {
    fontSize: 18,
    fontWeight: 600,
    color: '#e2e8f0',
    marginBottom: 16,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: 12,
  },
  chartCard: {
    background: '#1e293b',
    borderRadius: 12,
    padding: 16,
    border: '1px solid #334155',
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#94a3b8',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  empty: {
    textAlign: 'center',
    padding: 48,
    color: '#64748b',
    background: '#1e293b',
    borderRadius: 12,
    border: '1px solid #334155',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 14,
  },
};
