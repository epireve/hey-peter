/**
 * HeyPeter Academy - 1v1 Booking Interface
 * 
 * Main component for students to book individual lessons with teachers.
 * Features:
 * - Teacher selection and browsing
 * - Duration selection (30/60 minutes)
 * - Learning goals specification
 * - Auto-matching recommendations
 * - Conflict detection and alternatives
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Star, Clock, Calendar, Users, BookOpen, CheckCircle, AlertCircle } from 'lucide-react';
import { TeacherSelectionInterface } from './TeacherSelectionInterface';
import { DurationSelector } from './DurationSelector';
import { LearningGoalsForm } from './LearningGoalsForm';
import { BookingRecommendations } from './BookingRecommendations';
import { oneOnOneBookingService } from '@/lib/services/one-on-one-booking-service';
import type { 
  OneOnOneBookingRequest,
  OneOnOneBookingResult,
  TeacherProfileForBooking,
  OneOnOneAutoMatchingCriteria,
  OneOnOneLearningGoals,
  TeacherSelectionPreferences,
  TimeSlot,
} from '@/types/scheduling';

interface OneOnOneBookingProps {
  studentId: string;
  courseId: string;
  onBookingComplete?: (result: OneOnOneBookingResult) => void;
  onBookingCancel?: () => void;
}

type BookingStep = 'goals' | 'duration' | 'teachers' | 'schedule' | 'confirmation';

export function OneOnOneBooking({ 
  studentId, 
  courseId, 
  onBookingComplete, 
  onBookingCancel 
}: OneOnOneBookingProps) {
  const [currentStep, setCurrentStep] = useState<BookingStep>('goals');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Booking data state
  const [learningGoals, setLearningGoals] = useState<OneOnOneLearningGoals | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<30 | 60>(60);
  const [teacherPreferences, setTeacherPreferences] = useState<TeacherSelectionPreferences>({
    preferredTeacherIds: [],
    genderPreference: 'no_preference',
    experienceLevel: 'intermediate',
    languageSpecializations: [],
    personalityTraits: [],
    teachingStyles: [],
  });
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<TimeSlot[]>([]);
  const [availableTeachers, setAvailableTeachers] = useState<TeacherProfileForBooking[]>([]);
  const [bookingResult, setBookingResult] = useState<OneOnOneBookingResult | null>(null);

  /**
   * Load available teachers when component mounts
   */
  useEffect(() => {
    loadAvailableTeachers();
  }, []);

  const loadAvailableTeachers = async () => {
    try {
      setLoading(true);
      const mockRequest: OneOnOneBookingRequest = {
        id: 'temp-request',
        studentId,
        courseId,
        duration: selectedDuration,
        matchingCriteria: {
          studentId,
          preferredTimeSlots: [],
          durationPreference: selectedDuration,
          teacherPreferences,
          learningGoals: learningGoals || {
            primaryObjectives: [],
            skillFocus: [],
            improvementAreas: [],
          },
          urgency: 'medium',
          flexibility: {
            allowAlternativeSlots: true,
            allowAlternativeDuration: true,
            allowAlternativeTeachers: true,
          },
          maxSearchRadius: {
            timeVariationMinutes: 120,
            dateVariationDays: 7,
          },
        },
        requestType: 'scheduled',
        priority: 'medium',
        requestedAt: new Date().toISOString(),
        status: 'pending',
      };
      
      const teachers = await oneOnOneBookingService.getAvailableTeachers(mockRequest);
      setAvailableTeachers(teachers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load teachers');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle step navigation
   */
  const handleStepNavigation = (step: BookingStep) => {
    setCurrentStep(step);
    setError(null);
  };

  /**
   * Handle learning goals submission
   */
  const handleLearningGoalsSubmit = (goals: OneOnOneLearningGoals) => {
    setLearningGoals(goals);
    handleStepNavigation('duration');
  };

  /**
   * Handle duration selection
   */
  const handleDurationSelect = (duration: 30 | 60) => {
    setSelectedDuration(duration);
    handleStepNavigation('teachers');
  };

  /**
   * Handle teacher selection
   */
  const handleTeacherSelection = (preferences: TeacherSelectionPreferences) => {
    setTeacherPreferences(preferences);
    handleStepNavigation('schedule');
  };

  /**
   * Handle time slot selection
   */
  const handleTimeSlotSelection = (slots: TimeSlot[]) => {
    setSelectedTimeSlots(slots);
    handleStepNavigation('confirmation');
  };

  /**
   * Submit booking request
   */
  const handleBookingSubmit = async () => {
    if (!learningGoals || selectedTimeSlots.length === 0) {
      setError('Please complete all required fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const bookingRequest: OneOnOneBookingRequest = {
        id: `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        studentId,
        courseId,
        duration: selectedDuration,
        matchingCriteria: {
          studentId,
          preferredTimeSlots: selectedTimeSlots,
          durationPreference: selectedDuration,
          teacherPreferences,
          learningGoals,
          urgency: 'medium',
          flexibility: {
            allowAlternativeSlots: true,
            allowAlternativeDuration: false,
            allowAlternativeTeachers: true,
          },
          maxSearchRadius: {
            timeVariationMinutes: 60,
            dateVariationDays: 3,
          },
        },
        requestType: 'scheduled',
        priority: 'medium',
        requestedAt: new Date().toISOString(),
        status: 'pending',
      };

      const result = await oneOnOneBookingService.book1v1Session(bookingRequest);
      setBookingResult(result);

      if (result.success && onBookingComplete) {
        onBookingComplete(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Render step indicator
   */
  const renderStepIndicator = () => {
    const steps = [
      { id: 'goals', label: 'Learning Goals', icon: BookOpen },
      { id: 'duration', label: 'Duration', icon: Clock },
      { id: 'teachers', label: 'Teacher', icon: Users },
      { id: 'schedule', label: 'Schedule', icon: Calendar },
      { id: 'confirmation', label: 'Confirm', icon: CheckCircle },
    ];

    const currentStepIndex = steps.findIndex(step => step.id === currentStep);

    return (
      <div className="flex justify-between mb-8">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.id === currentStep;
          const isCompleted = index < currentStepIndex;
          
          return (
            <div key={step.id} className="flex flex-col items-center relative">
              {index > 0 && (
                <div 
                  className={`absolute left-0 top-6 w-full h-0.5 -translate-x-1/2 ${
                    isCompleted ? 'bg-primary' : 'bg-muted'
                  }`}
                  style={{ width: 'calc(100% - 3rem)' }}
                />
              )}
              <div 
                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors ${
                  isActive 
                    ? 'border-primary bg-primary text-primary-foreground'
                    : isCompleted
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted bg-background'
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span 
                className={`mt-2 text-sm font-medium ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  /**
   * Render current step content
   */
  const renderStepContent = () => {
    switch (currentStep) {
      case 'goals':
        return (
          <LearningGoalsForm
            onSubmit={handleLearningGoalsSubmit}
            initialGoals={learningGoals}
          />
        );

      case 'duration':
        return (
          <DurationSelector
            selectedDuration={selectedDuration}
            onSelect={handleDurationSelect}
            onBack={() => handleStepNavigation('goals')}
          />
        );

      case 'teachers':
        return (
          <TeacherSelectionInterface
            availableTeachers={availableTeachers}
            preferences={teacherPreferences}
            onSelection={handleTeacherSelection}
            onBack={() => handleStepNavigation('duration')}
            loading={loading}
          />
        );

      case 'schedule':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Select Your Preferred Time</h3>
            {/* Time slot selection component would go here */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => handleStepNavigation('teachers')}>
                Back
              </Button>
              <Button 
                onClick={() => handleTimeSlotSelection([/* mock slots */])}
                disabled={selectedTimeSlots.length === 0}
              >
                Continue
              </Button>
            </div>
          </div>
        );

      case 'confirmation':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Confirm Your Booking</h3>
            
            {/* Booking summary */}
            <Card>
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-muted-foreground">Duration</span>
                    <p className="font-medium">{selectedDuration} minutes</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Learning Goals</span>
                    <p className="font-medium">
                      {learningGoals?.primaryObjectives.slice(0, 2).join(', ')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Error display */}
            {error && (
              <div className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded-md">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            {/* Booking result */}
            {bookingResult && (
              <BookingRecommendations
                result={bookingResult}
                onBookingSelect={(recommendation) => {
                  // Handle specific recommendation selection
                }}
              />
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => handleStepNavigation('schedule')}>
                Back
              </Button>
              <div className="flex gap-2">
                {onBookingCancel && (
                  <Button variant="outline" onClick={onBookingCancel}>
                    Cancel
                  </Button>
                )}
                <Button 
                  onClick={handleBookingSubmit}
                  disabled={loading}
                >
                  {loading ? 'Booking...' : 'Confirm Booking'}
                </Button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Book a 1-on-1 Session</h1>
        <p className="text-muted-foreground">
          Get personalized attention from our expert teachers
        </p>
      </div>

      {renderStepIndicator()}
      
      <Card>
        <CardContent className="p-6">
          {renderStepContent()}
        </CardContent>
      </Card>
    </div>
  );
}