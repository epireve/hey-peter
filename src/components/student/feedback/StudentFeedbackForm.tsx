'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Star, Send, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { feedbackService } from '@/lib/services/feedback-service';
import { StudentFeedback, FeedbackType } from '@/types/feedback';

// Validation schema
const studentFeedbackSchema = z.object({
  overall_rating: z.number().min(1, 'Overall rating is required').max(5),
  teaching_quality_rating: z.number().min(1).max(5).optional(),
  class_content_rating: z.number().min(1).max(5).optional(),
  engagement_rating: z.number().min(1).max(5).optional(),
  punctuality_rating: z.number().min(1).max(5).optional(),
  positive_feedback: z.string().optional(),
  improvement_suggestions: z.string().optional(),
  learning_objectives_met: z.boolean().optional(),
  would_recommend: z.boolean().optional(),
  is_anonymous: z.boolean().default(false)
});

type StudentFeedbackFormData = z.infer<typeof studentFeedbackSchema>;

interface StudentFeedbackFormProps {
  studentId: string;
  classId?: string;
  teacherId?: string;
  bookingId?: string;
  feedbackType?: FeedbackType;
  onSubmitSuccess?: (feedback: StudentFeedback) => void;
  onCancel?: () => void;
  existingFeedback?: StudentFeedback;
  className?: string;
}

interface RatingInputProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
  required?: boolean;
  disabled?: boolean;
}

