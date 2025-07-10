"use client";

import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Calendar,
  TrendingUp,
  Target,
  Award,
  Clock,
  CheckCircle,
  CircleProgress,
  BarChart,
  PieChart,
  Star,
  User,
  Filter,
  Download,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface Student {
  id: string;
  name: string;
  email: string;
  course: string;
  level: string;
  enrollmentDate: string;
  targetGraduationDate: string;
}

interface OverallProgress {
  percentage: number;
  completedLessons: number;
  totalLessons: number;
  completedAssignments: number;
  totalAssignments: number;
  attendanceRate: number;
  averageScore: number;
}

interface CourseModule {
  id: string;
  title: string;
  percentage: number;
  completedLessons: number;
  totalLessons: number;
  status: 'completed' | 'in_progress' | 'not_started';
  grade: string | null;
  lastActivity: string | null;
}

interface SkillProgress {
  skill: string;
  current: number;
  target: number;
  improvement: number;
  color: string;
}

interface RecentActivity {
  id: string;
  type: 'lesson' | 'assignment' | 'quiz';
  title: string;
  date: string;
  score: number;
  status: 'completed' | 'pending' | 'failed';
}

interface UpcomingTask {
  id: string;
  title: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  type: 'assignment' | 'class' | 'homework';
}

interface Notification {
  id: string;
  type: 'achievement' | 'reminder' | 'warning';
  message: string;
  date: string;
}

interface ProgressData {
  student: Student;
  overallProgress: OverallProgress;
  courseProgress: CourseModule[];
  skillsProgress: SkillProgress[];
  recentActivity: RecentActivity[];
  upcomingTasks: UpcomingTask[];
  notifications?: Notification[];
}

interface StudentProgressTrackingProps {
  studentId: string;
  progressData: ProgressData | null;
  isLoading?: boolean;
  showCharts?: boolean;
  showTimeline?: boolean;
  showComparison?: boolean;
  onExport?: (studentId: string, type: string) => void;
  onGoalSet?: (skill: string, target: number) => void;
  onDateRangeChange?: (range: { start: string; end: string }) => void;
}

