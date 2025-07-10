'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Users, 
  Award,
  Download,
  Eye,
  CheckCircle,
  AlertTriangle,
  Plus
} from 'lucide-react';
import { teacherHourTrackingService } from '@/lib/services';
import { 
  TeacherHourSummary, 
  TeacherHoursWithDetails,
  TeacherCompensationRule 
} from '@/types/hour-management';

interface TeacherHourDashboardProps {
  teacherId: string;
  onAddManualEntry?: () => void;
  onViewDetails?: (hourId: string) => void;
}

export function TeacherHourDashboard({ 
  teacherId, 
  onAddManualEntry, 
  onViewDetails 
}: TeacherHourDashboardProps) {
  const [summary, setSummary] = useState<TeacherHourSummary | null>(null);
  const [pendingHours, setPendingHours] = useState<TeacherHoursWithDetails[]>([]);
  const [compensationRules, setCompensationRules] = useState<TeacherCompensationRule[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'pending' | 'analytics'>('overview');

  useEffect(() => {
    loadDashboardData();
  }, [teacherId]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [summaryResponse, pendingResponse, rulesResponse, analyticsResponse] = await Promise.all([
        teacherHourTrackingService.getTeacherHourSummary(teacherId),
        teacherHourTrackingService.getPendingCompensation(teacherId),
        teacherHourTrackingService.getTeacherCompensationRules(teacherId),
        teacherHourTrackingService.getTeacherPerformanceAnalytics(teacherId)
      ]);
      
      if (summaryResponse.success && summaryResponse.data) {
        setSummary(summaryResponse.data);
      }
      
      if (pendingResponse.success && pendingResponse.data) {
        setPendingHours(pendingResponse.data);
      }
      
      if (rulesResponse.success && rulesResponse.data) {
        setCompensationRules(rulesResponse.data);
      }
      
      if (analyticsResponse.success && analyticsResponse.data) {
        setAnalytics(analyticsResponse.data);
      }
      
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatHours = (hours: number) => {
    return hours.toFixed(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCompensationTypeIcon = (type: string) => {
    switch (type) {
      case 'overtime':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'holiday':
        return <Calendar className="h-4 w-4 text-purple-500" />;
      case 'substitute':
        return <Users className="h-4 w-4 text-blue-500" />;
      case 'bonus':
        return <Award className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary' as const,
      approved: 'default' as const,
      paid: 'outline' as const,
      disputed: 'destructive' as const
    };
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const exportPendingHours = () => {
    if (pendingHours.length === 0) return;
    
    const csvContent = [
      ['Date', 'Hours', 'Compensation', 'Type', 'Class/Student'].join(','),
      ...pendingHours.map(hour => [
        hour.teaching_date,
        hour.hours_taught,
        hour.total_compensation,
        hour.compensation_type,
        hour.class?.class_name || hour.booking?.student?.full_name || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pending-hours-${teacherId}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <Clock className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Hours</p>
                  <p className="text-2xl font-bold">{formatHours(summary.total_hours_taught)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <DollarSign className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Earned</p>
                  <p className="text-2xl font-bold">{formatCurrency(summary.total_compensation_earned)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <TrendingUp className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg. Rate</p>
                  <p className="text-2xl font-bold">{formatCurrency(summary.average_hourly_rate)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <Calendar className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-sm font-medium text-gray-600">This Month</p>
                  <p className="text-2xl font-bold">{formatHours(summary.this_month_hours)}h</p>
                  <p className="text-sm text-gray-500">{formatCurrency(summary.this_month_compensation)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pending Compensation Alert */}
      {summary && summary.pending_compensation > 0 && (
        <Alert>
          <DollarSign className="h-4 w-4" />
          <AlertDescription>
            You have {formatCurrency(summary.pending_compensation)} in pending compensation 
            from {pendingHours.length} hour entries awaiting approval.
          </AlertDescription>
        </Alert>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1 border-b">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'pending', label: `Pending (${pendingHours.length})` },
          { id: 'analytics', label: 'Analytics' }
        ].map(tab => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab.id as any)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Compensation Rules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Award className="h-5 w-5 mr-2 text-yellow-500" />
                  Compensation Rules
                </span>
                {onAddManualEntry && (
                  <Button size="sm" onClick={onAddManualEntry}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Manual Entry
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {compensationRules.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No compensation rules set. Contact admin to set up your rates.
                </p>
              ) : (
                <div className="space-y-3">
                  {compensationRules.map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{rule.course_type}</p>
                        <p className="text-sm text-gray-600">
                          Base: {formatCurrency(rule.base_rate)}/hour
                          {rule.overtime_rate && ` • Overtime: ${formatCurrency(rule.overtime_rate)}/hour`}
                          {rule.holiday_rate && ` • Holiday: ${formatCurrency(rule.holiday_rate)}/hour`}
                        </p>
                      </div>
                      <Badge variant={rule.is_active ? 'default' : 'outline'}>
                        {rule.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Progress */}
          {analytics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-blue-500" />
                  Monthly Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Hours Target</span>
                      <span>{summary?.this_month_hours || 0} / 40 hours</span>
                    </div>
                    <Progress value={(summary?.this_month_hours || 0) / 40 * 100} className="h-2" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{formatHours(summary?.this_month_hours || 0)}</p>
                      <p className="text-sm text-gray-500">Hours This Month</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(summary?.this_month_compensation || 0)}</p>
                      <p className="text-sm text-gray-500">Earnings This Month</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Pending Tab */}
      {activeTab === 'pending' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Clock className="h-5 w-5 mr-2 text-orange-500" />
                Pending Hours ({pendingHours.length})
              </span>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={exportPendingHours}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingHours.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-500">No pending hours! All your work has been approved.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Class/Student</TableHead>
                      <TableHead>Compensation</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingHours.map((hour) => (
                      <TableRow key={hour.id}>
                        <TableCell>{formatDate(hour.teaching_date)}</TableCell>
                        <TableCell>
                          <span className="font-medium">{formatHours(hour.hours_taught)}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getCompensationTypeIcon(hour.compensation_type)}
                            <span className="capitalize">{hour.compensation_type}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            {hour.class ? (
                              <div>
                                <p className="font-medium text-blue-600">{hour.class.class_name}</p>
                                <p className="text-xs text-gray-500">{hour.class.courses?.course_type}</p>
                              </div>
                            ) : hour.booking ? (
                              <div>
                                <p className="font-medium text-purple-600">{hour.booking.student?.full_name}</p>
                                <p className="text-xs text-gray-500">1-on-1 Session</p>
                              </div>
                            ) : (
                              <span className="text-gray-500">Manual Entry</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{formatCurrency(hour.total_compensation)}</p>
                            <p className="text-xs text-gray-500">
                              @ {formatCurrency(hour.hourly_rate)}/hr
                              {hour.bonus_amount > 0 && ` + ${formatCurrency(hour.bonus_amount)} bonus`}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(hour.status)}</TableCell>
                        <TableCell>
                          {onViewDetails && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onViewDetails(hour.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
                Performance Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Compensation by Course Type */}
                <div>
                  <h4 className="font-medium mb-3">Compensation by Course Type</h4>
                  <div className="space-y-2">
                    {Object.entries(analytics.compensation_by_course_type).map(([courseType, amount]) => (
                      <div key={courseType} className="flex justify-between">
                        <span>{courseType}</span>
                        <span className="font-medium">{formatCurrency(amount as number)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Monthly Hours Trend */}
                <div>
                  <h4 className="font-medium mb-3">Monthly Hours</h4>
                  <div className="space-y-2">
                    {Object.entries(analytics.hours_by_month).map(([month, hours]) => (
                      <div key={month} className="flex justify-between">
                        <span>{new Date(month + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}</span>
                        <span className="font-medium">{formatHours(hours as number)} hrs</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{formatHours(analytics.total_hours)}</p>
                    <p className="text-sm text-gray-500">Total Hours Taught</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(analytics.total_compensation)}</p>
                    <p className="text-sm text-gray-500">Total Compensation</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{formatHours(analytics.average_hours_per_day)}</p>
                    <p className="text-sm text-gray-500">Avg Hours/Day</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default TeacherHourDashboard;