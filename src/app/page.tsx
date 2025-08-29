'use client';

import { useState, useEffect } from 'react';
import { ChatComponent } from '../components/ChatComponent';
import { IntakeForm } from '../components/IntakeForm';
import { RecommendationsList } from '../components/RecommendationsList';
import { UserProfileCard } from '../components/UserProfileCard';
import { StatusIndicator } from '../components/StatusIndicator';

export default function HomePage() {
  const [userId, setUserId] = useState<string>('');
  const [currentView, setCurrentView] = useState<'welcome' | 'intake' | 'chat' | 'recommendations'>('welcome');
  const [isConnected, setIsConnected] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Generate or retrieve user ID
  useEffect(() => {
    let storedUserId = localStorage.getItem('sandy_user_id');
    if (!storedUserId) {
      storedUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('sandy_user_id', storedUserId);
    }
    setUserId(storedUserId);
    setIsConnected(true);
  }, []);

  // Load user profile
  useEffect(() => {
    if (userId) {
      loadUserProfile();
    }
  }, [userId]);

  const loadUserProfile = async () => {
    try {
      const response = await fetch(`/api/users/${userId}/profile`);
      if (response.ok) {
        const data = await response.json();
        setUserProfile(data.profile);
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  const handleIntakeComplete = async (profile: any) => {
    setUserProfile(profile);
    setCurrentView('chat');
  };

  const handleStartChat = () => {
    if (userProfile?.intakeStatus?.completionPercentage < 50) {
      setCurrentView('intake');
    } else {
      setCurrentView('chat');
    }
  };

  const handleStartIntake = () => {
    setCurrentView('intake');
  };

  const handleViewRecommendations = () => {
    setCurrentView('recommendations');
  };

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-muted-foreground">Initializing Sandy...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      {currentView === 'welcome' && (
        <div className="relative overflow-hidden">
          <div className="container py-16 md:py-24">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                <span className="text-gradient">Meet Sandy</span>
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
                Your compassionate AI assistant, here to provide personalized support 
                and guidance for life's daily challenges.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <button 
                  onClick={handleStartChat}
                  className="btn btn-primary btn-lg"
                  disabled={isLoading}
                >
                  {userProfile?.intakeStatus?.completionPercentage > 50 ? 'Continue Chatting' : 'Get Started'}
                </button>
                <button 
                  onClick={handleStartIntake}
                  className="btn btn-outline btn-lg"
                >
                  Complete Profile
                </button>
                <button 
                  onClick={handleViewRecommendations}
                  className="btn btn-secondary btn-lg"
                  disabled={!userProfile}
                >
                  View Recommendations
                </button>
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
      )}

      {/* Intake Form View */}
      {currentView === 'intake' && (
        <div className="container py-8">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-4">Let's Get to Know You</h2>
              <p className="text-lg text-muted-foreground">
                Help Sandy provide better support by sharing a bit about yourself.
              </p>
            </div>
            <IntakeForm 
              userId={userId}
              onComplete={handleIntakeComplete}
              onBack={() => setCurrentView('welcome')}
            />
          </div>
        </div>
      )}

      {/* Chat View */}
      {currentView === 'chat' && (
        <div className="container py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Chat with Sandy</h2>
                <p className="text-muted-foreground">
                  Ask questions, seek guidance, or just have a conversation.
                </p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setCurrentView('welcome')}
                  className="btn btn-ghost btn-sm"
                >
                  Back to Home
                </button>
                <button 
                  onClick={() => setCurrentView('recommendations')}
                  className="btn btn-secondary btn-sm"
                  disabled={!userProfile}
                >
                  Recommendations
                </button>
              </div>
            </div>
            <ChatComponent userId={userId} />
          </div>
        </div>
      )}

      {/* Recommendations View */}
      {currentView === 'recommendations' && (
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
                <button 
                  onClick={() => setCurrentView('welcome')}
                  className="btn btn-ghost btn-sm"
                >
                  Back to Home
                </button>
                <button 
                  onClick={() => setCurrentView('chat')}
                  className="btn btn-primary btn-sm"
                >
                  Chat with Sandy
                </button>
              </div>
            </div>
            
            <div className="grid lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1">
                <UserProfileCard 
                  userId={userId} 
                  profile={userProfile}
                  onUpdateProfile={() => loadUserProfile()}
                />
              </div>
              <div className="lg:col-span-3">
                <RecommendationsList userId={userId} />
              </div>
            </div>
          </div>
        </div>
      )}

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