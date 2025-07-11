'use client';

import { logger } from '@/lib/services';

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Star, Send, User, BookOpen, Target, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/components/ui/use-toast';
import { feedbackService } from '@/lib/services/feedback-service';
import { TeacherFeedback, AttendanceQuality } from '@/types/feedback';

// Validation schema
const teacherFeedbackSchema = z.object({
  participation_rating: z.number().min(1, 'Participation rating is required').max(5),
  comprehension_rating: z.number().min(1, 'Comprehension rating is required').max(5),
  pronunciation_rating: z.number().min(1).max(5).optional(),
  homework_completion_rating: z.number().min(1).max(5).optional(),
  progress_rating: z.number().min(1, 'Progress rating is required').max(5),
  strengths: z.string().min(10, 'Please provide at least 10 characters').max(1000),
  areas_for_improvement: z.string().max(1000).optional(),
  lesson_notes: z.string().max(1000).optional(),
  homework_assigned: z.string().max(500).optional(),
  next_lesson_goals: z.string().max(500).optional(),
  unit_completed: z.number().min(0).optional(),
  lesson_completed: z.number().min(0).optional(),
  lesson_objectives_met: z.boolean().default(true),
  attendance_quality: z.enum(['excellent', 'good', 'fair', 'poor']).optional(),
  recommended_study_hours: z.number().min(0).max(20).optional(),
  recommended_next_level: z.string().max(100).optional(),
  needs_additional_support: z.boolean().default(false)
});

type TeacherFeedbackFormData = z.infer<typeof teacherFeedbackSchema>;

interface TeacherFeedbackFormProps {
  teacherId: string;
  studentId: string;
  classId?: string;
  bookingId?: string;
  studentInfo?: {
    full_name: string;
    student_id: string;
    test_level?: string;
    current_unit?: number;
    current_lesson?: number;
  };
  onSubmitSuccess?: (feedback: TeacherFeedback) => void;
  onCancel?: () => void;
  existingFeedback?: TeacherFeedback;
  className?: string;
}

interface RatingInputProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  color?: 'default' | 'blue' | 'green' | 'orange';
}

const RatingInput: React.FC<RatingInputProps> = ({ 
  value, onChange, label, description, required, disabled, color = 'default' 
}) => {
  const [hoverValue, setHoverValue] = useState(0);

  const getColorClasses = (star: number, isActive: boolean) => {
    const baseClasses = 'w-5 h-5 transition-all duration-200';
    
    if (!isActive) return `${baseClasses} text-gray-300`;
    
    switch (color) {
      case 'blue':
        return `${baseClasses} fill-blue-400 text-blue-400`;
      case 'green':
        return `${baseClasses} fill-green-400 text-green-400`;
      case 'orange':
        return `${baseClasses} fill-orange-400 text-orange-400`;
      default:
        return `${baseClasses} fill-yellow-400 text-yellow-400`;
    }
  };

  const getRatingText = (rating: number): string => {
    switch (rating) {
      case 5: return 'Excellent';
      case 4: return 'Good';
      case 3: return 'Satisfactory';
      case 2: return 'Needs Improvement';
      case 1: return 'Poor';
      default: return '';
    }
  };

  return (
    <div className="space-y-2">
      <FormLabel className={required ? "after:content-['*'] after:text-destructive" : ""}>
        {label}
      </FormLabel>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            className={`p-1 rounded transition-colors ${
              disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 hover:bg-gray-100'
            }`}
            onMouseEnter={() => !disabled && setHoverValue(star)}
            onMouseLeave={() => setHoverValue(0)}
            onClick={() => !disabled && onChange(star)}
          >
            <Star
              className={getColorClasses(star, star <= (hoverValue || value))}
            />
          </button>
        ))}
        <span className="ml-3 text-sm font-medium">
          {value > 0 && (
            <Badge variant={value >= 4 ? 'default' : value >= 3 ? 'secondary' : 'destructive'}>
              {getRatingText(value)}
            </Badge>
          )}
        </span>
      </div>
    </div>
  );
};