export function StudentProgressTracking({
  studentId,
  progressData,
  isLoading = false,
  showCharts = false,
  showTimeline = false,
  showComparison = false,
  onExport,
  onGoalSet,
  onDateRangeChange,
}: StudentProgressTrackingProps) {
  const [expandedModules, setExpandedModules] = useState<string[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showProgressBadges, setShowProgressBadges] = useState(true);

  const toggleModuleExpansion = (moduleId: string) => {
    setExpandedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'not_started':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'in_progress':
        return 'In Progress';
      case 'not_started':
        return 'Not Started';
      default:
        return 'Unknown';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'High';
      case 'medium':
        return 'Medium';
      case 'low':
        return 'Low';
      default:
        return 'Unknown';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const filteredModules = useMemo(() => {
    if (!progressData) return [];
    
    if (selectedFilter === 'all') {
      return progressData.courseProgress;
    }
    
    return progressData.courseProgress.filter(module => 
      module.status === selectedFilter
    );
  }, [progressData, selectedFilter]);

  if (isLoading) {
    return (
      <div data-testid="progress-loading" className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!progressData) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No progress data available</h3>
        <p className="text-muted-foreground">
          Progress tracking data will appear here once you start your courses.
        </p>
      </div>
    );
  }

  const { student, overallProgress, courseProgress, skillsProgress, recentActivity, upcomingTasks, notifications } = progressData;

  return (
    <div data-testid="progress-container" className="space-y-6 responsive-layout">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Progress Overview</h1>
          <div className="flex items-center gap-2 mt-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{student.name}</p>
              <p className="text-sm text-muted-foreground">
                {student.course} - {student.level}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Module Status</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setSelectedFilter('all')}>
                All
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedFilter('completed')}>
                Completed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedFilter('in_progress')}>
                In Progress
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSelectedFilter('not_started')}>
                Not Started
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button variant="outline" onClick={() => onDateRangeChange?.({ start: '', end: '' })}>
            Date Range
          </Button>
          
          <Button onClick={() => onExport?.(studentId, 'progress')}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Enrollment Information */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Enrolled: {formatDate(student.enrollmentDate)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Target Graduation: {formatDate(student.targetGraduationDate)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overall Progress Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Course Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallProgress.percentage}%</div>
            <Progress value={overallProgress.percentage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Lessons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overallProgress.completedLessons}/{overallProgress.totalLessons}
            </div>
            <Progress 
              value={(overallProgress.completedLessons / overallProgress.totalLessons) * 100} 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4" />
              Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overallProgress.completedAssignments}/{overallProgress.totalAssignments}
            </div>
            <Progress 
              value={(overallProgress.completedAssignments / overallProgress.totalAssignments) * 100} 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallProgress.attendanceRate}%</div>
            <Progress value={overallProgress.attendanceRate} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Average Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Average Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">{overallProgress.averageScore}</div>
          <p className="text-muted-foreground mt-1">Out of 100</p>
        </CardContent>
      </Card>

      {/* Progress Charts */}
      {showCharts && (
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Progress Chart</CardTitle>
            </CardHeader>
            <CardContent>
              <div data-testid="progress-chart" className="h-64 flex items-center justify-center">
                <BarChart className="h-16 w-16 text-muted-foreground" />
                <span className="ml-4 text-muted-foreground">Progress Chart</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Skills Chart</CardTitle>
            </CardHeader>
            <CardContent>
              <div data-testid="skills-chart" className="h-64 flex items-center justify-center">
                <PieChart className="h-16 w-16 text-muted-foreground" />
                <span className="ml-4 text-muted-foreground">Skills Chart</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Course Timeline */}
      {showTimeline && (
        <Card>
          <CardHeader>
            <CardTitle>Course Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div data-testid="course-timeline" className="space-y-4">
              {courseProgress.map((module, index) => (
                <div key={module.id} className="flex items-center gap-4">
                  <div className={cn(
                    "w-3 h-3 rounded-full",
                    getStatusColor(module.status)
                  )} />
                  <div className="flex-1">
                    <p className="font-medium">{module.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {module.percentage}% complete
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Course Progress Modules */}
      <Card>
        <CardHeader>
          <CardTitle>Course Modules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredModules.map((module) => (
              <div key={module.id} data-testid="module-card" className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{module.title}</h3>
                      <Badge variant={module.status === 'completed' ? 'default' : 'secondary'}>
                        {getStatusText(module.status)}
                      </Badge>
                      {module.grade && (
                        <Badge variant="outline">{module.grade}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {module.completedLessons}/{module.totalLessons} lessons completed
                    </p>
                    <Progress 
                      value={module.percentage} 
                      className="mt-2" 
                      data-testid="progress-bar"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleModuleExpansion(module.id)}
                    data-testid="expand-module"
                  >
                    {expandedModules.includes(module.id) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                {expandedModules.includes(module.id) && (
                  <div className="mt-4 p-4 bg-muted rounded">
                    <div className="text-sm">
                      <h4 className="font-medium mb-2">Module Details</h4>
                      {module.lastActivity && (
                        <p>Last Activity: {formatDate(module.lastActivity)}</p>
                      )}
                      <p>Progress: {module.percentage}%</p>
                      <p>Status: {getStatusText(module.status)}</p>
                      {module.grade && <p>Grade: {module.grade}</p>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Skills Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Skills Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {skillsProgress.map((skill) => (
              <div key={skill.skill} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{skill.skill}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {skill.current}/{skill.target}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      +{skill.improvement}
                    </Badge>
                  </div>
                </div>
                <Progress 
                  value={(skill.current / skill.target) * 100} 
                  className="h-2"
                  data-testid="progress-bar"
                />
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => onGoalSet?.(skill.skill, skill.target)}
                  className="text-xs"
                >
                  Set Goal
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Progress Comparison */}
      {showComparison && (
        <Card>
          <CardHeader>
            <CardTitle>Progress Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Your Progress</span>
                <span className="font-bold">{overallProgress.percentage}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Class Average</span>
                <span className="font-bold">68%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity and Upcoming Tasks */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {activity.type === 'lesson' && <BookOpen className="h-4 w-4" />}
                    {activity.type === 'assignment' && <Award className="h-4 w-4" />}
                    {activity.type === 'quiz' && <Star className="h-4 w-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{activity.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(activity.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{activity.score}</p>
                    <p className="text-xs text-muted-foreground">Score</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {task.type === 'assignment' && <Award className="h-4 w-4" />}
                    {task.type === 'class' && <Calendar className="h-4 w-4" />}
                    {task.type === 'homework' && <BookOpen className="h-4 w-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Due: {formatDate(task.dueDate)}
                    </p>
                  </div>
                  <Badge className={getPriorityColor(task.priority)}>
                    {getPriorityText(task.priority)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications */}
      {notifications && notifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div key={notification.id} className="p-3 border rounded">
                  <p className="font-medium">{notification.message}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDate(notification.date)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Badges */}
      {showProgressBadges && (
        <Card>
          <CardHeader>
            <CardTitle>Progress Badges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">First Lesson Complete</Badge>
              <Badge variant="outline">Module 1 Graduate</Badge>
              <Badge variant="outline">Perfect Attendance</Badge>
              <Badge variant="outline">Top Performer</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Milestone Indicator */}
      <Card>
        <CardHeader>
          <CardTitle>Milestone Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <span className="text-sm">Next Milestone: Complete Module 3</span>
            <Progress value={60} className="flex-1" />
            <span className="text-sm">60%</span>
          </div>
        </CardContent>
      </Card>

      {/* Study Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Study Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 rounded">
              <p className="font-medium">Focus on Speaking Skills</p>
              <p className="text-sm text-muted-foreground">
                Your speaking score is below target. Consider booking more conversation practice sessions.
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded">
              <p className="font-medium">Great Progress in Writing</p>
              <p className="text-sm text-muted-foreground">
                You're exceeding expectations in writing. Keep up the excellent work!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}