import React, { createContext, useContext } from 'react';

interface User {
  id: string;
  name: string;
}

interface AuthContextType {
  user: User;
}

const defaultUser: User = {
  id: '123e4567-e89b-12d3-a456-426614174000', // Valid UUID for development
  name: 'Demo User'
};

const AuthContext = createContext<AuthContextType>({ user: defaultUser });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider value={{ user: defaultUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}