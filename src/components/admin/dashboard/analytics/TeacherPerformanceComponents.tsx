"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  TrendingUp,
  TrendingDown,
  Star,
  Clock,
  Users,
  Target,
  Award,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Zap,
  Eye,
  MessageSquare,
  Calendar,
  BookOpen,
  GraduationCap,
  Crown,
  Trophy,
  Medal
} from "lucide-react";
import { AnalyticsChart } from "../AnalyticsChart";
import {
  TeacherPerformanceMetrics,
  TeacherRecommendation,
  PerformanceTrend,
  PERFORMANCE_LEVEL_COLORS,
  TREND_COLORS,
  RECOMMENDATION_TYPE_COLORS
} from "@/types/teacher-performance";

// =====================================================================================
// METRIC CARD COMPONENTS
// =====================================================================================

interface MetricCardProps {
  title: string;
  value: number | string;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  changePercentage?: number;
  icon?: React.ReactNode;
  className?: string;
}

export function MetricCard({ title, value, unit, trend, changePercentage, icon, className }: MetricCardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'stable':
        return <Activity className="w-4 h-4 text-gray-600" />;
      default:
        return null;
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {value}
          {unit && <span className="text-sm text-muted-foreground ml-1">{unit}</span>}
        </div>
        {trend && changePercentage !== undefined && (
          <div className="flex items-center text-xs text-muted-foreground">
            {getTrendIcon()}
            <span className="ml-1">
              {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}
              {Math.abs(changePercentage).toFixed(1)}% from last period
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =====================================================================================
// TEACHER PROFILE COMPONENTS
// =====================================================================================

interface TeacherProfileCardProps {
  teacher: TeacherPerformanceMetrics;
  showActions?: boolean;
  onViewDetails?: () => void;
  onViewAnalytics?: () => void;
  className?: string;
}

export function TeacherProfileCard({ 
  teacher, 
  showActions = true, 
  onViewDetails, 
  onViewAnalytics,
  className 
}: TeacherProfileCardProps) {
  const getPerformanceColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 4.0) return 'text-blue-600';
    if (rating >= 3.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceLevel = (rating: number): 'high' | 'medium' | 'low' => {
    if (rating >= 4.5) return 'high';
    if (rating >= 3.5) return 'medium';
    return 'low';
  };

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src="/api/placeholder/48/48" />
              <AvatarFallback>
                {teacher.teacherName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium text-lg">{teacher.teacherName}</div>
              <div className="text-sm text-muted-foreground">
                {teacher.experienceYears} years • {teacher.specializations.join(', ')}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className={`text-xl font-bold ${getPerformanceColor(teacher.overallRating)}`}>
                {teacher.overallRating.toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground">Overall</div>
            </div>
            
            <div className="text-center">
              <div className="text-xl font-bold">
                {teacher.metrics.studentSatisfaction.averageRating.toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground">Satisfaction</div>
            </div>
            
            <div className="text-center">
              <div className="text-xl font-bold">
                {teacher.metrics.classManagement.punctualityRate.toFixed(0)}%
              </div>
              <div className="text-xs text-muted-foreground">Punctuality</div>
            </div>
            
            <Badge variant="outline" className={PERFORMANCE_LEVEL_COLORS[getPerformanceLevel(teacher.overallRating)]}>
              {getPerformanceLevel(teacher.overallRating)}
            </Badge>
            
            {showActions && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onViewDetails}>
                  <Eye className="w-4 h-4 mr-1" />
                  Details
                </Button>
                <Button variant="outline" size="sm" onClick={onViewAnalytics}>
                  <Activity className="w-4 h-4 mr-1" />
                  Analytics
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================================================
// PERFORMANCE CHART COMPONENTS
// =====================================================================================

interface PerformanceRadarChartProps {
  data: Array<{
    metric: string;
    value: number;
    benchmark?: number;
  }>;
  title: string;
  height?: number;
  className?: string;
}

export function PerformanceRadarChart({ data, title, height = 300, className }: PerformanceRadarChartProps) {
  const chartData = data.map(item => ({
    subject: item.metric,
    teacher: item.value,
    benchmark: item.benchmark || 0,
    fullMark: 100
  }));

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <AnalyticsChart
          title=""
          data={chartData}
          type="radar"
          dataKey={["teacher", "benchmark"]}
          xAxisKey="subject"
          height={height}
          colors={["#3b82f6", "#f59e0b"]}
        />
      </CardContent>
    </Card>
  );
}

// =====================================================================================
// RANKING COMPONENTS
// =====================================================================================

interface RankingListProps {
  teachers: Array<{
    teacherId: string;
    teacherName: string;
    rating: number;
    rank: number;
    change?: number;
  }>;
  title: string;
  maxItems?: number;
  className?: string;
}

export function RankingList({ teachers, title, maxItems = 10, className }: RankingListProps) {
  const getRankingIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Trophy className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-orange-500" />;
    return <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">{rank}</div>;
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return <Activity className="w-4 h-4 text-gray-600" />;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {teachers.slice(0, maxItems).map((teacher, index) => (
            <div key={teacher.teacherId} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-3">
                {getRankingIcon(teacher.rank)}
                <div>
                  <div className="font-medium">{teacher.teacherName}</div>
                  <div className="text-sm text-muted-foreground">
                    Rating: {teacher.rating.toFixed(1)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {teacher.change !== undefined && (
                  <div className="flex items-center gap-1">
                    {getChangeIcon(teacher.change)}
                    <span className="text-sm text-muted-foreground">
                      {Math.abs(teacher.change)}
                    </span>
                  </div>
                )}
                <Button variant="ghost" size="sm">
                  <Eye className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================================================
// RECOMMENDATION COMPONENTS
// =====================================================================================

interface RecommendationCardProps {
  recommendation: TeacherRecommendation;
  onViewDetails?: () => void;
  onImplement?: () => void;
  className?: string;
}

export function RecommendationCard({ 
  recommendation, 
  onViewDetails, 
  onImplement,
  className 
}: RecommendationCardProps) {
  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'training':
        return <BookOpen className="w-5 h-5 text-blue-600" />;
      case 'support':
        return <Users className="w-5 h-5 text-green-600" />;
      case 'recognition':
        return <Award className="w-5 h-5 text-yellow-600" />;
      case 'improvement_plan':
        return <Target className="w-5 h-5 text-red-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getRecommendationIcon(recommendation.type)}
          <div>
            <div className="text-base">{recommendation.title}</div>
            <div className="text-sm text-muted-foreground font-normal">
              {recommendation.implementationTimeframe}
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {recommendation.description}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className={RECOMMENDATION_TYPE_COLORS[recommendation.type]}>
                {recommendation.type.replace('_', ' ')}
              </Badge>
              <Badge variant={
                recommendation.priority === 'high' ? 'destructive' :
                recommendation.priority === 'medium' ? 'default' : 'secondary'
              }>
                {recommendation.priority}
              </Badge>
            </div>
            
            <div className="text-sm text-muted-foreground">
              Impact: {(recommendation.expectedImpact * 100).toFixed(0)}%
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onViewDetails}>
              View Details
            </Button>
            <Button size="sm" onClick={onImplement}>
              Implement
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================================================
// TREND COMPONENTS
// =====================================================================================

interface TrendIndicatorProps {
  trends: PerformanceTrend[];
  title: string;
  className?: string;
}

export function TrendIndicator({ trends, title, className }: TrendIndicatorProps) {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'stable':
        return <Activity className="w-4 h-4 text-gray-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'text-green-600';
      case 'declining':
        return 'text-red-600';
      case 'stable':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {trends.map((trend, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {getTrendIcon(trend.trend)}
                <div>
                  <div className="font-medium">{trend.metric}</div>
                  <div className="text-sm text-muted-foreground">
                    {trend.period.replace('_', ' ')}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`font-bold ${getTrendColor(trend.trend)}`}>
                  {trend.changeRate > 0 ? '+' : ''}{trend.changeRate.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  {trend.significance} impact
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================================================
// ALERT COMPONENTS
// =====================================================================================

interface AlertCardProps {
  type: 'performance_decline' | 'missed_training' | 'high_cancellation' | 'positive_feedback';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  teacherName?: string;
  timestamp: string;
  onAction?: () => void;
  className?: string;
}

export function AlertCard({ 
  type, 
  title, 
  message, 
  priority, 
  teacherName, 
  timestamp, 
  onAction,
  className 
}: AlertCardProps) {
  const getAlertIcon = () => {
    switch (type) {
      case 'performance_decline':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'missed_training':
        return <BookOpen className="w-5 h-5 text-orange-600" />;
      case 'high_cancellation':
        return <XCircle className="w-5 h-5 text-yellow-600" />;
      case 'positive_feedback':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getAlertColor = () => {
    switch (priority) {
      case 'high':
        return 'border-red-200 bg-red-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      case 'low':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <Card className={`${getAlertColor()} ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {getAlertIcon()}
            <div>
              <div className="font-medium">{title}</div>
              {teacherName && (
                <div className="text-sm text-muted-foreground font-medium">
                  {teacherName}
                </div>
              )}
              <div className="text-sm text-muted-foreground mt-1">
                {message}
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                {new Date(timestamp).toLocaleString()}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={
              priority === 'high' ? 'destructive' :
              priority === 'medium' ? 'default' : 'secondary'
            }>
              {priority}
            </Badge>
            {onAction && (
              <Button variant="outline" size="sm" onClick={onAction}>
                Action
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =====================================================================================
// PERFORMANCE SUMMARY COMPONENTS
// =====================================================================================

interface PerformanceSummaryProps {
  metrics: TeacherPerformanceMetrics;
  showDetails?: boolean;
  className?: string;
}

export function PerformanceSummary({ metrics, showDetails = false, className }: PerformanceSummaryProps) {
  const performanceCategories = [
    {
      name: 'Teaching Effectiveness',
      value: metrics.metrics.teachingEffectiveness.studentProgressRate,
      icon: <GraduationCap className="w-5 h-5" />
    },
    {
      name: 'Student Satisfaction',
      value: metrics.metrics.studentSatisfaction.averageRating * 20,
      icon: <Star className="w-5 h-5" />
    },
    {
      name: 'Class Management',
      value: metrics.metrics.classManagement.punctualityRate,
      icon: <Clock className="w-5 h-5" />
    },
    {
      name: 'Availability',
      value: metrics.metrics.availability.schedulingFlexibility,
      icon: <Calendar className="w-5 h-5" />
    }
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Performance Summary</CardTitle>
        <CardDescription>
          Overall performance across key metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {performanceCategories.map((category, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {category.icon}
                  <span className="font-medium">{category.name}</span>
                </div>
                <span className="text-sm font-medium">
                  {category.value.toFixed(1)}
                  {category.name === 'Student Satisfaction' ? '/100' : '%'}
                </span>
              </div>
              <Progress value={category.value} className="h-2" />
            </div>
          ))}
          
          {showDetails && (
            <div className="pt-4 border-t">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Overall Rating</div>
                  <div className="font-bold text-lg">{metrics.overallRating.toFixed(1)}/100</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Experience</div>
                  <div className="font-bold text-lg">{metrics.experienceYears} years</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Specializations</div>
                  <div className="font-medium">{metrics.specializations.length}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Last Updated</div>
                  <div className="font-medium">
                    {new Date(metrics.lastUpdated).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}