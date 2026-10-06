import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { User } from '../types/index.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (userData: any) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('smartattend_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('smartattend_token');
      if (savedToken) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.data.user);
        } catch (err) {
          console.warn('[Auth] Token invalid or expired');
          localStorage.removeItem('smartattend_token');
          localStorage.removeItem('smartattend_user');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: newUser } = res.data.data;
    localStorage.setItem('smartattend_token', newToken);
    localStorage.setItem('smartattend_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    return newUser;
  };

  const register = async (userData: any): Promise<User> => {
    const res = await api.post('/auth/register', userData);
    const { token: newToken, user: newUser } = res.data.data;
    localStorage.setItem('smartattend_token', newToken);
    localStorage.setItem('smartattend_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    return newUser;
  };

  const logout = () => {
    localStorage.removeItem('smartattend_token');
    localStorage.removeItem('smartattend_user');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.data.user);
    } catch (err) {
      console.warn('Failed to refresh user:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

