import React, { createContext, useContext } from 'react';

interface User {
  id: string;
  name: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
}

const AuthContext = createContext<AuthContextType>({ user: null });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthContext.Provider value={{ user: { id: 'user-1', name: 'User' } }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
