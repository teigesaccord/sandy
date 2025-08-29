'use client';

import { useState, useEffect } from 'react';
import { Star, Clock, TrendingUp, ExternalLink, CheckCircle, X, RefreshCw, Filter } from 'lucide-react';
import type { Recommendation } from '../types';

interface RecommendationsListProps {
  userId: string;
  className?: string;
}

export function RecommendationsList({ userId, className = '' }: RecommendationsListProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [category, setCategory] = useState<'all' | 'general' | 'wellness' | 'productivity' | 'learning'>('all');

  useEffect(() => {
    loadRecommendations();
  }, [userId]);

  const loadRecommendations = async (area?: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const url = `/api/users/${userId}/recommendations${area ? `?area=${area}` : ''}`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.recommendations || []);
      } else {
        throw new Error('Failed to load recommendations');
      }
    } catch (error) {
      console.error('Failed to load recommendations:', error);
      setError('Failed to load recommendations. Please try again.');
      // Show some fallback recommendations
      setRecommendations(getFallbackRecommendations());
    } finally {
      setIsLoading(false);
    }
  };

  const getFallbackRecommendations = (): Recommendation[] => {
    return [
      {
        id: 'fallback_1',
        title: 'Take Regular Breaks',
        description: 'Schedule short 5-10 minute breaks throughout your day to rest and recharge. This can help improve focus and reduce stress.',
        category: 'wellness',
        priority: 'high',
        actionable: true,
        difficulty: 'beginner',
        estimatedTimeToComplete: '5-10 minutes',
        resources: [
          {
            type: 'article',
            title: 'The Science of Taking Breaks',
            url: '#'
          }
        ]
      },
      {
        id: 'fallback_2',
        title: 'Practice Deep Breathing',
        description: 'Try a simple breathing exercise: inhale for 4 counts, hold for 4, exhale for 4. This can help reduce anxiety and improve focus.',
        category: 'wellness',
        priority: 'medium',
        actionable: true,
        difficulty: 'beginner',
        estimatedTimeToComplete: '2-5 minutes'
      },
      {
        id: 'fallback_3',
        title: 'Set Daily Goals',
        description: 'Start each day by writing down 3 specific, achievable goals. This helps provide direction and a sense of accomplishment.',
        category: 'productivity',
        priority: 'medium',
        actionable: true,
        difficulty: 'beginner',
        estimatedTimeToComplete: '5-10 minutes'
      }
    ];
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return '●';
      case 'intermediate':
        return '●●';
      case 'advanced':
        return '●●●';
      default:
        return '●';
    }
  };

  const filteredRecommendations = recommendations.filter(rec => {
    const matchesPriority = filter === 'all' || rec.priority === filter;
    const matchesCategory = category === 'all' || rec.category === category;
    return matchesPriority && matchesCategory;
  });

  const handleMarkComplete = async (recommendationId: string) => {
    try {
      // In a real implementation, this would update the recommendation status
      console.log('Marking recommendation as complete:', recommendationId);
      
      // Update local state
      setRecommendations(prev => 
        prev.map(rec => 
          rec.id === recommendationId 
            ? { ...rec, completed: true }
            : rec
        )
      );
    } catch (error) {
      console.error('Failed to mark recommendation as complete:', error);
    }
  };

  const handleDismiss = (recommendationId: string) => {
    setRecommendations(prev => prev.filter(rec => rec.id !== recommendationId));
  };

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[1, 2, 3].map(i => (
          <div key={i} className="card">
            <div className="card-content space-y-3">
              <div className="skeleton-text h-6 w-3/4"></div>
              <div className="skeleton-text h-4"></div>
              <div className="skeleton-text h-4 w-5/6"></div>
              <div className="flex gap-2">
                <div className="skeleton-button"></div>
                <div className="skeleton-button"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Personal Recommendations</h3>
          <p className="text-sm text-muted-foreground">
            {filteredRecommendations.length} recommendations based on your profile
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => loadRecommendations()}
            className="btn btn-outline btn-sm"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filter:</span>
        </div>
        
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="text-sm border-0 bg-transparent focus:ring-0"
        >
          <option value="all">All Priorities</option>
          <option value="high">High Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="low">Low Priority</option>
        </select>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as any)}
          className="text-sm border-0 bg-transparent focus:ring-0"
        >
          <option value="all">All Categories</option>
          <option value="general">General</option>
          <option value="wellness">Wellness</option>
          <option value="productivity">Productivity</option>
          <option value="learning">Learning</option>
        </select>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive mb-2">{error}</p>
          <button
            onClick={() => loadRecommendations()}
            className="btn btn-outline btn-sm"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Recommendations List */}
      {filteredRecommendations.length === 0 && !error ? (
        <div className="text-center py-12">
          <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Recommendations Found</h3>
          <p className="text-muted-foreground mb-4">
            {filter !== 'all' || category !== 'all'
              ? 'Try adjusting your filters or generate new recommendations.'
              : 'Complete your profile to get personalized recommendations.'
            }
          </p>
          <button
            onClick={() => loadRecommendations()}
            className="btn btn-primary"
          >
            Generate Recommendations
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecommendations.map((recommendation) => (
            <div key={recommendation.id} className="recommendation-card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-lg">{recommendation.title}</h4>
                    <span className={`badge text-xs px-2 py-1 rounded-full border ${getPriorityColor(recommendation.priority)}`}>
                      {recommendation.priority} priority
                    </span>
                  </div>
                  
                  <p className="text-muted-foreground mb-3 leading-relaxed">
                    {recommendation.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                    {recommendation.estimatedTimeToComplete && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{recommendation.estimatedTimeToComplete}</span>
                      </div>
                    )}
                    
                    {recommendation.difficulty && (
                      <div className="flex items-center gap-1">
                        <span className="text-primary">
                          {getDifficultyIcon(recommendation.difficulty)}
                        </span>
                        <span className="capitalize">{recommendation.difficulty}</span>
                      </div>
                    )}

                    <span className="badge badge-outline text-xs">
                      {recommendation.category}
                    </span>
                  </div>

                  {/* Resources */}
                  {recommendation.resources && recommendation.resources.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-2">Helpful Resources:</p>
                      <div className="space-y-1">
                        {recommendation.resources.slice(0, 2).map((resource, index) => (
                          <a
                            key={index}
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {resource.title}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleDismiss(recommendation.id)}
                  className="btn btn-ghost p-1 text-muted-foreground hover:text-destructive"
                  title="Dismiss recommendation"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleMarkComplete(recommendation.id)}
                  className="btn btn-primary btn-sm"
                  disabled={recommendation.completed}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {recommendation.completed ? 'Completed' : 'Mark Complete'}
                </button>
                
                <button
                  onClick={() => {
                    // This could open a detailed view or start a chat about this recommendation
                    console.log('Learn more about:', recommendation.id);
                  }}
                  className="btn btn-outline btn-sm"
                >
                  Learn More
                </button>
              </div>

              {recommendation.completed && (
                <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                  ✓ Great job! You've completed this recommendation.
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {filteredRecommendations.length > 0 && (
        <div className="text-center pt-6">
          <button
            onClick={() => loadRecommendations('general')}
            className="btn btn-outline"
            disabled={isLoading}
          >
            Load More Recommendations
          </button>
        </div>
      )}
    </div>
  );
}