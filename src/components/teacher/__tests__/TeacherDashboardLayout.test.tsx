import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeacherDashboardLayout } from '../TeacherDashboardLayout';
import { usePathname } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

describe('TeacherDashboardLayout', () => {
  const mockUser = {
    id: '123',
    email: 'teacher@example.com',
    full_name: 'John Doe',
    role: 'teacher',
  };

  const defaultProps = {
    user: mockUser,
    children: <div>Test Content</div>,
  };

  beforeEach(() => {
    (usePathname as jest.Mock).mockReturnValue('/teacher');
  });

  describe('Layout Structure', () => {
    it('should render the layout with sidebar and main content area', () => {
      render(<TeacherDashboardLayout {...defaultProps} />);
      
      // Check for main layout structure
      expect(screen.getByRole('navigation', { name: /teacher navigation/i })).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should display the teacher portal branding', () => {
      render(<TeacherDashboardLayout {...defaultProps} />);
      
      expect(screen.getByText('HeyPeter Academy')).toBeInTheDocument();
      expect(screen.getByText('Teacher Portal')).toBeInTheDocument();
    });
  });

  describe('Navigation Items', () => {
    const navigationItems = [
      { name: 'Dashboard', href: '/teacher', icon: 'home' },
      { name: 'Class Hours', href: '/teacher/hours', icon: 'clock' },
      { name: 'Schedule', href: '/teacher/schedule', icon: 'calendar' },
      { name: 'My Classes', href: '/teacher/classes', icon: 'users' },
      { name: 'Students', href: '/teacher/students', icon: 'academic-cap' },
      { name: 'Availability', href: '/teacher/availability', icon: 'clock' },
      { name: 'Compensation', href: '/teacher/compensation', icon: 'currency-dollar' },
      { name: 'Analytics', href: '/teacher/analytics', icon: 'chart-bar' },
    ];

    it('should render all navigation items', () => {
      render(<TeacherDashboardLayout {...defaultProps} />);
      const nav = screen.getByRole('navigation', { name: /teacher navigation/i });
      
      navigationItems.forEach(item => {
        const link = within(nav).getByRole('link', { name: new RegExp(item.name, 'i') });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', item.href);
      });
    });

    it('should highlight the active navigation item', () => {
      (usePathname as jest.Mock).mockReturnValue('/teacher/schedule');
      render(<TeacherDashboardLayout {...defaultProps} />);
      
      const nav = screen.getByRole('navigation', { name: /teacher navigation/i });
      const scheduleLink = within(nav).getByRole('link', { name: /schedule/i });
      expect(scheduleLink).toHaveClass('bg-blue-50', 'text-blue-700');
      
      const dashboardLink = within(nav).getByRole('link', { name: /dashboard/i });
      expect(dashboardLink).not.toHaveClass('bg-blue-50', 'text-blue-700');
    });

    it('should show notification badge for pending items', () => {
      const propsWithNotifications = {
        ...defaultProps,
        notifications: {
          pendingClasses: 3,
          unreadMessages: 5,
        },
      };
      
      render(<TeacherDashboardLayout {...propsWithNotifications} />);
      
      const classesLink = screen.getByRole('link', { name: /my classes/i });
      const badge = within(classesLink).getByText('3');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-red-500');
    });
  });

  describe('User Profile Section', () => {
    it('should display user information', () => {
      render(<TeacherDashboardLayout {...defaultProps} />);
      
      expect(screen.getByText(mockUser.full_name)).toBeInTheDocument();
      expect(screen.getByText(mockUser.email)).toBeInTheDocument();
      // There are multiple "Teacher" texts (in breadcrumb and profile), so use getAllByText
      const teacherTexts = screen.getAllByText('Teacher');
      expect(teacherTexts.length).toBeGreaterThan(0);
    });

    it('should show user avatar with initials', () => {
      render(<TeacherDashboardLayout {...defaultProps} />);
      
      const avatar = screen.getByText('JD');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveClass('bg-blue-500');
    });

    it('should display logout button', () => {
      render(<TeacherDashboardLayout {...defaultProps} />);
      
      const logoutButton = screen.getByRole('button', { name: /sign out/i });
      expect(logoutButton).toBeInTheDocument();
    });
  });

  describe('Header Section', () => {
    it('should render header with search bar', () => {
      render(<TeacherDashboardLayout {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText(/search classes, students/i);
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('type', 'search');
    });

    it('should display notifications bell with count', () => {
      const propsWithNotifications = {
        ...defaultProps,
        notifications: {
          total: 8,
        },
      };
      
      render(<TeacherDashboardLayout {...propsWithNotifications} />);
      
      const notificationButton = screen.getByRole('button', { name: /notifications/i });
      expect(notificationButton).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
    });

    it('should show breadcrumb navigation', () => {
      (usePathname as jest.Mock).mockReturnValue('/teacher/classes/math-101');
      render(<TeacherDashboardLayout {...defaultProps} />);
      
      // Check breadcrumb structure
      const teacherBreadcrumb = screen.getByRole('link', { name: 'Teacher' });
      expect(teacherBreadcrumb).toBeInTheDocument();
      expect(teacherBreadcrumb).toHaveAttribute('href', '/teacher');
      
      const classesBreadcrumb = screen.getByRole('link', { name: 'Classes' });
      expect(classesBreadcrumb).toBeInTheDocument();
      expect(classesBreadcrumb).toHaveAttribute('href', '/teacher/classes');
      
      expect(screen.getByText('Math 101')).toBeInTheDocument();
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should show mobile menu button on small screens', () => {
      render(<TeacherDashboardLayout {...defaultProps} />);
      
      const mobileMenuButton = screen.getByRole('button', { name: /open sidebar/i });
      expect(mobileMenuButton).toBeInTheDocument();
      expect(mobileMenuButton).toHaveClass('md:hidden');
    });

    it('should toggle mobile menu when button is clicked', async () => {
      const user = userEvent.setup();
      render(<TeacherDashboardLayout {...defaultProps} />);
      
      const mobileMenuButton = screen.getByRole('button', { name: /open sidebar/i });
      const sidebar = screen.getByRole('navigation', { name: /teacher navigation/i });
      
      // Initially hidden on mobile
      expect(sidebar.parentElement).toHaveClass('-translate-x-full');
      
      // Click to open
      await user.click(mobileMenuButton);
      expect(sidebar.parentElement).toHaveClass('translate-x-0');
      
      // Click close button in sidebar
      const closeButton = screen.getByRole('button', { name: /close sidebar/i });
      await user.click(closeButton);
      expect(sidebar.parentElement).toHaveClass('-translate-x-full');
    });
  });

  describe('Quick Actions', () => {
    it('should render quick action buttons', () => {
      render(<TeacherDashboardLayout {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /mark attendance/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create announcement/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /view today's schedule/i })).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading skeleton when data is loading', () => {
      const propsWithLoading = {
        ...defaultProps,
        isLoading: true,
      };
      
      render(<TeacherDashboardLayout {...propsWithLoading} />);
      
      expect(screen.getByTestId('layout-skeleton')).toBeInTheDocument();
      expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('should display error message when there is an error', () => {
      const propsWithError = {
        ...defaultProps,
        error: 'Failed to load teacher data',
      };
      
      render(<TeacherDashboardLayout {...propsWithError} />);
      
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/failed to load teacher data/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<TeacherDashboardLayout {...defaultProps} />);
      
      expect(screen.getByRole('navigation', { name: /teacher navigation/i })).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('search')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<TeacherDashboardLayout {...defaultProps} />);
      
      const nav = screen.getByRole('navigation', { name: /teacher navigation/i });
      const firstNavLink = within(nav).getByRole('link', { name: /dashboard/i });
      const secondNavLink = within(nav).getByRole('link', { name: /class hours/i });
      
      // Focus on the first nav link
      firstNavLink.focus();
      expect(firstNavLink).toHaveFocus();
      
      // Tab to second link
      await user.tab();
      expect(secondNavLink).toHaveFocus();
    });
  });
});