import { useState, useEffect } from 'react';

interface Props {
  onAdded: () => void;
}

export default function AddAccountForm({ onAdded }: Props) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'puter-auth' && e.data?.token) {
        const accountName = e.data.accountName || name.trim();
        if (!accountName) {
          setMessage('Enter an account name first');
          setIsError(true);
          return;
        }
        submitToken(accountName, e.data.token);
      }
    };
    window.addEventListener('message', handler);
  }, [name]);

  const signInWithPuter = () => {
    if (!name.trim()) {
      setMessage('Enter an account name first');
      setIsError(true);
      return;
    }
    const origin = window.location.origin;
    const callbackUrl = `${origin}/puter-callback.html?name=${encodeURIComponent(name.trim())}`;
    const authUrl = `https://puter.com/?action=authme&redirectURL=${encodeURIComponent(callbackUrl)}`;
    window.open(authUrl, 'puter-auth', 'width=600,height=700');
  };

  const submitToken = async (accountName: string, token: string) => {
    setSaving(true);
    setMessage('');
    setIsError(false);
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: accountName, token }),
      });
      const data = await res.json();
      const verification = data.verification;
      if (verification?.valid) {
        setMessage('Account added and verified!');
        setName('');
        setIsError(false);
        onAdded();
      } else {
        setMessage(verification?.error || 'Token invalid — try again');
        setIsError(true);
        onAdded();
      }
    } catch {
      setMessage('Network error');
      setIsError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>Add Account</div>
      <div style={styles.form}>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Account name (e.g. My Account)"
          style={styles.input}
        />
        <button onClick={signInWithPuter} disabled={saving || !name.trim()} style={styles.puterBtn}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginRight: 8 }}>
            <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" stroke="currentColor" strokeWidth="2" fill="none"/>
            <path d="M12 12l-8-4 8-4 8 4-8 4z" fill="currentColor" opacity="0.3"/>
          </svg>
          {saving ? 'Signing in...' : 'Sign in with Puter'}
        </button>
        {message && (
          <div style={{ ...styles.message, color: isError ? '#f43f5e' : '#10b981' }}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
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
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  input: {
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid var(--card-border)',
    background: 'var(--input-bg)',
    color: 'var(--text-primary)',
    fontSize: 14,
    outline: 'none',
    fontFamily: 'inherit',
  },
  puterBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 20px',
    borderRadius: 10,
    border: '1px solid var(--card-border)',
    background: 'var(--input-bg)',
    color: 'var(--text-primary)',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  message: {
    fontSize: 13,
    fontWeight: 500,
  },
};
