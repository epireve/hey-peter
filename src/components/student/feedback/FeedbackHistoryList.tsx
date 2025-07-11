'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Star, MessageSquare, Clock, Eye, Edit, Filter, Search, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { feedbackService } from '@/lib/services/feedback-service';
import { StudentFeedbackWithRelations, FeedbackType } from '@/types/feedback';
import StudentFeedbackForm from './StudentFeedbackForm';

interface FeedbackHistoryListProps {
  studentId: string;
  onEditFeedback?: (feedback: StudentFeedbackWithRelations) => void;
  className?: string;
}

interface FeedbackFilters {
  search: string;
  feedbackType: FeedbackType | 'all';
  ratingFilter: 'all' | 'high' | 'medium' | 'low';
  dateRange: 'all' | 'week' | 'month' | 'quarter';
}

const FeedbackHistoryList: React.FC<FeedbackHistoryListProps> = ({
  studentId,
  onEditFeedback,
  className
}) => {
  const [feedbackList, setFeedbackList] = useState<StudentFeedbackWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [editingFeedback, setEditingFeedback] = useState<StudentFeedbackWithRelations | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const [filters, setFilters] = useState<FeedbackFilters>({
    search: '',
    feedbackType: 'all',
    ratingFilter: 'all',
    dateRange: 'all'
  });

  const itemsPerPage = 10;

  useEffect(() => {
    loadFeedback();
  }, [studentId, currentPage, filters]);

  const loadFeedback = async () => {
    setLoading(true);
    try {
      const dateFilters = getDateRangeFilter(filters.dateRange);
      const ratingFilters = getRatingFilter(filters.ratingFilter);

      const { data, count } = await feedbackService.getStudentFeedbackList({
        student_id: studentId,
        feedback_type: filters.feedbackType !== 'all' ? filters.feedbackType : undefined,
        ...ratingFilters,
        ...dateFilters,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage
      });

      // Filter by search term on client side for now
      const filteredData = filters.search
        ? data.filter(feedback => 
            feedback.positive_feedback?.toLowerCase().includes(filters.search.toLowerCase()) ||
            feedback.improvement_suggestions?.toLowerCase().includes(filters.search.toLowerCase()) ||
            feedback.teacher?.full_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
            feedback.class?.class_name?.toLowerCase().includes(filters.search.toLowerCase())
          )
        : data;

      setFeedbackList(filteredData);
      setTotalCount(count);
    } catch (error) {
      console.error('Error loading feedback:', error);
      toast({
        title: "Error",
        description: "Failed to load feedback history. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getDateRangeFilter = (range: string) => {
    const now = new Date();
    switch (range) {
      case 'week':
        return { date_from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString() };
      case 'month':
        return { date_from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString() };
      case 'quarter':
        return { date_from: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString() };
      default:
        return {};
    }
  };

  const getRatingFilter = (rating: string) => {
    switch (rating) {
      case 'high':
        return { rating_min: 4 };
      case 'medium':
        return { rating_min: 3, rating_max: 4 };
      case 'low':
        return { rating_max: 2 };
      default:
        return {};
    }
  };

  const toggleExpanded = (feedbackId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(feedbackId)) {
      newExpanded.delete(feedbackId);
    } else {
      newExpanded.add(feedbackId);
    }
    setExpandedItems(newExpanded);
  };

  const handleEditFeedback = (feedback: StudentFeedbackWithRelations) => {
    setEditingFeedback(feedback);
    setShowEditDialog(true);
    onEditFeedback?.(feedback);
  };

  const handleEditSuccess = (updatedFeedback: any) => {
    toast({
      title: "Success",
      description: "Feedback updated successfully.",
    });
    setShowEditDialog(false);
    setEditingFeedback(null);
    loadFeedback(); // Reload the list
  };

  const getRatingBadge = (rating?: number) => {
    if (!rating) return null;
    
    const variant = rating >= 4 ? 'default' : rating >= 3 ? 'secondary' : 'destructive';
    const text = rating === 5 ? 'Excellent' : rating === 4 ? 'Good' : rating === 3 ? 'Average' : rating === 2 ? 'Poor' : 'Very Poor';
    
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Star className="w-3 h-3 fill-current" />
        {rating}/5 • {text}
      </Badge>
    );
  };

  const getFeedbackTypeBadge = (type?: FeedbackType) => {
    if (!type) return null;
    
    const label = type.replace('_feedback', '').replace('_', ' ');
    return (
      <Badge variant="outline" className="capitalize">
        {label}
      </Badge>
    );
  };

  const renderStarRating = (rating?: number) => {
    if (!rating) return null;
    
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-sm text-muted-foreground ml-1">({rating}/5)</span>
      </div>
    );
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-20 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Feedback History
            <Badge variant="secondary">{totalCount} total</Badge>
          </CardTitle>
          
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4">
            <div>
              <Input
                placeholder="Search feedback..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full"
              />
            </div>
            
            <Select
              value={filters.feedbackType}
              onValueChange={(value) => setFilters(prev => ({ ...prev, feedbackType: value as FeedbackType | 'all' }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Feedback Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="class_feedback">Class Feedback</SelectItem>
                <SelectItem value="teacher_feedback">Teacher Feedback</SelectItem>
                <SelectItem value="course_feedback">Course Feedback</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              value={filters.ratingFilter}
              onValueChange={(value) => setFilters(prev => ({ ...prev, ratingFilter: value as any }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="high">High (4-5 stars)</SelectItem>
                <SelectItem value="medium">Medium (3 stars)</SelectItem>
                <SelectItem value="low">Low (1-2 stars)</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              value={filters.dateRange}
              onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value as any }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="week">Last Week</SelectItem>
                <SelectItem value="month">Last Month</SelectItem>
                <SelectItem value="quarter">Last Quarter</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent>
          {feedbackList.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No feedback found</h3>
              <p className="text-muted-foreground">
                {filters.search || filters.feedbackType !== 'all' || filters.ratingFilter !== 'all' 
                  ? 'No feedback matches your current filters.'
                  : 'You haven\'t submitted any feedback yet.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {feedbackList.map((feedback) => (
                <Card key={feedback.id} className="border-l-4 border-l-primary/20">
                  <CardContent className="p-4">
                    <Collapsible>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          {/* Header Info */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {getRatingBadge(feedback.overall_rating)}
                            {getFeedbackTypeBadge(feedback.feedback_type)}
                            {feedback.is_anonymous && (
                              <Badge variant="outline">Anonymous</Badge>
                            )}
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(feedback.created_at!), 'MMM d, yyyy')}
                            </span>
                          </div>
                          
                          {/* Class/Teacher Info */}
                          <div className="text-sm space-y-1">
                            {feedback.class && (
                              <p><strong>Class:</strong> {feedback.class.class_name}</p>
                            )}
                            {feedback.teacher && (
                              <p><strong>Teacher:</strong> {feedback.teacher.full_name}</p>
                            )}
                            {feedback.class?.course && (
                              <p><strong>Course:</strong> {feedback.class.course.title}</p>
                            )}
                          </div>
                          
                          {/* Overall Rating */}
                          {feedback.overall_rating && (
                            <div>
                              {renderStarRating(feedback.overall_rating)}
                            </div>
                          )}
                          
                          {/* Quick Preview */}
                          {(feedback.positive_feedback || feedback.improvement_suggestions) && (
                            <div className="text-sm">
                              {feedback.positive_feedback && (
                                <p className="text-muted-foreground line-clamp-2">
                                  "{feedback.positive_feedback.substring(0, 100)}..."
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditFeedback(feedback)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <CollapsibleTrigger
                            className="flex items-center gap-1 px-3 py-1 text-sm text-muted-foreground hover:text-foreground"
                            onClick={() => toggleExpanded(feedback.id!)}
                          >
                            <Eye className="w-4 h-4" />
                            Details
                            <ChevronDown 
                              className={`w-4 h-4 transition-transform ${
                                expandedItems.has(feedback.id!) ? 'rotate-180' : ''
                              }`} 
                            />
                          </CollapsibleTrigger>
                        </div>
                      </div>
                      
                      <CollapsibleContent className="pt-4">
                        <Separator className="mb-4" />
                        
                        {/* Detailed Ratings */}
                        {(feedback.teaching_quality_rating || feedback.class_content_rating || 
                          feedback.engagement_rating || feedback.punctuality_rating) && (
                          <div className="mb-4">
                            <h4 className="font-medium mb-2">Detailed Ratings</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              {feedback.teaching_quality_rating && (
                                <div>
                                  <span className="text-muted-foreground">Teaching Quality:</span>
                                  <div className="flex items-center gap-2">
                                    {renderStarRating(feedback.teaching_quality_rating)}
                                  </div>
                                </div>
                              )}
                              {feedback.class_content_rating && (
                                <div>
                                  <span className="text-muted-foreground">Class Content:</span>
                                  <div className="flex items-center gap-2">
                                    {renderStarRating(feedback.class_content_rating)}
                                  </div>
                                </div>
                              )}
                              {feedback.engagement_rating && (
                                <div>
                                  <span className="text-muted-foreground">Engagement:</span>
                                  <div className="flex items-center gap-2">
                                    {renderStarRating(feedback.engagement_rating)}
                                  </div>
                                </div>
                              )}
                              {feedback.punctuality_rating && (
                                <div>
                                  <span className="text-muted-foreground">Punctuality:</span>
                                  <div className="flex items-center gap-2">
                                    {renderStarRating(feedback.punctuality_rating)}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Text Feedback */}
                        <div className="space-y-4">
                          {feedback.positive_feedback && (
                            <div>
                              <h4 className="font-medium text-green-700 mb-2">What you liked:</h4>
                              <p className="text-sm bg-green-50 p-3 rounded">
                                {feedback.positive_feedback}
                              </p>
                            </div>
                          )}
                          
                          {feedback.improvement_suggestions && (
                            <div>
                              <h4 className="font-medium text-amber-700 mb-2">Suggestions for improvement:</h4>
                              <p className="text-sm bg-amber-50 p-3 rounded">
                                {feedback.improvement_suggestions}
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {/* Additional Info */}
                        {(feedback.learning_objectives_met !== undefined || feedback.would_recommend !== undefined) && (
                          <div className="mt-4 pt-4 border-t">
                            <div className="flex gap-6 text-sm">
                              {feedback.learning_objectives_met !== undefined && (
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">Learning objectives met:</span>
                                  <Badge variant={feedback.learning_objectives_met ? 'default' : 'secondary'}>
                                    {feedback.learning_objectives_met ? 'Yes' : 'No'}
                                  </Badge>
                                </div>
                              )}
                              {feedback.would_recommend !== undefined && (
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">Would recommend:</span>
                                  <Badge variant={feedback.would_recommend ? 'default' : 'secondary'}>
                                    {feedback.would_recommend ? 'Yes' : 'No'}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                </Card>
              ))}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground px-4">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Edit Feedback Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Feedback</DialogTitle>
          </DialogHeader>
          {editingFeedback && (
            <StudentFeedbackForm
              studentId={studentId}
              classId={editingFeedback.class_id}
              teacherId={editingFeedback.teacher_id}
              bookingId={editingFeedback.booking_id}
              feedbackType={editingFeedback.feedback_type}
              existingFeedback={editingFeedback}
              onSubmitSuccess={handleEditSuccess}
              onCancel={() => setShowEditDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeedbackHistoryList;