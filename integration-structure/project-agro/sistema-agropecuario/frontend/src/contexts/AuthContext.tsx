/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import useAuth from '../hooks/useAuth';
import type { CustomUser } from '../types';

interface AuthContextType {
  user: CustomUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const auth = useAuth();

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};