'use client';

import { useState, useEffect } from 'react';
import { StatusIndicator } from '../components/StatusIndicator';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { useAuth } from '../components/auth/AuthContext';
import PostgreSQLService from '../services/PostgreSQLService';
import Link from 'next/link';

function AuthenticatedHomePage() {
  const { user, logout } = useAuth();
  const [isConnected, setIsConnected] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load user profile when component mounts
  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      const data = await PostgreSQLService.getUserProfile(user.id);
      setUserProfile(data);
    } catch (error: any) {
      console.error('Failed to load user profile:', error);
      // If authentication expired, the service will automatically redirect
      // Just log the error and clear the profile
      if (error.message.includes('Authentication expired')) {
        setUserProfile(null);
        // logout() will be called by the service's handleUnauthorized method
      }
    }
  };

  const handleLogout = async () => {
    setUserProfile(null);
    await logout();
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="container py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-between mb-6">
              <div></div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  Welcome, {user.firstName || user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="btn btn-ghost btn-sm"
                >
                  Logout
                </button>
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="text-gradient">Meet Sandy</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
              Your compassionate AI assistant, here to provide personalized support
              and guidance for life's daily challenges.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                href={userProfile?.intakeStatus?.completionPercentage > 50 ? '/chat' : '/profile'}
                className="btn btn-primary btn-lg"
              >
                {userProfile?.intakeStatus?.completionPercentage > 50 ? 'Continue Chatting' : 'Get Started'}
              </Link>
              <Link
                href="/profile"
                className="btn btn-outline btn-lg"
              >
                Complete Profile
              </Link>
              <Link
                href="/recommendations"
                className={`btn btn-secondary btn-lg ${!userProfile ? 'opacity-50 pointer-events-none' : ''}`}
              >
                View Recommendations
              </Link>
            </div>

            {/* Status Bar */}
            <div className="flex items-center justify-center gap-4 p-4 glass-effect rounded-lg max-w-md mx-auto">
              <StatusIndicator isConnected={isConnected} />
              <span className="text-sm text-muted-foreground">
                {isConnected ? 'Connected' : 'Connecting...'}
              </span>
              {userProfile && (
                <span className="text-sm text-muted-foreground">
                  • Profile {userProfile.intakeStatus?.completionPercentage || 0}% complete
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="container pb-16">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Personalized Support</h3>
              <p className="text-muted-foreground">
                Tailored guidance based on your unique needs, preferences, and goals.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <span className="text-2xl">🤝</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Compassionate Care</h3>
              <p className="text-muted-foreground">
                Understanding and empathetic responses that acknowledge your challenges.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                <span className="text-2xl">🚀</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Actionable Insights</h3>
              <p className="text-muted-foreground">
                Practical recommendations and strategies you can implement today.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg shadow-lg">
            <div className="flex items-center gap-3">
              <div className="spinner"></div>
              <span>Loading...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <ProtectedRoute>
      <AuthenticatedHomePage />
    </ProtectedRoute>
  );
}