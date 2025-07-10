'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Home,
  Clock,
  Calendar,
  Users,
  GraduationCap,
  DollarSign,
  BarChart3,
  Menu,
  X,
  Search,
  Bell,
  LogOut,
  CheckCircle,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

interface Notifications {
  pendingClasses?: number;
  unreadMessages?: number;
  total?: number;
}

interface TeacherDashboardLayoutProps {
  user: User;
  children: React.ReactNode;
  notifications?: Notifications;
  isLoading?: boolean;
  error?: string;
}

const navigationItems = [
  { name: 'Dashboard', href: '/teacher', icon: Home },
  { name: 'Class Hours', href: '/teacher/hours', icon: Clock },
  { name: 'Schedule', href: '/teacher/schedule', icon: Calendar },
  { name: 'My Classes', href: '/teacher/classes', icon: Users },
  { name: 'Students', href: '/teacher/students', icon: GraduationCap },
  { name: 'Availability', href: '/teacher/availability', icon: Clock },
  { name: 'Compensation', href: '/teacher/compensation', icon: DollarSign },
  { name: 'Analytics', href: '/teacher/analytics', icon: BarChart3 },
];

export function TeacherDashboardLayout({
  user,
  children,
  notifications,
  isLoading,
  error,
}: TeacherDashboardLayoutProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Get user initials for avatar
  const initials = user.full_name
    .split(' ')
    .map((name) => name[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Generate breadcrumb from pathname
  const breadcrumbItems = pathname
    .split('/')
    .filter(Boolean)
    .map((segment, index, arr) => {
      const href = '/' + arr.slice(0, index + 1).join('/');
      const name = segment
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      return { name, href };
    });

  if (isLoading) {
    return (
      <div data-testid="layout-skeleton" className="min-h-screen bg-gray-50">
        <div className="flex h-screen">
          <div className="hidden md:flex md:w-64 md:flex-col">
            <div className="flex flex-col flex-grow pt-5 overflow-y-auto bg-white border-r">
              <Skeleton className="h-8 w-48 mx-4 mb-8" />
              <div className="space-y-2 px-2">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </div>
          </div>
          <div className="flex-1">
            <Skeleton className="h-16 w-full" />
            <div className="p-6">
              <Skeleton className="h-96 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Alert variant="destructive" role="alert">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div
          className={cn(
            'fixed inset-y-0 left-0 z-50 w-64 transform bg-white transition-transform duration-300 ease-in-out md:relative md:translate-x-0',
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <nav
            className="flex flex-col flex-grow pt-5 overflow-y-auto bg-white border-r"
            aria-label="Teacher navigation"
          >
            {/* Logo/Brand */}
            <div className="flex items-center justify-between flex-shrink-0 px-4">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">HeyPeter Academy</h1>
                <p className="text-sm text-gray-600">Teacher Portal</p>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="md:hidden"
                aria-label="Close sidebar"
              >
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>

            {/* Navigation Items */}
            <div className="mt-8 flex-grow flex flex-col">
              <nav className="flex-1 px-2 pb-4 space-y-1">
                {navigationItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  const hasNotification =
                    item.name === 'My Classes' && notifications?.pendingClasses;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'group flex items-center px-2 py-2 text-sm font-medium rounded-md relative',
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )}
                    >
                      <Icon
                        className={cn(
                          'mr-3 h-5 w-5',
                          isActive ? 'text-blue-500' : 'text-gray-400'
                        )}
                      />
                      {item.name}
                      {hasNotification && (
                        <Badge className="ml-auto bg-red-500 text-white">
                          {notifications.pendingClasses}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* User Profile Section */}
            <div className="flex-shrink-0 p-4 border-t">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium">
                    {initials}
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">{user.full_name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                  <p className="text-xs text-gray-500">Teacher</p>
                </div>
              </div>
            </div>
          </nav>
        </div>

        {/* Mobile menu overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="relative z-10 flex-shrink-0 flex h-16 bg-white shadow">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="px-4 border-r border-gray-200 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 md:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="flex-1 px-4 flex justify-between">
              {/* Breadcrumb */}
              <div className="flex items-center">
                <nav className="flex" aria-label="Breadcrumb">
                  {breadcrumbItems.map((item, index) => (
                    <div key={item.href} className="flex items-center">
                      {index > 0 && <ChevronRight className="h-4 w-4 text-gray-400 mx-2" />}
                      <Link
                        href={item.href}
                        className={cn(
                          'text-sm',
                          index === breadcrumbItems.length - 1
                            ? 'font-medium text-gray-900'
                            : 'text-gray-500 hover:text-gray-700'
                        )}
                      >
                        {item.name}
                      </Link>
                    </div>
                  ))}
                </nav>
              </div>

              <div className="ml-4 flex items-center gap-4">
                {/* Search */}
                <div className="relative w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <Input
                    type="search"
                    placeholder="Search classes, students..."
                    className="pl-10"
                    role="search"
                  />
                </div>

                {/* Quick Actions */}
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark Attendance
                  </Button>
                  <Button variant="ghost" size="sm">
                    Create Announcement
                  </Button>
                  <Button variant="ghost" size="sm">
                    View Today's Schedule
                  </Button>
                </div>

                {/* Notifications */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {notifications?.total && notifications.total > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                      {notifications.total}
                    </span>
                  )}
                </Button>

                {/* Sign Out */}
                <form action="/auth/logout" method="post">
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon"
                    aria-label="Sign out"
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </form>
              </div>
            </div>
          </header>

          {/* Main content area */}
          <main className="flex-1 relative overflow-y-auto focus:outline-none" role="main">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">{children}</div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}