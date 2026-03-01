import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService, UserDto } from '../services/authService';

interface AuthContextType {
  user: UserDto | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserDto | null>(authService.getStoredUser());
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // On mount, verify the token is still valid
  useEffect(() => {
    const token = authService.getToken();
    if (token) {
      authService
        .getCurrentUser()
        .then((u) => setUser(u))
        .catch(() => {
          // token expired or invalid
          authService.logout();
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authService.login({ email, password });
    setUser(res.user);
  }, []);

  const register = useCallback(async (fullName: string, email: string, password: string) => {
    const res = await authService.register({ fullName, email, password });
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
