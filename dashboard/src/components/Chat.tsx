import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  accountId?: string;
  latency?: number;
  error?: string;
}

interface FeedModel {
  id: string;
  name: string;
  provider: string;
  description: string;
}

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: '#d97706',
  google: '#4285f4',
  qwen: '#10b981',
};

const PROVIDER_LOGOS: Record<string, string> = {
  anthropic: 'A',
  google: 'G',
  qwen: 'Q',
};

export default function Chat() {
  const { idToken } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Send a message to test the account pool.' },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [model, setModel] = useState('claude-fable-5');
  const [feedModels, setFeedModels] = useState<FeedModel[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const authHeaders = (): Record<string, string> => idToken ? { Authorization: `Bearer ${idToken}` } : {};

  useEffect(() => {
    fetch('/api/models', { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setFeedModels(d.models || []))
      .catch(() => {});
  }, [idToken]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = feedModels.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.provider.toLowerCase().includes(search.toLowerCase())
  );

  const selectModel = (name: string) => {
    setModel(name);
    setShowDropdown(false);
    setSearch('');
  };

  const send = async () => {
    if (!input.trim() || sending) return;
    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ model, prompt: input }),
      });
      const data = await res.json();
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.response || 'no response',
        model,
        accountId: data.accountId,
        latency: data.latency,
        error: data.error,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Request failed',
        error: err instanceof Error ? err.message : 'unknown error',
      }]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.toolbar}>
        <div style={styles.modelSelector} ref={dropdownRef}>
          <div style={styles.modelDisplay} onClick={() => setShowDropdown(!showDropdown)}>
            {(() => {
              const active = feedModels.find(m => m.name === model || m.id === model);
              const p = active?.provider || '';
              return (
                <div style={{ ...styles.providerLogo, background: PROVIDER_COLORS[p] || '#6366f1' }}>
                  {PROVIDER_LOGOS[p] || p[0]?.toUpperCase() || '?'}
                </div>
              );
            })()}
            <span style={styles.modelLabel}>{model}</span>
            <span style={styles.arrow}>{showDropdown ? '\u25B2' : '\u25BC'}</span>
          </div>
          {showDropdown && (
            <div style={styles.dropdown}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search models..."
                style={styles.searchInput}
                autoFocus
              />
              <div style={styles.dropdownList}>
                {search && !feedModels.some(m => m.name.toLowerCase() === search.toLowerCase()) && (
                  <div
                    style={styles.dropdownItem}
                    onClick={() => selectModel(search)}
                  >
                    <span style={styles.customBadge}>custom</span>
                    {search}
                  </div>
                )}
                {filtered.map(m => (
                  <div
                    key={m.id}
                    style={{
                      ...styles.dropdownItem,
                      background: model === m.id ? '#1e293b' : 'transparent',
                    }}
                    onClick={() => selectModel(m.id)}
                  >
                    <div style={styles.itemLeft}>
                      <div style={{ ...styles.providerLogoSmall, background: PROVIDER_COLORS[m.provider] || '#6366f1' }}>
                        {PROVIDER_LOGOS[m.provider] || m.provider[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div style={styles.itemTop}>
                          <span style={styles.itemName}>{m.name}</span>
                          <span style={styles.itemProvider}>{m.provider}</span>
                        </div>
                        <div style={styles.itemDesc}>{m.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && !search && (
                  <div style={styles.loadingText}>Loading models...</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={styles.messages}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            ...styles.message,
            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
          }}>
            <div style={{
              ...styles.bubble,
              background: msg.role === 'user' ? '#6366f1' : 'var(--panel-bg)',
              border: msg.role === 'user' ? 'none' : '1px solid var(--card-border)',
              color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
            }}>
              <div style={styles.bubbleText}>{msg.content}</div>
              {(msg.accountId || msg.latency) && (
                <div style={styles.meta}>
                  {msg.accountId && <span>via {msg.accountId}</span>}
                  {msg.latency && <span>{msg.latency}ms</span>}
                </div>
              )}
              {msg.error && <div style={styles.error}>{msg.error}</div>}
            </div>
          </div>
        ))}
        {sending && (
          <div style={styles.typing}>
            <span style={styles.dot} /><span style={styles.dot} /><span style={styles.dot} />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={styles.inputBar}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          style={styles.textarea}
        />
        <button onClick={send} disabled={sending || !input.trim()} style={styles.sendBtn}>
          Send
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - 200px)',
    background: 'var(--card-bg)',
    borderRadius: 16,
    border: '1px solid var(--card-border)',
    overflow: 'hidden',
    backdropFilter: 'blur(8px)',
  },
  toolbar: {
    padding: '14px 20px',
    borderBottom: '1px solid var(--border-subtle)',
    background: 'rgba(255, 255, 255, 0.02)',
  },
  modelSelector: {
    position: 'relative',
    maxWidth: 400,
  },
  modelDisplay: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 14px',
    borderRadius: 10,
    border: '1px solid var(--card-border)',
    background: 'var(--input-bg)',
    color: 'var(--text-primary)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  modelLabel: {
    fontWeight: 500,
  },
  arrow: {
    fontSize: 9,
    color: 'var(--text-secondary)',
    marginLeft: 8,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 6,
    background: 'var(--input-bg)',
    border: '1px solid var(--card-border)',
    borderRadius: 12,
    zIndex: 100,
    maxHeight: 360,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
  },
  searchInput: {
    padding: '10px 14px',
    border: 'none',
    borderBottom: '1px solid var(--border-subtle)',
    background: 'transparent',
    color: 'var(--text-primary)',
    fontSize: 13,
    outline: 'none',
  },
  dropdownList: {
    overflowY: 'auto',
    maxHeight: 300,
  },
  dropdownItem: {
    padding: '10px 14px',
    cursor: 'pointer',
    borderBottom: '1px solid var(--border-subtle)',
    transition: 'background 0.2s',
  },
  itemTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  itemProvider: {
    fontSize: 10,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  itemDesc: {
    fontSize: 11,
    color: 'var(--text-secondary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  customBadge: {
    fontSize: 10,
    color: '#6366f1',
    marginRight: 6,
    fontWeight: 600,
  },
  loadingText: {
    padding: 16,
    textAlign: 'center',
    color: 'var(--text-secondary)',
    fontSize: 13,
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  message: {
    display: 'flex',
    gap: 10,
  },
  bubble: {
    maxWidth: '75%',
    padding: '12px 16px',
    borderRadius: 16,
    fontSize: 14,
    lineHeight: 1.6,
  },
  bubbleText: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  meta: {
    display: 'flex',
    gap: 8,
    marginTop: 8,
    fontSize: 11,
    color: 'var(--text-secondary)',
    fontFamily: "'JetBrains Mono', monospace",
  },
  error: {
    marginTop: 8,
    fontSize: 11,
    color: '#f43f5e',
  },
  typing: {
    display: 'flex',
    gap: 4,
    padding: '10px 16px',
    alignSelf: 'flex-start',
    background: 'var(--panel-bg)',
    borderRadius: 16,
    border: '1px solid var(--card-border)',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'var(--text-secondary)',
    animation: 'pulse 1.4s infinite',
  },
  inputBar: {
    display: 'flex',
    gap: 10,
    padding: '16px 20px',
    borderTop: '1px solid var(--border-subtle)',
    background: 'rgba(255, 255, 255, 0.01)',
  },
  textarea: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid var(--card-border)',
    background: 'var(--input-bg)',
    color: 'var(--text-primary)',
    fontSize: 14,
    resize: 'none',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  },
  sendBtn: {
    padding: '10px 24px',
    borderRadius: 10,
    border: 'none',
    background: '#6366f1',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
  },
};
