'use client';

import { logger } from '@/lib/services';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, 
  MapPin, 
  Users, 
  Star, 
  Calendar, 
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  BookOpen,
  Video,
  MapPinIcon,
  CalendarDays,
  Timer,
  GraduationCap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { autoPostponementService } from '@/lib/services/auto-postponement-service';
import { makeUpClassSuggestionService, type DetailedMakeUpSuggestion } from '@/lib/services/makeup-class-suggestion-service';
import { useToast } from '@/hooks/use-toast';

interface MakeUpClassSelectorProps {
  studentId: string;
  postponementId: string;
  onSelectionComplete?: (selectedSuggestion: DetailedMakeUpSuggestion) => void;
  onClose?: () => void;
}

export function MakeUpClassSelector({ 
  studentId, 
  postponementId, 
  onSelectionComplete,
  onClose 
}: MakeUpClassSelectorProps) {
  const [suggestions, setSuggestions] = useState<DetailedMakeUpSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<DetailedMakeUpSuggestion | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSuggestions();
  }, [studentId, postponementId]);

  const loadSuggestions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get postponement details first
      const postponements = await autoPostponementService.getStudentPostponements(studentId);
      const postponement = postponements.find(p => p.id === postponementId);

      if (!postponement) {
        throw new Error('Postponement not found');
      }

      // Generate suggestions
      const suggestionResults = await makeUpClassSuggestionService.generateSuggestions({
        student_id: studentId,
        postponement_id: postponementId,
        original_class_id: postponement.class_id,
        max_suggestions: 10,
      });

      setSuggestions(suggestionResults);
    } catch (error) {
      logger.error('Error loading suggestions:', error);
      setError(error instanceof Error ? error.message : 'Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionSelect = (suggestion: DetailedMakeUpSuggestion) => {
    setSelectedSuggestion(suggestion);
  };

  const handleConfirmSelection = async () => {
    if (!selectedSuggestion) return;

    try {
      setSubmitting(true);

      // Find the make-up class record
      const makeUpClasses = await autoPostponementService.getStudentMakeUpClasses(studentId);
      const makeUpClass = makeUpClasses.find(muc => muc.postponement_id === postponementId);

      if (!makeUpClass) {
        throw new Error('Make-up class record not found');
      }

      // Submit selection
      const success = await autoPostponementService.selectMakeUpClass({
        make_up_class_id: makeUpClass.id!,
        student_id: studentId,
        selected_suggestion_id: selectedSuggestion.id,
      });

      if (success) {
        toast({
          title: "Selection Confirmed",
          description: "Your make-up class has been selected and is pending admin approval.",
        });
        
        onSelectionComplete?.(selectedSuggestion);
      } else {
        throw new Error('Failed to confirm selection');
      }
    } catch (error) {
      logger.error('Error confirming selection:', error);
      toast({
        title: "Selection Failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getRecommendationColor = (strength: DetailedMakeUpSuggestion['recommendation_strength']) => {
    switch (strength) {
      case 'excellent':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'high':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRecommendationIcon = (strength: DetailedMakeUpSuggestion['recommendation_strength']) => {
    switch (strength) {
      case 'excellent':
        return <Star className="h-3 w-3 fill-current" />;
      case 'high':
        return <CheckCircle2 className="h-3 w-3 fill-current" />;
      case 'medium':
        return <Clock className="h-3 w-3" />;
      default:
        return <AlertCircle className="h-3 w-3" />;
    }
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading make-up class suggestions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No suitable make-up classes found at this time. Please contact support for assistance.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Select Your Make-up Class</h2>
          <p className="text-gray-600 mt-1">
            Choose from {suggestions.length} available options that match your preferences
          </p>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Suggestions List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Available Options</h3>
          <ScrollArea className="h-[600px] pr-4">
            {suggestions.map((suggestion) => (
              <Card
                key={suggestion.id}
                className={cn(
                  "cursor-pointer transition-all duration-200 mb-4",
                  selectedSuggestion?.id === suggestion.id
                    ? "ring-2 ring-blue-500 bg-blue-50"
                    : "hover:shadow-md hover:border-blue-200"
                )}
                onClick={() => handleSuggestionSelect(suggestion)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", getRecommendationColor(suggestion.recommendation_strength))}
                        >
                          {getRecommendationIcon(suggestion.recommendation_strength)}
                          {suggestion.recommendation_strength}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(suggestion.overall_compatibility_score * 100)}% match
                        </Badge>
                      </div>
                      <CardTitle className="text-lg">{suggestion.class_name}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={`/api/placeholder/24/24`} />
                          <AvatarFallback className="text-xs">
                            {suggestion.teacher_name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span>{suggestion.teacher_name}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {/* Quick Info */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-gray-500" />
                        <span>{formatDateTime(suggestion.start_time)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Timer className="h-4 w-4 text-gray-500" />
                        <span>{suggestion.duration_minutes} min</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span>{suggestion.current_enrollment}/{suggestion.capacity} students</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {suggestion.is_online ? (
                          <Video className="h-4 w-4 text-green-500" />
                        ) : (
                          <MapPinIcon className="h-4 w-4 text-gray-500" />
                        )}
                        <span>{suggestion.is_online ? 'Online' : suggestion.location || 'On-site'}</span>
                      </div>
                    </div>

                    {/* Compatibility Scores */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span>Content Match</span>
                        <span>{Math.round(suggestion.content_compatibility_score * 100)}%</span>
                      </div>
                      <Progress value={suggestion.content_compatibility_score * 100} className="h-1" />
                    </div>

                    {/* Benefits */}
                    {suggestion.benefits.length > 0 && (
                      <div className="space-y-1">
                        <h4 className="text-xs font-medium text-green-700">Benefits:</h4>
                        <ul className="text-xs text-green-600 space-y-1">
                          {suggestion.benefits.slice(0, 2).map((benefit, index) => (
                            <li key={index} className="flex items-start gap-1">
                              <CheckCircle2 className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <span>{benefit}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </ScrollArea>
        </div>

        {/* Selection Details */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            {selectedSuggestion ? 'Class Details' : 'Select a class to see details'}
          </h3>
          
          {selectedSuggestion ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{selectedSuggestion.class_name}</CardTitle>
                    <p className="text-gray-600 mt-1">{selectedSuggestion.course_type}</p>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn("text-sm", getRecommendationColor(selectedSuggestion.recommendation_strength))}
                  >
                    {getRecommendationIcon(selectedSuggestion.recommendation_strength)}
                    {selectedSuggestion.recommendation_strength}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="compatibility">Compatibility</TabsTrigger>
                    <TabsTrigger value="details">Details</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={`/api/placeholder/40/40`} />
                          <AvatarFallback>
                            {selectedSuggestion.teacher_name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{selectedSuggestion.teacher_name}</p>
                          <p className="text-sm text-gray-600">Course Instructor</p>
                        </div>
                      </div>

                      <Separator />

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">Schedule</span>
                          </div>
                          <p className="text-gray-600 ml-6">
                            {formatDateTime(selectedSuggestion.start_time)}
                          </p>
                          <p className="text-gray-600 ml-6">
                            {formatTime(selectedSuggestion.start_time)} - {formatTime(selectedSuggestion.end_time)}
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">Class Size</span>
                          </div>
                          <p className="text-gray-600 ml-6">
                            {selectedSuggestion.current_enrollment}/{selectedSuggestion.capacity} students
                          </p>
                          <p className="text-gray-600 ml-6">
                            {selectedSuggestion.available_spots} spots available
                          </p>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {selectedSuggestion.is_online ? (
                            <Video className="h-4 w-4 text-green-500" />
                          ) : (
                            <MapPin className="h-4 w-4 text-gray-500" />
                          )}
                          <span className="font-medium">Location</span>
                        </div>
                        <p className="text-gray-600 ml-6">
                          {selectedSuggestion.is_online ? 'Online Class' : selectedSuggestion.location || 'On-site'}
                        </p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="compatibility" className="space-y-4">
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-600">
                          {Math.round(selectedSuggestion.overall_compatibility_score * 100)}%
                        </div>
                        <p className="text-sm text-gray-600">Overall Compatibility</p>
                      </div>

                      <div className="space-y-3">
                        {[
                          { label: 'Content Match', value: selectedSuggestion.content_compatibility_score, icon: BookOpen },
                          { label: 'Schedule Preference', value: selectedSuggestion.schedule_preference_score, icon: Calendar },
                          { label: 'Teacher Compatibility', value: selectedSuggestion.teacher_compatibility_score, icon: GraduationCap },
                          { label: 'Class Size Preference', value: selectedSuggestion.class_size_preference_score, icon: Users },
                        ].map((item) => (
                          <div key={item.label} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <item.icon className="h-4 w-4 text-gray-500" />
                                <span>{item.label}</span>
                              </div>
                              <span className="font-medium">{Math.round(item.value * 100)}%</span>
                            </div>
                            <Progress value={item.value * 100} className="h-2" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="details" className="space-y-4">
                    <div className="space-y-4">
                      {selectedSuggestion.benefits.length > 0 && (
                        <div>
                          <h4 className="font-medium text-green-700 mb-2">Benefits</h4>
                          <ul className="space-y-1 text-sm text-green-600">
                            {selectedSuggestion.benefits.map((benefit, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>{benefit}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {selectedSuggestion.considerations.length > 0 && (
                        <div>
                          <h4 className="font-medium text-amber-700 mb-2">Considerations</h4>
                          <ul className="space-y-1 text-sm text-amber-600">
                            {selectedSuggestion.considerations.map((consideration, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span>{consideration}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-medium mb-2">Booking Information</h4>
                        <div className="space-y-2 text-sm text-gray-600">
                          <p>
                            <span className="font-medium">Booking Deadline:</span>{' '}
                            {selectedSuggestion.booking_deadline ? 
                              formatDateTime(selectedSuggestion.booking_deadline) : 
                              'ASAP'
                            }
                          </p>
                          <p>
                            <span className="font-medium">Cancellation Policy:</span>{' '}
                            {selectedSuggestion.cancellation_policy}
                          </p>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="mt-6 flex gap-3">
                  <Button 
                    onClick={handleConfirmSelection}
                    disabled={submitting}
                    className="flex-1"
                  >
                    {submitting ? 'Confirming...' : 'Confirm Selection'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedSuggestion(null)}
                  >
                    Back to List
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-gray-500">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a class from the list to view detailed information</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}