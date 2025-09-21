'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check, AlertCircle } from 'lucide-react';
import type { IntakeSection, IntakeQuestion, UserProfile } from '../types';
import PostgreSQLService from '../services/PostgreSQLService';

interface IntakeFormProps {
  userId: string;
  onComplete: (profile: UserProfile) => void;
  onBack?: () => void;
  className?: string;
}

interface FormData {
  [sectionId: string]: {
    [questionId: string]: any;
  };
}

export function IntakeForm({ userId, onComplete, onBack, className = '' }: IntakeFormProps) {
  const [sections, setSections] = useState<IntakeSection[]>([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [formData, setFormData] = useState<FormData>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Load sections and user profile on mount
  useEffect(() => {
    loadSections();
    loadUserProfile();
  }, [userId]);

  const loadSections = async () => {
    try {
      const response = await fetch('/api/intake/sections');
      if (response.ok) {
        const data = await response.json();
        setSections(data.sections);
      }
    } catch (error) {
      console.error('Failed to load intake sections:', error);
    }
  };

  const loadUserProfile = async () => {
    try {
      const response = await fetch(`/api/users/${userId}/profile`, {
        method: 'GET',
        credentials: 'include' // Include HTTP-only cookies for authentication
      });

      if (response.ok) {
        const data = await response.json();
        setUserProfile(data.profile);
        // Pre-populate form with existing data
        populateFormFromProfile(data.profile);
      } else if (response.status === 401) {
        // Authentication expired
        console.log('Authentication expired in IntakeForm');
      } else {
        console.error('Failed to load user profile:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  const populateFormFromProfile = (profile: UserProfile) => {
    const newFormData: FormData = {};
    
    sections.forEach(section => {
      newFormData[section.id] = {};
      
      section.questions.forEach(question => {
        // Map question IDs to profile data
        const value = getNestedValue(profile, question.id);
        if (value !== undefined) {
          newFormData[section.id][question.id] = value;
        }
      });
    });
    
    setFormData(newFormData);
  };

  const getNestedValue = (obj: any, path: string): any => {
    // Convert question IDs to profile paths
    const pathMap: Record<string, string> = {
      'name': 'personalInfo.name',
      'email': 'personalInfo.email',
      'age': 'personalInfo.age',
      'location': 'personalInfo.location',
      'primary_goal': 'goals.primary',
      'secondary_goals': 'goals.secondary',
      'timeline': 'goals.timeline',
      'industry': 'context.industry',
      'role': 'context.role',
      'experience': 'context.experience',
      'challenges': 'context.challenges',
      'communication_style': 'preferences.communicationStyle',
      'response_length': 'preferences.responseLength',
      'topics_of_interest': 'preferences.topics',
      'languages': 'preferences.languages'
    };

    const actualPath = pathMap[path] || path;
    return actualPath.split('.').reduce((current, key) => current?.[key], obj);
  };

  const currentSection = sections[currentSectionIndex];
  const isLastSection = currentSectionIndex === sections.length - 1;
  const isFirstSection = currentSectionIndex === 0;

  const handleInputChange = (questionId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [currentSection.id]: {
        ...prev[currentSection.id],
        [questionId]: value
      }
    }));

    // Clear error when user starts typing
    if (errors[questionId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[questionId];
        return newErrors;
      });
    }
  };

  const validateCurrentSection = (): boolean => {
    if (!currentSection) return true;

    const newErrors: Record<string, string> = {};
    const sectionData = formData[currentSection.id] || {};

    currentSection.questions.forEach(question => {
      if (question.required) {
        const value = sectionData[question.id];
        if (value === undefined || value === null || value === '' || 
            (Array.isArray(value) && value.length === 0)) {
          newErrors[question.id] = `${question.label} is required`;
        }
      }

      // Type-specific validation
      const value = sectionData[question.id];
      if (value && question.validation) {
        const validation = question.validation;

        if (question.type === 'text' || question.type === 'textarea') {
          if (validation.min && value.length < validation.min) {
            newErrors[question.id] = `Minimum ${validation.min} characters required`;
          }
          if (validation.max && value.length > validation.max) {
            newErrors[question.id] = `Maximum ${validation.max} characters allowed`;
          }
          if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
            newErrors[question.id] = validation.message || 'Invalid format';
          }
        }

        if (question.type === 'number') {
          const numValue = Number(value);
          if (isNaN(numValue)) {
            newErrors[question.id] = 'Must be a valid number';
          } else {
            if (validation.min !== undefined && numValue < validation.min) {
              newErrors[question.id] = `Minimum value is ${validation.min}`;
            }
            if (validation.max !== undefined && numValue > validation.max) {
              newErrors[question.id] = `Maximum value is ${validation.max}`;
            }
          }
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validateCurrentSection()) {
      return;
    }

    if (isLastSection) {
      await submitForm();
    } else {
      setCurrentSectionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (isFirstSection && onBack) {
      onBack();
    } else {
      setCurrentSectionIndex(prev => prev - 1);
    }
  };

  const submitForm = async () => {
    setIsSubmitting(true);
    
    try {
      // Convert form data to profile format
      const profileUpdates = convertFormDataToProfile(formData);
      
      // Submit to API
      const response = await fetch(`/api/users/${userId}/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include HTTP-only cookies for authentication
        body: JSON.stringify(profileUpdates)
      });

      if (response.ok) {
        const data = await response.json();
        setUserProfile(data.profile);
        onComplete(data.profile);
      } else if (response.status === 401) {
        // Authentication expired
        console.log('Authentication expired during profile save');
        setErrors({ submit: 'Authentication expired. Please login again.' });
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        setErrors({ submit: errorData.error || 'Failed to save profile. Please try again.' });
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors({ submit: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const convertFormDataToProfile = (data: FormData): Partial<UserProfile> => {
    const profile: any = {};

    // Map form data back to profile structure
    Object.entries(data).forEach(([sectionId, sectionData]) => {
      Object.entries(sectionData).forEach(([questionId, value]) => {
        switch (questionId) {
          case 'physical_needs':
            profile.physical_needs = Array.isArray(value) ? value : [value];
            break;
          case 'energy_level':
            profile.energy_level = value;
            break;
          case 'main_device':
            profile.main_device = value;
            break;
          case 'accessibility_adaptations':
            profile.accessibility_adaptations = Array.isArray(value) ? value : [value];
            break;
          case 'daily_task_challenges':
            profile.daily_task_challenges = Array.isArray(value) ? value : [value];
            break;
          case 'send_photos':
            profile.send_photos = value;
            break;
          case 'condition_name':
            profile.condition_name = value;
            break;
          case 'help_needed':
            profile.help_needed = value;
            break;
          case 'share_experiences':
            profile.share_experiences = value;
            break;
          case 'other_needs_soon':
            profile.other_needs_soon = value;
            break;
          case 'location':
            profile.location = value;
            break;
        }
      });
    });

    return profile;
  };

  const renderQuestion = (question: IntakeQuestion) => {
    const value = formData[currentSection.id]?.[question.id] || '';
    const error = errors[question.id];

    const baseProps = {
      id: question.id,
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => 
        handleInputChange(question.id, e.target.value),
      className: `input ${error ? 'border-destructive' : ''}`,
      placeholder: question.placeholder
    };

    switch (question.type) {
      case 'text':
        return (
          <input
            {...baseProps}
            type="text"
            maxLength={question.validation?.max}
          />
        );

      case 'textarea':
        return (
          <textarea
            {...baseProps}
            className={`textarea ${error ? 'border-destructive' : ''}`}
            rows={4}
            maxLength={question.validation?.max}
          />
        );

      case 'number':
        return (
          <input
            {...baseProps}
            type="number"
            min={question.validation?.min}
            max={question.validation?.max}
            onChange={(e) => handleInputChange(question.id, e.target.value ? Number(e.target.value) : '')}
          />
        );

      case 'select':
        return (
          <select
            {...baseProps}
            className={`input ${error ? 'border-destructive' : ''}`}
          >
            <option value="">Select an option</option>
            {question.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        return (
          <div className="space-y-2">
            {question.options?.map((option) => (
              <label key={option} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={Array.isArray(value) && value.includes(option)}
                  onChange={(e) => {
                    const currentArray = Array.isArray(value) ? value : [];
                    if (e.target.checked) {
                      handleInputChange(question.id, [...currentArray, option]);
                    } else {
                      handleInputChange(question.id, currentArray.filter(v => v !== option));
                    }
                  }}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">{option}</span>
              </label>
            ))}
          </div>
        );

      default:
        return (
          <input
            {...baseProps}
            type="text"
          />
        );
    }
  };

  const progressPercentage = sections.length > 0 ? ((currentSectionIndex + 1) / sections.length) * 100 : 0;

  if (sections.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="spinner mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading intake form...</p>
      </div>
    );
  }

  return (
    <div className={`max-w-2xl mx-auto ${className}`}>
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Progress</span>
          <span className="text-sm text-muted-foreground">
            Step {currentSectionIndex + 1} of {sections.length}
          </span>
        </div>
        <div className="progress">
          <div 
            className="progress-indicator"
            style={{ transform: `translateX(-${100 - progressPercentage}%)` }}
          />
        </div>
      </div>

      {/* Current Section */}
      {currentSection && (
        <div className="form-section">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">{currentSection.title}</h2>
            {currentSection.description && (
              <p className="text-muted-foreground">{currentSection.description}</p>
            )}
          </div>

          <div className="space-y-6">
            {currentSection.questions.map((question) => (
              <div key={question.id} className="form-field">
                <label htmlFor={question.id} className="form-label">
                  {question.label}
                  {question.required && <span className="text-destructive ml-1">*</span>}
                </label>
                
                {renderQuestion(question)}
                
                {errors[question.id] && (
                  <div className="flex items-center gap-2 text-sm text-destructive mt-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors[question.id]}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">Submission Error</span>
              </div>
              <p className="text-sm text-destructive mt-1">{errors.submit}</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={handlePrevious}
              className="btn btn-outline"
              disabled={isSubmitting}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              {isFirstSection ? 'Back to Home' : 'Previous'}
            </button>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {sections.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === currentSectionIndex
                      ? 'bg-primary'
                      : index < currentSectionIndex
                      ? 'bg-primary/60'
                      : 'bg-muted'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="spinner mr-2" />
                  Saving...
                </>
              ) : isLastSection ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Complete Profile
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}