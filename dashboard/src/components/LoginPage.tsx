import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { setAuth } = useAuth();

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>🔐</div>
        <h1 style={styles.title}>Puter Account Pool</h1>
        <p style={styles.subtitle}>Sign in to manage your AI account pool</p>
        <div style={styles.btnWrap}>
          <GoogleLogin
            onSuccess={async ({ credential }) => {
              if (!credential) return;
              const res = await fetch('/api/auth/google', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken: credential }),
              });
              const data = await res.json();
              if (data.user) {
                setAuth(data.user, data.token);
              }
            }}
            onError={() => alert('Sign in failed')}
            theme="filled_black"
            shape="pill"
            text="signin_with"
          />
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'var(--bg-color)',
    fontFamily: "'Outfit', -apple-system, sans-serif",
  },
  card: {
    background: 'var(--card-bg)',
    borderRadius: 24,
    padding: '48px 40px',
    textAlign: 'center',
    border: '1px solid var(--card-border)',
    backdropFilter: 'blur(8px)',
    maxWidth: 400,
    width: '90%',
  },
  logo: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: '0 0 8px',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: 14,
    color: 'var(--text-secondary)',
    margin: '0 0 32px',
  },
  btnWrap: {
    display: 'flex',
    justifyContent: 'center',
  },
};
