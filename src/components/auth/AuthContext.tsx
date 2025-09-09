 'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import PostgreSQLService from '../../../src/services/PostgreSQLService';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const data = await PostgreSQLService.me();
      if (data) setUser(data);
      else setUser(null);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const data = await PostgreSQLService.login(email, password);
      // PostgreSQLService.login stores tokens and returns token payload / user info when available
      if (data) {
        // Try to fetch /me to get user object
        try {
          const me = await PostgreSQLService.me();
          setUser(me || null);
        } catch (err) {
          setUser(null);
        }
        return { success: true };
      }
      return { success: false, error: 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error occurred' };
    }
  };

  const register = async (
    email: string, 
    password: string, 
    firstName?: string, 
    lastName?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const data = await PostgreSQLService.register(email, password, firstName, lastName);
      if (data) {
        // After registration, attempt to login automatically (if tokens provided)
        try {
          const me = await PostgreSQLService.me();
          setUser(me || null);
        } catch (err) {
          setUser(null);
        }
        return { success: true };
      }
      return { success: false, error: 'Registration failed' };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Network error occurred' };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await PostgreSQLService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  };

  const refreshUser = async (): Promise<void> => {
    await checkAuth();
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}