"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  Calendar,
  User,
  TrendingUp,
  Clock,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  GraduationCap,
  MessageSquare,
  Search,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface Student {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  course?: string;
  level?: string;
  nextClass?: string;
  progress?: number;
  notifications?: number;
  upcomingAssignments?: number;
}

interface StudentDashboardLayoutProps {
  student: Student | null;
  children: React.ReactNode;
  isLoading?: boolean;
  breadcrumbs?: string[];
  onLogout?: () => void;
  onNotificationClick?: () => void;
  onThemeToggle?: () => void;
  onSearch?: (query: string) => void;
}

const navigationItems = [
  { name: 'Dashboard', href: '/student/dashboard', icon: Home },
  { name: 'My Courses', href: '/student/courses', icon: BookOpen },
  { name: 'Schedule', href: '/student/schedule', icon: Calendar },
  { name: 'Progress', href: '/student/progress', icon: TrendingUp },
  { name: 'Profile', href: '/student/profile', icon: User },
];

const quickActions = [
  { name: 'Book a Class', href: '/student/booking' },
  { name: 'View Schedule', href: '/student/schedule' },
  { name: 'Study Materials', href: '/student/materials' },
];

export function StudentDashboardLayout({
  student,
  children,
  isLoading = false,
  breadcrumbs = [],
  onLogout,
  onNotificationClick,
  onThemeToggle,
  onSearch,
}: StudentDashboardLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const pathname = usePathname();

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  };

  const handleThemeToggle = () => {
    setIsDarkMode(!isDarkMode);
    onThemeToggle?.();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      }).replace(/\s/g, ' '), // Ensure consistent spacing
    };
  };

  const getWelcomeMessage = () => {
    if (!student) return 'Student Portal';
    if (student.progress === 0) return 'Welcome to HeyPeter Academy!';
    if (student.progress === 100) return 'Course Completed! 🎉';
    return `Welcome back, ${student.name}!`;
  };

  if (isLoading) {
    return (
      <div data-testid="dashboard-loading" className="flex h-screen">
        <div className="w-64 bg-card border-r p-4">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-32 w-full mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        data-testid="sidebar"
        className={cn(
          "w-64 bg-card border-r flex flex-col responsive-sidebar",
          "lg:translate-x-0 transition-transform duration-300 ease-in-out",
          "lg:static absolute inset-y-0 left-0 z-50",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo/Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">HeyPeter</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={closeMobileMenu}
              className="lg:hidden"
              data-testid="close-menu-button"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Student Info */}
        {student && (
          <div className="p-4 border-b">
            <div className="flex items-center gap-3 mb-3">
              <Avatar>
                <AvatarImage src={student.avatar} alt={student.name} />
                <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{student.name}</p>
                <p className="text-sm text-muted-foreground truncate">{student.email}</p>
              </div>
            </div>
            {student.course && student.level && (
              <p className="text-sm text-muted-foreground mb-2">
                {student.course} - {student.level}
              </p>
            )}
            {student.progress !== undefined && (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Course Progress</span>
                  <span>{student.progress}%</span>
                </div>
                <Progress value={student.progress} className="h-2" />
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus:bg-accent focus:text-accent-foreground focus:outline-none",
                      isActive && "bg-accent text-accent-foreground active"
                    )}
                    onClick={closeMobileMenu}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        const nextLink = e.currentTarget.parentElement?.nextElementSibling?.querySelector('a');
                        if (nextLink) {
                          (nextLink as HTMLElement).focus();
                        }
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        const prevLink = e.currentTarget.parentElement?.previousElementSibling?.querySelector('a');
                        if (prevLink) {
                          (prevLink as HTMLElement).focus();
                        }
                      }
                    }}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t space-y-2">
          <Link href="/student/settings" className="block">
            <Button
              variant="ghost"
              className="w-full justify-start"
            >
              <Settings className="h-4 w-4 mr-3" />
              Settings
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={onLogout}
          >
            <LogOut className="h-4 w-4 mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMobileMenu}
                className="lg:hidden"
                data-testid="mobile-menu-button"
              >
                <Menu className="h-4 w-4" />
              </Button>
              
              <div>
                <h1 className="text-2xl font-bold">{getWelcomeMessage()}</h1>
                {breadcrumbs.length > 0 && (
                  <nav className="flex space-x-2 text-sm text-muted-foreground mt-1">
                    {breadcrumbs.map((crumb, index) => (
                      <span key={index}>
                        {index > 0 && <span className="mx-2">/</span>}
                        {crumb}
                      </span>
                    ))}
                  </nav>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="hidden md:block">
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-64"
                />
              </div>

              {/* Notifications */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onNotificationClick}
                className="relative"
                data-testid="notification-button"
              >
                <Bell className="h-4 w-4" />
                {student?.notifications && student.notifications > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs notification-badge"
                  >
                    {student.notifications}
                  </Badge>
                )}
              </Button>

              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleThemeToggle}
                data-testid="theme-toggle"
              >
                {isDarkMode ? '☀️' : '🌙'}
              </Button>
            </div>
          </div>
        </header>

        {/* Dashboard Overview Cards */}
        {pathname === '/student/dashboard' && student && (
          <div className="p-6 border-b bg-muted/30">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Next Class */}
              {student.nextClass && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Next Class
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-semibold">
                      {formatDate(student.nextClass).date}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(student.nextClass).time}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick Actions */}
              {quickActions.map((action) => (
                <Card key={action.name} className="cursor-pointer hover:bg-accent transition-colors">
                  <CardContent className="p-4">
                    <Link href={action.href} className="block">
                      <div className="text-sm font-medium">{action.name}</div>
                    </Link>
                  </CardContent>
                </Card>
              ))}

              {/* Upcoming Assignments */}
              {student.upcomingAssignments && student.upcomingAssignments > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Assignments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg font-semibold">{student.upcomingAssignments}</div>
                    <div className="text-sm text-muted-foreground">upcoming assignments</div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main 
          data-testid="main-content" 
          className="flex-1 overflow-auto p-6 responsive-content"
        >
          <div 
            data-testid="mobile-menu"
            className={cn("mobile-menu", isMobileMenuOpen && "open")}
            style={{ display: 'none' }}
          />
          {children}
        </main>
      </div>
    </div>
  );
}