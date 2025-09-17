'use client';

import { useState, useEffect } from 'react';
import { RecommendationsList } from '../../components/RecommendationsList';
import { UserProfileCard } from '../../components/UserProfileCard';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { useAuth } from '../../components/auth/AuthContext';
import PostgreSQLService from '../../services/PostgreSQLService';
import Link from 'next/link';

function AuthenticatedRecommendationsPage() {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const data = await PostgreSQLService.getUserProfile(user.id);
      setUserProfile(data);
    } catch (error: any) {
      console.error('Failed to load user profile:', error);
      if (error.message.includes('Authentication expired')) {
        setUserProfile(null);
      }
    } finally {
      setIsLoading(false);
    }
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading recommendations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Personal Recommendations</h2>
            <p className="text-muted-foreground">
              Customized suggestions based on your profile and goals.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/"
              className="btn btn-ghost btn-sm"
            >
              Back to Home
            </Link>
            <Link
              href="/chat"
              className="btn btn-primary btn-sm"
            >
              Chat with Sandy
            </Link>
          </div>
        </div>

        {!userProfile || userProfile.intakeStatus?.completionPercentage < 50 ? (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                <span className="text-2xl">📋</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Complete Your Profile First</h3>
              <p className="text-muted-foreground mb-6">
                To get personalized recommendations, please complete your profile so Sandy can better understand your needs.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/profile"
                  className="btn btn-primary"
                >
                  Complete Profile
                </Link>
                <Link
                  href="/chat"
                  className="btn btn-secondary"
                >
                  Chat with Sandy
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <UserProfileCard
                userId={user.id}
                profile={userProfile}
                onUpdateProfile={loadUserProfile}
              />
            </div>
            <div className="lg:col-span-3">
              <RecommendationsList userId={user.id} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RecommendationsPage() {
  return (
    <ProtectedRoute>
      <AuthenticatedRecommendationsPage />
    </ProtectedRoute>
  );
}