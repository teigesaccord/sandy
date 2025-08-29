'use client';

import React, { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { AuthForm } from './AuthForm';

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
  requireProfile?: boolean;
}

export function ProtectedRoute({ 
  children, 
  fallback, 
  requireProfile = false 
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [showAuth, setShowAuth] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<'login' | 'register'>('login');

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // User is not authenticated
  if (!user) {
    if (fallback) {
      return <>{fallback}</>;
    }

    // Show authentication modal/form
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Sandy Support Chatbot
            </h1>
            <p className="text-gray-600">
              Sign in to access your personalized support experience
            </p>
          </div>
          
          <AuthForm
            mode={authMode}
            onToggleMode={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
            onSuccess={() => {
              // Authentication successful, component will re-render with user
            }}
          />
        </div>
      </div>
    );
  }

  // User is authenticated - check if profile is required
  if (requireProfile) {
    // You can add profile checking logic here if needed
    // For now, we'll assume if user exists, they can access the content
  }

  // User is authenticated, show protected content
  return <>{children}</>;
}

// Hook for components that need to check auth status
export function useRequireAuth() {
  const { user, loading } = useAuth();
  
  return {
    isAuthenticated: !!user,
    user,
    loading,
    requiresAuth: !user && !loading
  };
}

// Higher-order component version
export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: {
    requireProfile?: boolean;
    fallback?: ReactNode;
  }
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <ProtectedRoute 
        requireProfile={options?.requireProfile}
        fallback={options?.fallback}
      >
        <WrappedComponent {...props} />
      </ProtectedRoute>
    );
  };
}