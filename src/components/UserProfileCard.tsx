'use client';

import { useState, useEffect } from 'react';
import { User, Edit3, Calendar, Target, Briefcase, MessageSquare, TrendingUp, Award } from 'lucide-react';
import type { UserProfile } from '../types';
import PostgreSQLService from '../services/PostgreSQLService';

interface UserProfileCardProps {
  userId: string;
  profile?: UserProfile | null;
  onUpdateProfile?: () => void;
  className?: string;
}

export function UserProfileCard({ userId, profile, onUpdateProfile, className = '' }: UserProfileCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localProfile, setLocalProfile] = useState<UserProfile | null>(profile || null);

  useEffect(() => {
    if (profile) {
      setLocalProfile(profile);
    } else {
      loadProfile();
    }
  }, [profile, userId]);

  const loadProfile = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`/api/users/${userId}/profile`, {
        method: 'GET',
        credentials: 'include' // Include HTTP-only cookies for authentication
      });

      if (response.ok) {
        const data = await response.json();
        setLocalProfile(data.profile);
      } else if (response.status === 401) {
        // Authentication expired
        console.log('Authentication expired in UserProfileCard');
      } else {
        console.error('Failed to load user profile:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const getCompletionPercentage = () => {
    if (!localProfile?.intakeStatus?.completionPercentage) return 0;
    return localProfile.intakeStatus.completionPercentage;
  };

  const getCompletionColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-500';
    if (percentage >= 70) return 'text-blue-500';
    if (percentage >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const formatJoinDate = (date?: Date | string) => {
    if (!date) return 'Unknown';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getInteractionCount = () => {
    return localProfile?.interactionHistory?.totalInteractions || 0;
  };

  const getRecentActivity = () => {
    if (!localProfile?.interactionHistory?.lastInteraction) {
      return 'No recent activity';
    }
    
    const lastActivity = new Date(localProfile.interactionHistory.lastInteraction);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Active now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return lastActivity.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className={`card ${className}`}>
        <div className="card-content space-y-4">
          <div className="skeleton-avatar mx-auto"></div>
          <div className="space-y-2">
            <div className="skeleton-text h-4 w-3/4 mx-auto"></div>
            <div className="skeleton-text h-3 w-1/2 mx-auto"></div>
          </div>
          <div className="space-y-2">
            <div className="skeleton-text h-3"></div>
            <div className="skeleton-text h-3 w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!localProfile) {
    return (
      <div className={`card ${className}`}>
        <div className="card-content text-center py-8">
          <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold mb-2">No Profile Found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Complete the intake form to create your profile.
          </p>
          <button 
            onClick={onUpdateProfile}
            className="btn btn-primary btn-sm"
          >
            Create Profile
          </button>
        </div>
      </div>
    );
  }

  const completionPercentage = getCompletionPercentage();

  return (
    <div className={`card ${className}`}>
      <div className="card-header">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">
                {localProfile.personalInfo?.name || 'Anonymous User'}
              </h3>
              <p className="text-sm text-muted-foreground">
                Member since {formatJoinDate(localProfile.createdAt)}
              </p>
            </div>
          </div>
          <button
            onClick={handleEdit}
            className="btn btn-ghost btn-sm"
            title="Edit Profile"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="card-content space-y-6">
        {/* Profile Completion */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Profile Completion</span>
            <span className={`text-sm font-semibold ${getCompletionColor(completionPercentage)}`}>
              {completionPercentage}%
            </span>
          </div>
          <div className="progress">
            <div 
              className="progress-indicator"
              style={{ transform: `translateX(-${100 - completionPercentage}%)` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {completionPercentage < 70 
              ? 'Complete your profile for better recommendations'
              : 'Profile is well-developed!'
            }
          </p>
        </div>

        {/* Key Information */}
        <div className="space-y-4">
          {localProfile.personalInfo?.location && (
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <div>
                <span className="text-muted-foreground">Location: </span>
                <span>{localProfile.personalInfo.location}</span>
              </div>
            </div>
          )}

          {localProfile.goals?.primary && (
            <div className="flex items-start gap-3 text-sm">
              <Target className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <span className="text-muted-foreground">Primary Goal: </span>
                <span>{localProfile.goals.primary}</span>
              </div>
            </div>
          )}

          {localProfile.context?.industry && (
            <div className="flex items-center gap-3 text-sm">
              <Briefcase className="w-4 h-4 text-muted-foreground" />
              <div>
                <span className="text-muted-foreground">Industry: </span>
                <span>{localProfile.context.industry}</span>
              </div>
            </div>
          )}

          {localProfile.preferences?.communicationStyle && (
            <div className="flex items-center gap-3 text-sm">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <div>
                <span className="text-muted-foreground">Communication: </span>
                <span className="capitalize">{localProfile.preferences.communicationStyle}</span>
              </div>
            </div>
          )}
        </div>

        {/* Activity Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-2xl font-bold text-primary">
                {getInteractionCount()}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Interactions</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Award className="w-4 h-4 text-green-500" />
              <span className="text-2xl font-bold text-green-500">
                {Math.floor(completionPercentage / 10)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Milestones</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Last Active:</span>
            <span>{getRecentActivity()}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          <button 
            onClick={onUpdateProfile}
            className="btn btn-outline btn-sm flex-1"
          >
            Update Profile
          </button>
          <button 
            onClick={() => {
              // This could open a detailed view or export functionality
            }}
            className="btn btn-ghost btn-sm"
            title="View Details"
          >
            View Full Profile
          </button>
        </div>
      </div>
    </div>
  );
}