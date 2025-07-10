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

    const currentStepIndex = steps.findIndex(step => step.id === currentStep);\n\n    return (\n      <div className=\"flex justify-between mb-8\">\n        {steps.map((step, index) => {\n          const Icon = step.icon;\n          const isActive = step.id === currentStep;\n          const isCompleted = index < currentStepIndex;\n          \n          return (\n            <div key={step.id} className=\"flex flex-col items-center relative\">\n              {index > 0 && (\n                <div \n                  className={`absolute left-0 top-6 w-full h-0.5 -translate-x-1/2 ${\n                    isCompleted ? 'bg-primary' : 'bg-muted'\n                  }`}\n                  style={{ width: 'calc(100% - 3rem)' }}\n                />\n              )}\n              <div \n                className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors ${\n                  isActive \n                    ? 'border-primary bg-primary text-primary-foreground'\n                    : isCompleted\n                    ? 'border-primary bg-primary text-primary-foreground'\n                    : 'border-muted bg-background'\n                }`}\n              >\n                <Icon className=\"w-5 h-5\" />\n              </div>\n              <span \n                className={`mt-2 text-sm font-medium ${\n                  isActive ? 'text-primary' : 'text-muted-foreground'\n                }`}\n              >\n                {step.label}\n              </span>\n            </div>\n          );\n        })}\n      </div>\n    );\n  };\n\n  /**\n   * Render current step content\n   */\n  const renderStepContent = () => {\n    switch (currentStep) {\n      case 'goals':\n        return (\n          <LearningGoalsForm\n            onSubmit={handleLearningGoalsSubmit}\n            initialGoals={learningGoals}\n          />\n        );\n\n      case 'duration':\n        return (\n          <DurationSelector\n            selectedDuration={selectedDuration}\n            onSelect={handleDurationSelect}\n            onBack={() => handleStepNavigation('goals')}\n          />\n        );\n\n      case 'teachers':\n        return (\n          <TeacherSelectionInterface\n            availableTeachers={availableTeachers}\n            preferences={teacherPreferences}\n            onSelection={handleTeacherSelection}\n            onBack={() => handleStepNavigation('duration')}\n            loading={loading}\n          />\n        );\n\n      case 'schedule':\n        return (\n          <div className=\"space-y-6\">\n            <h3 className=\"text-lg font-semibold\">Select Your Preferred Time</h3>\n            {/* Time slot selection component would go here */}\n            <div className=\"flex justify-between\">\n              <Button variant=\"outline\" onClick={() => handleStepNavigation('teachers')}>\n                Back\n              </Button>\n              <Button \n                onClick={() => handleTimeSlotSelection([/* mock slots */])}\n                disabled={selectedTimeSlots.length === 0}\n              >\n                Continue\n              </Button>\n            </div>\n          </div>\n        );\n\n      case 'confirmation':\n        return (\n          <div className=\"space-y-6\">\n            <h3 className=\"text-lg font-semibold\">Confirm Your Booking</h3>\n            \n            {/* Booking summary */}\n            <Card>\n              <CardHeader>\n                <CardTitle>Booking Summary</CardTitle>\n              </CardHeader>\n              <CardContent className=\"space-y-4\">\n                <div className=\"grid grid-cols-2 gap-4\">\n                  <div>\n                    <span className=\"text-sm text-muted-foreground\">Duration</span>\n                    <p className=\"font-medium\">{selectedDuration} minutes</p>\n                  </div>\n                  <div>\n                    <span className=\"text-sm text-muted-foreground\">Learning Goals</span>\n                    <p className=\"font-medium\">\n                      {learningGoals?.primaryObjectives.slice(0, 2).join(', ')}\n                    </p>\n                  </div>\n                </div>\n              </CardContent>\n            </Card>\n\n            {/* Error display */}\n            {error && (\n              <div className=\"flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded-md\">\n                <AlertCircle className=\"w-4 h-4\" />\n                <span>{error}</span>\n              </div>\n            )}\n\n            {/* Booking result */}\n            {bookingResult && (\n              <BookingRecommendations\n                result={bookingResult}\n                onBookingSelect={(recommendation) => {\n                  // Handle specific recommendation selection\n                }}\n              />\n            )}\n\n            <div className=\"flex justify-between\">\n              <Button variant=\"outline\" onClick={() => handleStepNavigation('schedule')}>\n                Back\n              </Button>\n              <div className=\"flex gap-2\">\n                {onBookingCancel && (\n                  <Button variant=\"outline\" onClick={onBookingCancel}>\n                    Cancel\n                  </Button>\n                )}\n                <Button \n                  onClick={handleBookingSubmit}\n                  disabled={loading}\n                >\n                  {loading ? 'Booking...' : 'Confirm Booking'}\n                </Button>\n              </div>\n            </div>\n          </div>\n        );\n\n      default:\n        return null;\n    }\n  };\n\n  return (\n    <div className=\"max-w-4xl mx-auto p-6\">\n      <div className=\"mb-8\">\n        <h1 className=\"text-3xl font-bold mb-2\">Book a 1-on-1 Session</h1>\n        <p className=\"text-muted-foreground\">\n          Get personalized attention from our expert teachers\n        </p>\n      </div>\n\n      {renderStepIndicator()}\n      \n      <Card>\n        <CardContent className=\"p-6\">\n          {renderStepContent()}\n        </CardContent>\n      </Card>\n    </div>\n  );\n}"