const RatingInput: React.FC<RatingInputProps> = ({ value, onChange, label, required, disabled }) => {
  const [hoverValue, setHoverValue] = useState(0);

  return (
    <div className="space-y-2">
      <FormLabel className={required ? "after:content-['*'] after:text-destructive" : ""}>
        {label}
      </FormLabel>
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            className={`p-1 transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}`}
            onMouseEnter={() => !disabled && setHoverValue(star)}
            onMouseLeave={() => setHoverValue(0)}
            onClick={() => !disabled && onChange(star)}
          >
            <Star
              className={`w-6 h-6 ${
                star <= (hoverValue || value)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-muted-foreground">
          {value > 0 && (
            <Badge variant={value >= 4 ? 'default' : value >= 3 ? 'secondary' : 'destructive'}>
              {value === 5 ? 'Excellent' : value === 4 ? 'Good' : value === 3 ? 'Average' : value === 2 ? 'Poor' : 'Very Poor'}
            </Badge>
          )}
        </span>
      </div>
    </div>
  );
};

export const StudentFeedbackForm: React.FC<StudentFeedbackFormProps> = ({
  studentId,
  classId,
  teacherId,
  bookingId,
  feedbackType = 'class_feedback',
  onSubmitSuccess,
  onCancel,
  existingFeedback,
  className
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const form = useForm<StudentFeedbackFormData>({
    resolver: zodResolver(studentFeedbackSchema),
    defaultValues: {
      overall_rating: existingFeedback?.overall_rating || 0,
      teaching_quality_rating: existingFeedback?.teaching_quality_rating || 0,
      class_content_rating: existingFeedback?.class_content_rating || 0,
      engagement_rating: existingFeedback?.engagement_rating || 0,
      punctuality_rating: existingFeedback?.punctuality_rating || 0,
      positive_feedback: existingFeedback?.positive_feedback || '',
      improvement_suggestions: existingFeedback?.improvement_suggestions || '',
      learning_objectives_met: existingFeedback?.learning_objectives_met || false,
      would_recommend: existingFeedback?.would_recommend || false,
      is_anonymous: existingFeedback?.is_anonymous || false
    }
  });

  const watchedRating = form.watch('overall_rating');

  const onSubmit = async (data: StudentFeedbackFormData) => {
    setIsSubmitting(true);
    
    try {
      const feedbackData: StudentFeedback = {
        ...data,
        student_id: studentId,
        class_id: classId,
        teacher_id: teacherId,
        booking_id: bookingId,
        feedback_type: feedbackType,
        submission_method: 'manual'
      };

      let result: StudentFeedback;

      if (existingFeedback?.id) {
        result = await feedbackService.updateStudentFeedback(existingFeedback.id, feedbackData);
        toast({
          title: "Feedback Updated",
          description: "Your feedback has been updated successfully.",
        });
      } else {
        result = await feedbackService.createStudentFeedback(feedbackData);
        toast({
          title: "Feedback Submitted",
          description: "Thank you for your feedback! It helps us improve our teaching quality.",
        });
      }

      setSubmitSuccess(true);
      onSubmitSuccess?.(result);

      // Reset form if creating new feedback
      if (!existingFeedback) {
        form.reset();
      }

    } catch (error) {
      console.error('Error submitting feedback:', error);
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

  const getRatingDescription = (rating: number): string => {
    switch (rating) {
      case 5: return "Outstanding experience! Everything exceeded expectations.";
      case 4: return "Great experience with minor areas for improvement.";
      case 3: return "Good experience that met basic expectations.";
      case 2: return "Below expectations with several areas needing improvement.";
      case 1: return "Poor experience that didn't meet expectations.";
      default: return "Please rate your overall experience.";
    }
  };

  const getFormTitle = (): string => {
    switch (feedbackType) {
      case 'teacher_feedback':
        return 'Teacher Feedback';
      case 'course_feedback':
        return 'Course Feedback';
      default:
        return 'Class Feedback';
    }
  };

  if (submitSuccess && !existingFeedback) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Thank You!</h3>
          <p className="text-muted-foreground mb-4">
            Your feedback has been submitted successfully. Your input helps us improve our teaching quality.
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
          <Star className="w-5 h-5" />
          {getFormTitle()}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Share your honest feedback to help us improve your learning experience.
        </p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Overall Rating - Required */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="overall_rating"
                render={({ field }) => (
                  <FormItem>
                    <RatingInput
                      value={field.value}
                      onChange={field.onChange}
                      label="Overall Rating"
                      required
                      disabled={isSubmitting}
                    />
                    <FormMessage />
                    {watchedRating > 0 && (
                      <p className="text-sm text-muted-foreground">
                        {getRatingDescription(watchedRating)}
                      </p>
                    )}
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Detailed Ratings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="teaching_quality_rating"
                render={({ field }) => (
                  <FormItem>
                    <RatingInput
                      value={field.value || 0}
                      onChange={field.onChange}
                      label="Teaching Quality"
                      disabled={isSubmitting}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="class_content_rating"
                render={({ field }) => (
                  <FormItem>
                    <RatingInput
                      value={field.value || 0}
                      onChange={field.onChange}
                      label="Class Content"
                      disabled={isSubmitting}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="engagement_rating"
                render={({ field }) => (
                  <FormItem>
                    <RatingInput
                      value={field.value || 0}
                      onChange={field.onChange}
                      label="Class Engagement"
                      disabled={isSubmitting}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="punctuality_rating"
                render={({ field }) => (
                  <FormItem>
                    <RatingInput
                      value={field.value || 0}
                      onChange={field.onChange}
                      label="Punctuality"
                      disabled={isSubmitting}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Text Feedback */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="positive_feedback"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>What did you like most about this {feedbackType.replace('_feedback', '')}?</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Share what you enjoyed or found helpful..."
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
                name="improvement_suggestions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>What could be improved?</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Share any suggestions for improvement..."
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

            <Separator />

            {/* Boolean Fields */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="learning_objectives_met"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Learning objectives met</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Did this {feedbackType.replace('_feedback', '')} meet your learning objectives?
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
                name="would_recommend"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Would recommend</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Would you recommend this to other students?
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
                name="is_anonymous"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Submit anonymously</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Your identity will not be shared with the teacher
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

            {/* Low rating warning */}
            {watchedRating > 0 && watchedRating <= 2 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  We're sorry to hear about your experience. Your feedback is valuable and will be reviewed by our academic team to make improvements.
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
                className="min-w-[120px]"
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

export default StudentFeedbackForm;