import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  user: { id: string; name: string; role: string } | null;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthContextType['user']>(null);
  const token = localStorage.getItem('wop_token');

  useEffect(() => {
    if (token) {
      // Stub user for now
      setUser({ id: 'user-1', name: 'Admin', role: 'admin' });
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    return { user: { id: 'user-1', name: 'Admin', role: 'admin' }, token: localStorage.getItem('wop_token') };
  }
  return context;
};
