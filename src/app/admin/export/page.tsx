"use client";

import React, { useState, useEffect } from 'react';
import { ExportDashboard } from '@/components/admin/export';
import { analyticsAggregationService } from '@/lib/services/analytics-aggregation-service';

export default function ExportPage() {
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState({
    studentData: [],
    teacherData: [],
    financialData: [],
    attendanceData: [],
    performanceData: []
  });

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Generate sample data for demonstration
      const sampleStudentData = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        name: `Student ${i + 1}`,
        email: `student${i + 1}@example.com`,
        course: ['Basic English', 'Everyday A/B', 'Speak Up', 'Business English'][i % 4],
        enrollment_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        progress: Math.floor(Math.random() * 100),
        attendance: Math.floor(Math.random() * 100),
        test_score: Math.floor(Math.random() * 100),
        status: ['Active', 'Inactive', 'Graduated'][i % 3],
        created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
      }));

      const sampleTeacherData = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        name: `Teacher ${i + 1}`,
        email: `teacher${i + 1}@example.com`,
        specialization: ['Speaking', 'Grammar', 'Writing', 'Listening'][i % 4],
        classes_taught: Math.floor(Math.random() * 20) + 5,
        student_satisfaction: Math.floor(Math.random() * 40) + 60,
        attendance_rate: Math.floor(Math.random() * 30) + 70,
        performance_score: Math.floor(Math.random() * 40) + 60,
        hire_date: new Date(Date.now() - Math.random() * 1000 * 24 * 60 * 60 * 1000)
      }));

      const sampleFinancialData = Array.from({ length: 12 }, (_, i) => ({
        period: `2024-${String(i + 1).padStart(2, '0')}`,
        revenue: Math.floor(Math.random() * 50000) + 20000,
        expenses: Math.floor(Math.random() * 30000) + 15000,
        profit: 0, // Will be calculated
        student_count: Math.floor(Math.random() * 100) + 50,
        avg_revenue_per_student: 0, // Will be calculated
        course_revenue: {
          basic: Math.floor(Math.random() * 10000) + 5000,
          everyday: Math.floor(Math.random() * 15000) + 8000,
          speakup: Math.floor(Math.random() * 12000) + 6000,
          business: Math.floor(Math.random() * 20000) + 10000
        }
      }));

      // Calculate derived fields
      sampleFinancialData.forEach(item => {
        item.profit = item.revenue - item.expenses;
        item.avg_revenue_per_student = Math.round(item.revenue / item.student_count);
      });

      const sampleAttendanceData = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        total_scheduled: Math.floor(Math.random() * 50) + 20,
        attended: Math.floor(Math.random() * 45) + 15,
        no_shows: Math.floor(Math.random() * 10) + 2,
        cancelled: Math.floor(Math.random() * 5) + 1,
        attendance_rate: 0, // Will be calculated
        day_of_week: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i % 7]
      }));

      // Calculate attendance rates
      sampleAttendanceData.forEach(item => {
        item.attendance_rate = Math.round((item.attended / item.total_scheduled) * 100);
      });

      const samplePerformanceData = Array.from({ length: 100 }, (_, i) => ({
        student_id: i + 1,
        student_name: `Student ${i + 1}`,
        course: ['Basic English', 'Everyday A/B', 'Speak Up', 'Business English'][i % 4],
        test_date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
        test_type: ['Quiz', 'Midterm', 'Final', 'Speaking'][i % 4],
        score: Math.floor(Math.random() * 40) + 60,
        max_score: 100,
        percentage: 0, // Will be calculated
        grade: '', // Will be calculated
        teacher_id: Math.floor(Math.random() * 15) + 1
      }));

      // Calculate performance metrics
      samplePerformanceData.forEach(item => {
        item.percentage = Math.round((item.score / item.max_score) * 100);
        if (item.percentage >= 90) item.grade = 'A';
        else if (item.percentage >= 80) item.grade = 'B';
        else if (item.percentage >= 70) item.grade = 'C';
        else if (item.percentage >= 60) item.grade = 'D';
        else item.grade = 'F';
      });

      setAnalyticsData({
        studentData: sampleStudentData,
        teacherData: sampleTeacherData,
        financialData: sampleFinancialData,
        attendanceData: sampleAttendanceData,
        performanceData: samplePerformanceData
      });

    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading export dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <ExportDashboard
        studentData={analyticsData.studentData}
        teacherData={analyticsData.teacherData}
        financialData={analyticsData.financialData}
        attendanceData={analyticsData.attendanceData}
        performanceData={analyticsData.performanceData}
      />
    </div>
  );
}