export const TeacherFeedbackForm: React.FC<TeacherFeedbackFormProps> = ({
  teacherId,
  studentId,
  classId,
  bookingId,
  studentInfo,
  onSubmitSuccess,
  onCancel,
  existingFeedback,
  className
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const form = useForm<TeacherFeedbackFormData>({
    resolver: zodResolver(teacherFeedbackSchema),
    defaultValues: {
      participation_rating: existingFeedback?.participation_rating || 0,
      comprehension_rating: existingFeedback?.comprehension_rating || 0,
      pronunciation_rating: existingFeedback?.pronunciation_rating || 0,
      homework_completion_rating: existingFeedback?.homework_completion_rating || 0,
      progress_rating: existingFeedback?.progress_rating || 0,
      strengths: existingFeedback?.strengths || '',
      areas_for_improvement: existingFeedback?.areas_for_improvement || '',
      lesson_notes: existingFeedback?.lesson_notes || '',
      homework_assigned: existingFeedback?.homework_assigned || '',
      next_lesson_goals: existingFeedback?.next_lesson_goals || '',
      unit_completed: existingFeedback?.unit_completed || studentInfo?.current_unit || 0,
      lesson_completed: existingFeedback?.lesson_completed || studentInfo?.current_lesson || 0,
      lesson_objectives_met: existingFeedback?.lesson_objectives_met ?? true,
      attendance_quality: existingFeedback?.attendance_quality || 'good',
      recommended_study_hours: existingFeedback?.recommended_study_hours || 0,
      recommended_next_level: existingFeedback?.recommended_next_level || '',
      needs_additional_support: existingFeedback?.needs_additional_support || false
    }
  });

  const watchedRatings = {
    participation: form.watch('participation_rating'),
    comprehension: form.watch('comprehension_rating'),
    progress: form.watch('progress_rating')
  };

  const averageRating = Object.values(watchedRatings).filter(r => r > 0).reduce((sum, rating) => sum + rating, 0) / Object.values(watchedRatings).filter(r => r > 0).length || 0;

  const onSubmit = async (data: TeacherFeedbackFormData) => {
    setIsSubmitting(true);
    
    try {
      const feedbackData: TeacherFeedback = {
        ...data,
        teacher_id: teacherId,
        student_id: studentId,
        class_id: classId,
        booking_id: bookingId
      };

      let result: TeacherFeedback;

      if (existingFeedback?.id) {
        result = await feedbackService.updateTeacherFeedback(existingFeedback.id, feedbackData);
        toast({
          title: "Feedback Updated",
          description: "Student performance feedback has been updated successfully.",
        });
      } else {
        result = await feedbackService.createTeacherFeedback(feedbackData);
        toast({
          title: "Feedback Submitted",
          description: "Student performance feedback has been recorded successfully.",
        });
      }

      setSubmitSuccess(true);
      onSubmitSuccess?.(result);

      // Reset form if creating new feedback
      if (!existingFeedback) {
        form.reset();
      }

    } catch (error) {
      logger.error('Error submitting teacher feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    onCancel?.();
  };

  const getPerformanceSummary = (): string => {
    if (averageRating >= 4) return "Excellent performance! Student is excelling in this course.";
    if (averageRating >= 3.5) return "Good performance with room for minor improvements.";
    if (averageRating >= 3) return "Satisfactory performance meeting basic expectations.";
    if (averageRating >= 2) return "Below expectations - additional support recommended.";
    return "Significant improvements needed - immediate intervention required.";
  };

  if (submitSuccess && !existingFeedback) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Feedback Submitted!</h3>
          <p className="text-muted-foreground mb-4">
            Student performance feedback has been recorded successfully. This will help track the student's progress and identify areas for improvement.
          </p>
          <Button onClick={() => setSubmitSuccess(false)}>
            Submit Another Feedback
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Student Performance Assessment
        </CardTitle>
        {studentInfo && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Recording feedback for: <strong>{studentInfo.full_name}</strong>
              {studentInfo.student_id && ` (${studentInfo.student_id})`}
            </p>
            {studentInfo.test_level && (
              <Badge variant="outline">{studentInfo.test_level}</Badge>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Performance Ratings */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Star className="w-5 h-5" />
                Performance Ratings
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="participation_rating"
                  render={({ field }) => (
                    <FormItem>
                      <RatingInput
                        value={field.value}
                        onChange={field.onChange}
                        label="Class Participation"
                        description="How actively did the student engage in class discussions and activities?"
                        required
                        disabled={isSubmitting}
                        color="blue"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="comprehension_rating"
                  render={({ field }) => (
                    <FormItem>
                      <RatingInput
                        value={field.value}
                        onChange={field.onChange}
                        label="Content Comprehension"
                        description="How well did the student understand the lesson material?"
                        required
                        disabled={isSubmitting}
                        color="green"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pronunciation_rating"
                  render={({ field }) => (
                    <FormItem>
                      <RatingInput
                        value={field.value || 0}
                        onChange={field.onChange}
                        label="Pronunciation & Speaking"
                        description="Clarity and accuracy of pronunciation and speaking skills"
                        disabled={isSubmitting}
                        color="orange"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="homework_completion_rating"
                  render={({ field }) => (
                    <FormItem>
                      <RatingInput
                        value={field.value || 0}
                        onChange={field.onChange}
                        label="Homework Completion"
                        description="Quality and timeliness of homework submissions"
                        disabled={isSubmitting}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="progress_rating"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <RatingInput
                        value={field.value}
                        onChange={field.onChange}
                        label="Overall Progress"
                        description="Student's overall improvement and development since the last assessment"
                        required
                        disabled={isSubmitting}
                        color="green"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Performance Summary */}
              {averageRating > 0 && (
                <Alert>
                  <Target className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Performance Summary:</strong> {getPerformanceSummary()}
                    <br />
                    <span className="text-sm">Average Rating: {averageRating.toFixed(1)}/5</span>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <Separator />

            {/* Detailed Feedback */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Detailed Feedback
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="strengths"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="after:content-['*'] after:text-destructive">
                        Student's Strengths
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe what the student does well, their positive qualities, and areas where they excel..."
                          className="min-h-[120px]"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="areas_for_improvement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Areas for Improvement</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Identify specific areas where the student can improve and provide constructive suggestions..."
                          className="min-h-[120px]"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lesson_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lesson Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any specific observations, incidents, or notable moments from today's lesson..."
                          className="min-h-[100px]"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="next_lesson_goals"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next Lesson Goals</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="What should the student focus on in the next lesson? Any specific goals or objectives..."
                          className="min-h-[100px]"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="homework_assigned"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Homework Assigned</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the homework or practice assignments given to the student..."
                        className="min-h-[80px]"
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Progress Tracking */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Target className="w-5 h-5" />
                Progress Tracking
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <FormField
                  control={form.control}
                  name="unit_completed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Completed</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          disabled={isSubmitting}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lesson_completed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lesson Completed</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          disabled={isSubmitting}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="attendance_quality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Attendance Quality</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select quality" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="excellent">Excellent</SelectItem>
                          <SelectItem value="good">Good</SelectItem>
                          <SelectItem value="fair">Fair</SelectItem>
                          <SelectItem value="poor">Poor</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="recommended_study_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recommended Study Hours/Week</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="20"
                          step="0.5"
                          placeholder="0"
                          disabled={isSubmitting}
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="recommended_next_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recommended Next Level/Course</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Everyday B, Business English, etc."
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="lesson_objectives_met"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Lesson objectives met</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Did the student meet the learning objectives for this lesson?
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="needs_additional_support"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Needs additional support</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Does this student require extra help or intervention?
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Low performance warning */}
            {averageRating > 0 && averageRating <= 2.5 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  The current performance ratings indicate the student may need additional support. Consider scheduling extra help sessions or adjusting the learning approach.
                </AlertDescription>
              </Alert>
            )}

            {/* Form Actions */}
            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !form.formState.isValid}
                className="min-w-[140px]"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {existingFeedback ? 'Update Feedback' : 'Submit Feedback'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default TeacherFeedbackForm;