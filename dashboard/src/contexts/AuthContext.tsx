import { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextValue {
  user: { uid: string; email: string | null; name: string | null; picture: string | null } | null;
  idToken: string | null;
  setAuth: (user: AuthContextValue['user'], token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  idToken: null,
  setAuth: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthContextValue['user']>(() => {
    const stored = localStorage.getItem('auth_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [idToken, setIdToken] = useState<string | null>(() => localStorage.getItem('auth_token'));

  const setAuth = (u: AuthContextValue['user'], token: string) => {
    setUser(u);
    setIdToken(token);
    localStorage.setItem('auth_user', JSON.stringify(u));
    localStorage.setItem('auth_token', token);
  };

  const logout = () => {
    setUser(null);
    setIdToken(null);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
  };

  return (
    <AuthContext.Provider value={{ user, idToken, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
