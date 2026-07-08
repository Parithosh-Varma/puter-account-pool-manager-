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
            borderColor: '#3b82f6',
          }}
        >
          Round Robin
        </button>
        <button
          onClick={() => onSet('least-used')}
          style={{
            ...styles.btn,
            ...(current === 'least-used' ? styles.btnActive : {}),
            borderColor: '#8b5cf6',
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
    gap: 12,
  },
  strategyDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  currentLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  currentValue: {
    fontSize: 15,
    fontWeight: 600,
  },
  buttons: {
    display: 'flex',
    gap: 8,
  },
  btn: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: 8,
    border: '1px solid',
    background: '#0f172a',
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  btnActive: {
    background: '#1e293b',
    fontWeight: 700,
  },
};
