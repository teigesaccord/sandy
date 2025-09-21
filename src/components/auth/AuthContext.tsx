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
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include' // Include HTTP-only cookies
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.log('Auth check failed:', err);
      setUser(null);
      // Don't redirect here as this runs on page load
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies for HTTP-only cookie setting
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        return { success: true };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.error || 'Login failed' };
      }
    } catch (error: any) {
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
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies for HTTP-only cookie setting
        body: JSON.stringify({ email, password, firstName, lastName })
      });

      if (response.ok) {
        const data = await response.json();
        // Registration successful but doesn't auto-login, user needs to login separately
        console.log('Registration successful:', data.message);
        return { success: true };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.error || 'Registration failed' };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: 'Network error occurred' };
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include' // Include cookies for logout
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      // Redirect to login page after logout
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      await checkAuth();
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setUser(null);
    }
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