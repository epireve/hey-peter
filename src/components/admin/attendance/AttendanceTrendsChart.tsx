'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  attendanceAnalyticsService, 
  AttendanceFilters, 
  AttendanceTrendData 
} from '@/lib/services/attendance-analytics-service';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, BarChart3, PieChart as PieChartIcon } from 'lucide-react';

interface AttendanceTrendsChartProps {
  filters: AttendanceFilters;
}

type ChartType = 'line' | 'bar' | 'pie';

export function AttendanceTrendsChart({ filters }: AttendanceTrendsChartProps) {
  const [loading, setLoading] = useState(false);
  const [trendsData, setTrendsData] = useState<AttendanceTrendData[]>([]);
  const [chartType, setChartType] = useState<ChartType>('line');

  useEffect(() => {
    loadTrendsData();
  }, [filters]);

  const loadTrendsData = async () => {
    try {
      setLoading(true);
      const trends = await attendanceAnalyticsService.getAttendanceTrends(filters);
      setTrendsData(trends);
    } catch (error) {
      console.error('Error loading trends data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTooltip = (value: any, name: string) => {
    if (name === 'attendanceRate') {
      return [`${value.toFixed(1)}%`, 'Attendance Rate'];
    }
    return [value, name];
  };

  const formatXAxisLabel = (tickItem: string) => {
    const data = trendsData.find(d => d.date === tickItem);
    return data ? data.period : tickItem;
  };

  // Prepare data for pie chart (aggregate totals)
  const pieData = trendsData.length > 0 ? [
    {
      name: 'Present',
      value: trendsData.reduce((sum, d) => sum + d.attendedSessions, 0),
      color: '#10b981'
    },
    {
      name: 'Absent',
      value: trendsData.reduce((sum, d) => sum + d.absentSessions, 0),
      color: '#ef4444'
    },
    {
      name: 'Late',
      value: trendsData.reduce((sum, d) => sum + d.lateSessions, 0),
      color: '#f59e0b'
    },
    {
      name: 'Excused',
      value: trendsData.reduce((sum, d) => sum + d.excusedSessions, 0),
      color: '#3b82f6'
    }
  ] : [];

  const renderChart = () => {
    if (loading) {
      return <Skeleton className="h-80 w-full" />;
    }

    if (trendsData.length === 0) {
      return (
        <div className="flex items-center justify-center h-80">
          <p className="text-muted-foreground">No trends data available</p>
        </div>
      );
    }

    switch (chartType) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={trendsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatXAxisLabel}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip 
                formatter={formatTooltip}
                labelFormatter={(label) => {
                  const data = trendsData.find(d => d.date === label);
                  return data ? data.period : label;
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="attendanceRate" 
                stroke="#10b981" 
                strokeWidth={3}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                name="Attendance Rate (%)"
              />
              <Line 
                type="monotone" 
                dataKey="totalSessions" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                name="Total Sessions"
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={trendsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatXAxisLabel}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip 
                formatter={formatTooltip}
                labelFormatter={(label) => {
                  const data = trendsData.find(d => d.date === label);
                  return data ? data.period : label;
                }}
              />
              <Legend />
              <Bar dataKey="attendedSessions" fill="#10b981" name="Present" />
              <Bar dataKey="absentSessions" fill="#ef4444" name="Absent" />
              <Bar dataKey="lateSessions" fill="#f59e0b" name="Late" />
              <Bar dataKey="excusedSessions" fill="#3b82f6" name="Excused" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [value, 'Sessions']} />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Attendance Trends
              </CardTitle>
              <CardDescription>
                Visual representation of attendance patterns over time
              </CardDescription>
            </div>
            <Select value={chartType} onValueChange={(value: ChartType) => setChartType(value)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Chart type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Line
                  </div>
                </SelectItem>
                <SelectItem value="bar">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Bar
                  </div>
                </SelectItem>
                <SelectItem value="pie">
                  <div className="flex items-center gap-2">
                    <PieChartIcon className="h-4 w-4" />
                    Pie
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {renderChart()}
        </CardContent>
      </Card>

      {/* Trends Summary */}
      {trendsData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Trends Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {(trendsData.reduce((sum, d) => sum + d.attendanceRate, 0) / trendsData.length).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Average Attendance Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {trendsData.reduce((sum, d) => sum + d.totalSessions, 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Total Sessions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {trendsData.reduce((sum, d) => sum + d.attendedSessions, 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Sessions Attended</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {trendsData.reduce((sum, d) => sum + d.absentSessions, 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Sessions Missed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}