"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { StudentDashboardLayoutPresentation } from './StudentDashboardLayoutPresentation';
import { authService } from '@/lib/services/auth-service';
import { studentService } from '@/lib/services/student-service';
import type { Student } from '@/types/student';

interface StudentDashboardLayoutContainerProps {
  children: React.ReactNode;
  initialStudent?: Student | null;
  breadcrumbs?: string[];
}

/**
 * Container component for Student Dashboard Layout
 * Handles all business logic, data fetching, and state management
 */
export const StudentDashboardLayoutContainer: React.FC<StudentDashboardLayoutContainerProps> = ({
  children,
  initialStudent,
  breadcrumbs = [],
}) => {
  const [student, setStudent] = useState<Student | null>(initialStudent || null);
  const [isLoading, setIsLoading] = useState(!initialStudent);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    if (!initialStudent) {
      loadStudentData();
    }
    loadNotifications();
  }, [initialStudent]);

  const loadStudentData = useCallback(async () => {
    try {
      setIsLoading(true);
      const user = await authService.getCurrentUser();
      
      if (user) {
        const studentData = await studentService.getByUserId(user.id);
        setStudent(studentData);
      }
    } catch (error) {
      console.error('Failed to load student data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      // Mock notification count - replace with actual service call
      setNotifications(3);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await authService.signOut();
      // Redirect will be handled by the auth service
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  }, []);

  const handleNotificationClick = useCallback(() => {
    // Handle notification click - could open a drawer or navigate
    console.log('Notifications clicked');
  }, []);

  const handleThemeToggle = useCallback(() => {
    setIsDarkMode(prev => !prev);
    // Apply theme changes to document
    document.documentElement.classList.toggle('dark', !isDarkMode);
  }, [isDarkMode]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    // Implement search logic
    console.log('Search query:', query);
  }, []);

  const handleMobileMenuToggle = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  const handleMobileMenuClose = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const getStudentWithNotifications = useCallback((): Student | null => {
    if (!student) return null;
    
    return {
      ...student,
      notifications,
      nextClass: student.nextClass || new Date(Date.now() + 86400000).toISOString(), // Mock next class
      progress: student.progress || 65, // Mock progress
      upcomingAssignments: 2, // Mock assignments
    };
  }, [student, notifications]);

  return (
    <StudentDashboardLayoutPresentation
      student={getStudentWithNotifications()}
      children={children}
      isLoading={isLoading}
      breadcrumbs={breadcrumbs}
      isMobileMenuOpen={isMobileMenuOpen}
      searchQuery={searchQuery}
      isDarkMode={isDarkMode}
      pathname={pathname}
      onLogout={handleLogout}
      onNotificationClick={handleNotificationClick}
      onThemeToggle={handleThemeToggle}
      onSearch={handleSearch}
      onMobileMenuToggle={handleMobileMenuToggle}
      onMobileMenuClose={handleMobileMenuClose}
    />
  );
};

StudentDashboardLayoutContainer.displayName = 'StudentDashboardLayoutContainer';