"use client";

import { logger } from '@/lib/services';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search,
  TrendingUp,
  TrendingDown,
  Clock,
  BookOpen,
  Users,
  Target,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { contentAnalysisService } from '@/lib/services/content-analysis-service';
import { studentProgressService } from '@/lib/services/student-progress-service';
import { 
  StudentProgress, 
  UnlearnedContent, 
  LearningAnalytics,
  ContentItem,
  SchedulingPriority
} from '@/types/scheduling';

interface StudentProgressAnalyzerProps {
  studentId?: string;
  onStudentSelect?: (studentId: string) => void;
  className?: string;
}

export function StudentProgressAnalyzer({ 
  studentId, 
  onStudentSelect, 
  className 
}: StudentProgressAnalyzerProps) {
  const [selectedStudent, setSelectedStudent] = useState<string>(studentId || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [progressData, setProgressData] = useState<StudentProgress[]>([]);
  const [unlearnedContent, setUnlearnedContent] = useState<UnlearnedContent[]>([]);
  const [analytics, setAnalytics] = useState<LearningAnalytics | null>(null);
  const [progressReport, setProgressReport] = useState<any>(null);

  useEffect(() => {
    if (selectedStudent) {
      loadStudentData(selectedStudent);
    }
  }, [selectedStudent]);

  const loadStudentData = async (studentId: string) => {
    setLoading(true);
    try {
      const [progress, unlearned, studentAnalytics, report] = await Promise.all([
        contentAnalysisService.analyzeStudentProgress(studentId),
        contentAnalysisService.identifyUnlearnedContent(studentId),
        contentAnalysisService.generateLearningAnalytics(studentId),
        studentProgressService.getProgressReport(studentId)
      ]);

      setProgressData(progress);
      setUnlearnedContent(unlearned);
      setAnalytics(studentAnalytics);
      setProgressReport(report);
    } catch (error) {
      logger.error('Failed to load student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    // In a real implementation, this would trigger a search API call
  };

  const selectStudent = (studentId: string) => {
    setSelectedStudent(studentId);
    onStudentSelect?.(studentId);
  };

  const getPriorityColor = (priority: SchedulingPriority): string => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getLearningPaceIcon = (pace: string) => {
    switch (pace) {
      case 'fast': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'slow': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-blue-500" />;
    }
  };

  const formatTimeSlot = (timeSlot: any) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${days[timeSlot.day_of_week]} ${timeSlot.start_time}`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Student Progress Analyzer</h2>
          <p className="text-muted-foreground">
            Analyze student learning patterns and content needs for optimal scheduling
          </p>
        </div>
      </div>

      {/* Student Search */}
      <Card>
        <CardHeader>
          <CardTitle>Select Student</CardTitle>
          <CardDescription>Search and select a student to analyze their progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                placeholder="Search students by name or ID..."
                value={searchTerm}
                onChange={handleStudentSearch}
                className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <Button 
              onClick={() => selectStudent('demo-student-1')} 
              variant="outline"
              disabled={loading}
            >
              Load Demo
            </Button>
          </div>
          
          {selectedStudent && (
            <div className="mt-4 p-3 bg-muted rounded-md">
              <div className="flex items-center justify-between">
                <span className="font-medium">Selected: {selectedStudent}</span>
                <Badge variant="outline">Analyzing</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedStudent && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="content">Content Gaps</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Progress Summary Cards */}
                {progressData.map((progress, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">
                        Course Progress
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Overall Progress</span>
                            <span className="text-sm text-muted-foreground">
                              {progress.progress_percentage.toFixed(1)}%
                            </span>
                          </div>
                          <Progress value={progress.progress_percentage} className="h-2" />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Current Unit</span>
                          <span className="text-sm font-medium">{progress.current_unit}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Current Lesson</span>
                          <span className="text-sm font-medium">{progress.current_lesson}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Learning Pace</span>
                          <div className="flex items-center space-x-1">
                            {getLearningPaceIcon(progress.learning_pace)}
                            <span className="text-sm font-medium capitalize">
                              {progress.learning_pace}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Learning Analytics Summary */}
                {analytics && (
                  <Card className="md:col-span-2 lg:col-span-1">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Learning Analytics</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Learning Velocity</span>
                          <span className="text-sm font-medium">
                            {analytics.learning_velocity.toFixed(1)} lessons/week
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Retention Rate</span>
                          <span className="text-sm font-medium">
                            {analytics.retention_rate.toFixed(1)}%
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Engagement Score</span>
                          <span className="text-sm font-medium">
                            {analytics.engagement_score.toFixed(1)}%
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Optimal Class Size</span>
                          <span className="text-sm font-medium">
                            {analytics.optimal_class_size} students
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Struggling Topics */}
            {progressData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Areas Needing Attention</CardTitle>
                  <CardDescription>Topics where the student is struggling</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-2 text-red-500" />
                        Struggling Topics
                      </h4>
                      <div className="space-y-1">
                        {progressData[0]?.struggling_topics.map((topic, index) => (
                          <Badge key={index} variant="destructive" className="mr-1 mb-1">
                            {topic}
                          </Badge>
                        ))}
                        {progressData[0]?.struggling_topics.length === 0 && (
                          <p className="text-sm text-muted-foreground">No struggling topics identified</p>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center">
                        <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                        Mastered Topics
                      </h4>
                      <div className="space-y-1">
                        {progressData[0]?.mastered_topics.map((topic, index) => (
                          <Badge key={index} variant="secondary" className="mr-1 mb-1">
                            {topic}
                          </Badge>
                        ))}
                        {progressData[0]?.mastered_topics.length === 0 && (
                          <p className="text-sm text-muted-foreground">No mastered topics identified</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Unlearned Content</CardTitle>
                <CardDescription>
                  Content items that need to be covered, prioritized by urgency
                </CardDescription>
              </CardHeader>
              <CardContent>
                {unlearnedContent.length > 0 ? (
                  <div className="space-y-4">
                    {unlearnedContent.map((unlearned, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <Badge variant={getPriorityColor(unlearned.urgency_level) as any}>
                              {unlearned.urgency_level}
                            </Badge>
                            <Badge variant="outline" className="ml-2">
                              {unlearned.recommended_class_type}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">Priority Score</p>
                            <p className="text-lg font-bold">{unlearned.priority_score}/100</p>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            Estimated Learning Time: {Math.round(unlearned.estimated_learning_time / 60)}h {unlearned.estimated_learning_time % 60}m
                          </p>
                          
                          <div>
                            <h4 className="text-sm font-medium mb-2">Content Items:</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {unlearned.content_items.map((item, itemIndex) => (
                                <ContentItemCard key={itemIndex} item={item} />
                              ))}
                            </div>
                          </div>
                          
                          {unlearned.grouping_compatibility.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Compatible Students:</h4>
                              <div className="flex flex-wrap gap-1">
                                {unlearned.grouping_compatibility.map((studentId, studentIndex) => (
                                  <Badge key={studentIndex} variant="outline" className="text-xs">
                                    {studentId}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No unlearned content identified</p>
                    <p className="text-sm">Student appears to be up to date with course material</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            {analytics && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Learning Style and Preferences */}
                <Card>
                  <CardHeader>
                    <CardTitle>Learning Preferences</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Preferred Learning Style
                        </label>
                        <p className="text-lg font-semibold capitalize">
                          {analytics.preferred_learning_style}
                        </p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Optimal Class Size
                        </label>
                        <p className="text-lg font-semibold">
                          {analytics.optimal_class_size} students
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Best Time Slots */}
                <Card>
                  <CardHeader>
                    <CardTitle>Optimal Time Slots</CardTitle>
                    <CardDescription>When this student performs best</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analytics.best_time_slots.length > 0 ? (
                      <div className="space-y-2">
                        {analytics.best_time_slots.slice(0, 5).map((timeSlot, index) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded">
                            <span className="text-sm font-medium">
                              {formatTimeSlot(timeSlot)}
                            </span>
                            <Badge variant="secondary">Optimal</Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No time preferences identified yet
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Peer Compatibility */}
                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Compatible Peers</CardTitle>
                    <CardDescription>Students who learn well together</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analytics.peer_compatibility.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {analytics.peer_compatibility.map((peerId, index) => (
                          <Badge key={index} variant="outline" className="cursor-pointer hover:bg-muted">
                            {peerId}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No peer compatibility data available yet
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Learning Recommendations</CardTitle>
                <CardDescription>
                  Personalized suggestions to improve this student's learning experience
                </CardDescription>
              </CardHeader>
              <CardContent>
                {progressReport?.recommendations?.length > 0 ? (
                  <div className="space-y-4">
                    {progressReport.recommendations.map((recommendation: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium">{recommendation.title}</h4>
                          <Badge variant={getPriorityColor(recommendation.priority) as any}>
                            {recommendation.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {recommendation.description}
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Timeline: {recommendation.implementation_timeline}</span>
                          <span>Expected Impact: {recommendation.expected_impact}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No recommendations available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

interface ContentItemCardProps {
  item: ContentItem;
}

function ContentItemCard({ item }: ContentItemCardProps) {
  const getDifficultyColor = (level: number): string => {
    if (level <= 3) return 'bg-green-100 text-green-800';
    if (level <= 6) return 'bg-yellow-100 text-yellow-800';
    if (level <= 8) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="border rounded p-3 space-y-2">
      <div className="flex items-start justify-between">
        <h5 className="text-sm font-medium">{item.title}</h5>
        <span className={`text-xs px-2 py-1 rounded ${getDifficultyColor(item.difficulty_level)}`}>
          Level {item.difficulty_level}
        </span>
      </div>
      
      <div className="text-xs text-muted-foreground">
        Unit {item.unit_number}, Lesson {item.lesson_number}
      </div>
      
      <div className="flex items-center justify-between text-xs">
        <Badge variant="outline" className="text-xs">
          {item.content_type}
        </Badge>
        <span className="text-muted-foreground">
          {item.estimated_duration_minutes}min
        </span>
      </div>
      
      {item.learning_objectives.length > 0 && (
        <div className="text-xs">
          <strong>Objectives:</strong> {item.learning_objectives.slice(0, 2).join(', ')}
          {item.learning_objectives.length > 2 && '...'}
        </div>
      )}
    </div>
  );
}