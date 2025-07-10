"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  Star,
  Users,
  Award,
  Target,
  BarChart3,
  PieChart,
  Activity,
  ArrowUpDown,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  Trophy,
  Medal,
  Crown,
  Zap,
  Eye,
  Download
} from "lucide-react";
import { AnalyticsChart } from "../AnalyticsChart";
import { enhancedTeacherPerformanceAnalytics } from "@/lib/services/teacher-performance-analytics-enhanced";
import {
  TeacherPerformanceMetrics,
  TeacherPeerComparison,
  TeacherCohortAnalysis,
  PERFORMANCE_LEVEL_COLORS,
  TREND_COLORS
} from "@/types/teacher-performance";

interface TeacherComparisonAnalyticsProps {
  teacherId?: string;
  className?: string;
}

export function TeacherComparisonAnalytics({ teacherId, className }: TeacherComparisonAnalyticsProps) {
  const [comparisonData, setComparisonData] = useState<TeacherPeerComparison | null>(null);
  const [teacherMetrics, setTeacherMetrics] = useState<TeacherPerformanceMetrics | null>(null);
  const [cohortAnalysis, setCohortAnalysis] = useState<TeacherCohortAnalysis | null>(null);
  const [allTeachers, setAllTeachers] = useState<TeacherPerformanceMetrics[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<string>(teacherId || '');
  const [comparisonType, setComparisonType] = useState<'peer' | 'cohort' | 'individual'>('peer');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedTeacher) {
      loadComparisonData();
    }
  }, [selectedTeacher, comparisonType]);

  useEffect(() => {
    loadTeachersList();
  }, []);

  const loadTeachersList = async () => {
    try {
      const result = await enhancedTeacherPerformanceAnalytics.searchTeachers(
        {},
        { field: 'overallRating', order: 'desc' },
        1,
        100
      );
      setAllTeachers(result.teachers);
      
      if (!selectedTeacher && result.teachers.length > 0) {
        setSelectedTeacher(result.teachers[0].teacherId);
      }
    } catch (err) {
      console.error('Failed to load teachers list:', err);
    }
  };

  const loadComparisonData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [metrics, comparison, cohort] = await Promise.all([
        enhancedTeacherPerformanceAnalytics.getTeacherPerformanceMetrics(selectedTeacher),
        enhancedTeacherPerformanceAnalytics.getTeacherPeerComparison(selectedTeacher),
        enhancedTeacherPerformanceAnalytics.getTeacherCohortAnalysis()
      ]);

      setTeacherMetrics(metrics);
      setComparisonData(comparison);
      setCohortAnalysis(cohort);
    } catch (err) {
      console.error('Failed to load comparison data:', err);
      setError('Failed to load comparison data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

  const getRankingIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Trophy className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-orange-500" />;
    return <Target className="w-5 h-5 text-blue-500" />;
  };

  const getComparisonTrend = (score: number, peerAverage: number) => {
    if (score > peerAverage * 1.1) return 'up';
    if (score < peerAverage * 0.9) return 'down';
    return 'stable';
  };

  const buildRadarData = () => {
    if (!teacherMetrics || !comparisonData) return [];

    return [
      {
        metric: 'Teaching Effectiveness',
        teacher: comparisonData.performanceComparison.teachingEffectiveness.score,
        peerAverage: comparisonData.performanceComparison.teachingEffectiveness.peerAverage,
        fullMark: 100
      },
      {
        metric: 'Student Satisfaction',
        teacher: comparisonData.performanceComparison.studentSatisfaction.score,
        peerAverage: comparisonData.performanceComparison.studentSatisfaction.peerAverage,
        fullMark: 100
      },
      {
        metric: 'Class Management',
        teacher: comparisonData.performanceComparison.classManagement.score,
        peerAverage: comparisonData.performanceComparison.classManagement.peerAverage,
        fullMark: 100
      },
      {
        metric: 'Availability',
        teacher: comparisonData.performanceComparison.availability.score,
        peerAverage: comparisonData.performanceComparison.availability.peerAverage,
        fullMark: 100
      },
      {
        metric: 'Professional Development',
        teacher: comparisonData.performanceComparison.professionalDevelopment.score,
        peerAverage: comparisonData.performanceComparison.professionalDevelopment.peerAverage,
        fullMark: 100
      }
    ];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
        <p className="text-destructive">{error}</p>
        <Button onClick={loadComparisonData} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  if (!comparisonData || !teacherMetrics) {
    return (
      <div className="text-center py-8">
        <p>No comparison data available</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teacher Comparison Analytics</h1>
          <p className="text-muted-foreground">
            Compare teacher performance against peers and analyze strengths and improvement areas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select teacher" />
            </SelectTrigger>
            <SelectContent>
              {allTeachers.map((teacher) => (
                <SelectItem key={teacher.teacherId} value={teacher.teacherId}>
                  {teacher.teacherName} ({teacher.overallRating.toFixed(1)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Teacher Overview */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src="/api/placeholder/48/48" />
              <AvatarFallback>
                {teacherMetrics.teacherName.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-xl font-bold">{teacherMetrics.teacherName}</div>
              <div className="text-sm text-muted-foreground">
                {teacherMetrics.experienceYears} years experience • {teacherMetrics.specializations.join(', ')}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center mb-2">
                {getRankingIcon(comparisonData.ranking.overall)}
              </div>
              <div className="text-2xl font-bold">{comparisonData.ranking.overall}</div>
              <div className="text-sm text-muted-foreground">Overall Ranking</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{comparisonData.ranking.percentile}%</div>
              <div className="text-sm text-muted-foreground">Percentile</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className={`text-2xl font-bold ${getPerformanceColor(teacherMetrics.overallRating)}`}>
                {teacherMetrics.overallRating.toFixed(1)}
              </div>
              <div className="text-sm text-muted-foreground">Overall Rating</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold">{comparisonData.peerGroup.size}</div>
              <div className="text-sm text-muted-foreground">Peer Group Size</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="strengths">Strengths</TabsTrigger>
          <TabsTrigger value="improvement">Improvement</TabsTrigger>
          <TabsTrigger value="ranking">Ranking</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Performance Comparison Radar */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Comparison</CardTitle>
                <CardDescription>
                  Teacher performance vs peer group average
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AnalyticsChart
                  title=""
                  data={buildRadarData()}
                  type="radar"
                  dataKey={["teacher", "peerAverage"]}
                  xAxisKey="metric"
                  height={300}
                  colors={["#3b82f6", "#f59e0b"]}
                />
              </CardContent>
            </Card>

            {/* Peer Group Information */}
            <Card>
              <CardHeader>
                <CardTitle>Peer Group Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="font-medium text-blue-800">Selection Criteria</div>
                    <div className="text-sm text-blue-600">{comparisonData.peerGroup.criteria}</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 border rounded-lg">
                      <div className="text-xl font-bold">{comparisonData.peerGroup.size}</div>
                      <div className="text-sm text-muted-foreground">Total Peers</div>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <div className="text-xl font-bold">{comparisonData.peerGroup.averageExperience.toFixed(1)}</div>
                      <div className="text-sm text-muted-foreground">Avg Experience</div>
                    </div>
                  </div>
                  
                  <div className="text-center p-3 border rounded-lg">
                    <div className="text-xl font-bold">{comparisonData.peerGroup.averageRating.toFixed(1)}</div>
                    <div className="text-sm text-muted-foreground">Peer Group Average Rating</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4">
            {/* Detailed Performance Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Detailed Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {Object.entries(comparisonData.performanceComparison).map(([key, comparison]) => (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="font-medium capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                        <div className="flex items-center gap-2">
                          {getComparisonTrend(comparison.score, comparison.peerAverage) === 'up' ? (
                            <TrendingUp className="w-4 h-4 text-green-600" />
                          ) : getComparisonTrend(comparison.score, comparison.peerAverage) === 'down' ? (
                            <TrendingDown className="w-4 h-4 text-red-600" />
                          ) : (
                            <Activity className="w-4 h-4 text-gray-600" />
                          )}
                          <span className="text-sm text-muted-foreground">
                            #{comparison.ranking}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-muted-foreground">Your Score</div>
                          <div className="flex items-center gap-2">
                            <Progress value={comparison.score} className="flex-1" />
                            <span className="text-sm font-medium">{comparison.score.toFixed(1)}</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Peer Average</div>
                          <div className="flex items-center gap-2">
                            <Progress value={comparison.peerAverage} className="flex-1" />
                            <span className="text-sm font-medium">{comparison.peerAverage.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        {comparison.score > comparison.peerAverage ? (
                          <span className="text-green-600">
                            {((comparison.score - comparison.peerAverage) / comparison.peerAverage * 100).toFixed(1)}% above average
                          </span>
                        ) : (
                          <span className="text-red-600">
                            {((comparison.peerAverage - comparison.score) / comparison.peerAverage * 100).toFixed(1)}% below average
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Performance Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <AnalyticsChart
                  title="Performance Over Time"
                  data={[
                    { month: 'Jan', teacher: 85, peerAverage: 82 },
                    { month: 'Feb', teacher: 87, peerAverage: 83 },
                    { month: 'Mar', teacher: 88, peerAverage: 84 },
                    { month: 'Apr', teacher: 86, peerAverage: 85 },
                    { month: 'May', teacher: 89, peerAverage: 85 },
                    { month: 'Jun', teacher: 90, peerAverage: 86 }
                  ]}
                  type="line"
                  dataKey={["teacher", "peerAverage"]}
                  xAxisKey="month"
                  height={300}
                  colors={["#3b82f6", "#f59e0b"]}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Strengths Tab */}
        <TabsContent value="strengths" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Strength Areas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Strength Areas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {comparisonData.strengthAreas.map((strength, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                        <span className="font-medium">{strength}</span>
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Strength
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Competitive Advantages */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-blue-600" />
                  Competitive Advantages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {comparisonData.competitiveAdvantages.map((advantage, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Zap className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="font-medium">{advantage}</span>
                      </div>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        Advantage
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Strength Analysis Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Strength Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <AnalyticsChart
                title="Top Performing Areas"
                data={[
                  { area: 'Student Satisfaction', score: 95, benchmark: 85 },
                  { area: 'Punctuality', score: 98, benchmark: 90 },
                  { area: 'Communication', score: 92, benchmark: 82 },
                  { area: 'Preparation', score: 88, benchmark: 85 }
                ]}
                type="bar"
                dataKey={["score", "benchmark"]}
                xAxisKey="area"
                height={300}
                colors={["#22c55e", "#f59e0b"]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Improvement Tab */}
        <TabsContent value="improvement" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Improvement Areas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-orange-600" />
                  Improvement Areas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {comparisonData.improvementAreas.map((area, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                          <Target className="w-4 h-4 text-orange-600" />
                        </div>
                        <span className="font-medium">{area}</span>
                      </div>
                      <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                        Improve
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Development Needs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Development Needs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {comparisonData.developmentNeeds.map((need, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                        </div>
                        <span className="font-medium">{need}</span>
                      </div>
                      <Badge variant="secondary" className="bg-red-100 text-red-800">
                        Priority
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Improvement Action Plan */}
          <Card>
            <CardHeader>
              <CardTitle>Improvement Action Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teacherMetrics.recommendations.slice(0, 3).map((rec, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-medium">{rec.title}</div>
                        <div className="text-sm text-muted-foreground">{rec.description}</div>
                      </div>
                      <Badge variant="outline" className={
                        rec.priority === 'high' ? 'border-red-200 text-red-800' :
                        rec.priority === 'medium' ? 'border-yellow-200 text-yellow-800' :
                        'border-blue-200 text-blue-800'
                      }>
                        {rec.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Expected Impact: {(rec.expectedImpact * 100).toFixed(0)}%
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Timeline: {rec.implementationTimeframe}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ranking Tab */}
        <TabsContent value="ranking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ranking Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-6 border rounded-lg">
                  <div className="flex items-center justify-center mb-3">
                    {getRankingIcon(comparisonData.ranking.overall)}
                  </div>
                  <div className="text-3xl font-bold">{comparisonData.ranking.overall}</div>
                  <div className="text-sm text-muted-foreground">Overall Ranking</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    out of {comparisonData.ranking.outOfTotal} teachers
                  </div>
                </div>
                
                <div className="text-center p-6 border rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">{comparisonData.ranking.percentile}%</div>
                  <div className="text-sm text-muted-foreground">Percentile</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Better than {comparisonData.ranking.percentile}% of peers
                  </div>
                </div>
                
                <div className="text-center p-6 border rounded-lg">
                  <div className="text-3xl font-bold text-green-600">
                    {comparisonData.ranking.percentile >= 80 ? 'A' :
                     comparisonData.ranking.percentile >= 60 ? 'B' :
                     comparisonData.ranking.percentile >= 40 ? 'C' :
                     comparisonData.ranking.percentile >= 20 ? 'D' : 'F'}
                  </div>
                  <div className="text-sm text-muted-foreground">Grade</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Performance grade
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ranking by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Category Rankings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(comparisonData.performanceComparison).map(([category, data]) => (
                  <div key={category} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold">#{data.ranking}</span>
                      </div>
                      <div>
                        <div className="font-medium capitalize">
                          {category.replace(/([A-Z])/g, ' $1').trim()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Score: {data.score.toFixed(1)} (Avg: {data.peerAverage.toFixed(1)})
                        </div>
                      </div>
                    </div>
                    <Badge variant={data.ranking <= 3 ? 'default' : 'secondary'}>
                      {data.ranking <= 3 ? 'Top Performer' : 'Average'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}