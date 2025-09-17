'use client';

import { useState, useEffect } from 'react';
import { IntakeForm } from '../../components/IntakeForm';
import { UserProfileCard } from '../../components/UserProfileCard';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { useAuth } from '../../components/auth/AuthContext';
import PostgreSQLService from '../../services/PostgreSQLService';
import Link from 'next/link';

function AuthenticatedProfilePage() {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
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
      // If profile is incomplete, start in editing mode
      if (!data || data.intakeStatus?.completionPercentage < 50) {
        setIsEditing(true);
      }
    } catch (error: any) {
      console.error('Failed to load user profile:', error);
      if (error.message.includes('Authentication expired')) {
        setUserProfile(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleIntakeComplete = async (profile: any) => {
    setUserProfile(profile);
    setIsEditing(false);
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
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Your Profile</h2>
            <p className="text-muted-foreground">
              {isEditing 
                ? "Complete your profile to get personalized support from Sandy."
                : "Manage your personal information and preferences."
              }
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/"
              className="btn btn-ghost btn-sm"
            >
              Back to Home
            </Link>
            {userProfile && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="btn btn-secondary btn-sm"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold mb-4">
                {userProfile ? 'Update Your Information' : 'Let\'s Get to Know You'}
              </h3>
              <p className="text-muted-foreground">
                Help Sandy provide better support by sharing information about yourself.
              </p>
            </div>
            <IntakeForm
              userId={user.id}
              onComplete={handleIntakeComplete}
              onBack={() => userProfile ? setIsEditing(false) : null}
            />
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <UserProfileCard
                userId={user.id}
                profile={userProfile}
                onUpdateProfile={loadUserProfile}
              />
            </div>
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Profile Completion</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Overall Progress</span>
                    <span>{userProfile?.intakeStatus?.completionPercentage || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${userProfile?.intakeStatus?.completionPercentage || 0}%` }}
                    ></div>
                  </div>
                  {userProfile?.intakeStatus?.completionPercentage < 100 && (
                    <p className="text-sm text-muted-foreground">
                      Complete your profile to unlock all of Sandy's personalized features.
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Link
                    href="/chat"
                    className="w-full btn btn-primary"
                  >
                    Start Chatting with Sandy
                  </Link>
                  <Link
                    href="/recommendations"
                    className="w-full btn btn-secondary"
                    aria-disabled={!userProfile}
                  >
                    View Recommendations
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <AuthenticatedProfilePage />
    </ProtectedRoute>
  );
}