interface Props {
  current: string;
  onSet: (strategy: string) => void;
}

export default function StrategyControl({ current, onSet }: Props) {
  return (
    <div style={styles.container}>
      <div style={styles.strategyDisplay}>
        <span style={styles.currentLabel}>Current:</span>
        <span style={{
          ...styles.currentValue,
          color: current === 'round-robin' ? '#3b82f6' : '#8b5cf6',
        }}>
          {current === 'round-robin' ? 'Round Robin' : 'Least Used'}
        </span>
      </div>
      <div style={styles.buttons}>
        <button
          onClick={() => onSet('round-robin')}
          style={{
            ...styles.btn,
            ...(current === 'round-robin' ? styles.btnActive : {}),
          }}
        >
          Round Robin
        </button>
        <button
          onClick={() => onSet('least-used')}
          style={{
            ...styles.btn,
            ...(current === 'least-used' ? styles.btnActive : {}),
          }}
        >
          Least Used
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  strategyDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  currentLabel: {
    fontSize: 13,
    color: 'var(--text-secondary)',
  },
  currentValue: {
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: '-0.01em',
  },
  buttons: {
    display: 'flex',
    gap: 8,
    background: 'var(--panel-bg)',
    padding: 3,
    borderRadius: 10,
    border: '1px solid var(--card-border)',
  },
  btn: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: 8,
    border: 'none',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  btnActive: {
    background: '#6366f1',
    color: '#ffffff',
    fontWeight: 600,
    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
  },
};
