"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';

// Simple data types
interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  newStudentsThisMonth: number;
}

interface DashboardProps {
  className?: string;
}

// Custom hook for dashboard data - keeps logic separate but simple
const useDashboardData = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    newStudentsThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Simple mock data load - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStats({
        totalStudents: 150,
        totalTeachers: 12,
        totalClasses: 45,
        newStudentsThisMonth: 8,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return { stats, loading, error, reload: loadData };
};

// Simple stats card component
const StatsCard: React.FC<{ title: string; value: number; description?: string }> = ({ 
  title, 
  value, 
  description 
}) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </CardContent>
  </Card>
);

// Loading skeleton
const DashboardSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-8 w-64" />
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-4 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

// Error state
const ErrorState: React.FC<{ error: string; onRetry: () => void }> = ({ error, onRetry }) => (
  <div className="space-y-6">
    <Card>
      <CardContent className="pt-6">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={onRetry} variant="outline">
            Try Again
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

// Main simplified dashboard component
export const SimpleDashboard: React.FC<DashboardProps> = ({ className }) => {
  const { stats, loading, error, reload } = useDashboardData();

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={reload} />;
  }

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's an overview of your academy.
          </p>
        </div>
        <Button onClick={reload} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Students"
          value={stats.totalStudents}
          description="Enrolled students"
        />
        <StatsCard
          title="Total Teachers"
          value={stats.totalTeachers}
          description="Active instructors"
        />
        <StatsCard
          title="Active Classes"
          value={stats.totalClasses}
          description="Ongoing classes"
        />
        <StatsCard
          title="New This Month"
          value={stats.newStudentsThisMonth}
          description="New enrollments"
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button size="sm">Add Student</Button>
            <Button size="sm" variant="outline">Add Teacher</Button>
            <Button size="sm" variant="outline">Schedule Class</Button>
            <Button size="sm" variant="outline">View Reports</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleDashboard;
