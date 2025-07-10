import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StudentDashboardLayout } from '../StudentDashboardLayout';

// Import the mocked navigation function to be able to manipulate it
import { usePathname } from 'next/navigation';

// Mock the icons
jest.mock('lucide-react', () => ({
  BookOpen: () => <div data-testid="book-open-icon">BookOpen</div>,
  Calendar: () => <div data-testid="calendar-icon">Calendar</div>,
  User: () => <div data-testid="user-icon">User</div>,
  TrendingUp: () => <div data-testid="trending-up-icon">TrendingUp</div>,
  Clock: () => <div data-testid="clock-icon">Clock</div>,
  Bell: () => <div data-testid="bell-icon">Bell</div>,
  Settings: () => <div data-testid="settings-icon">Settings</div>,
  LogOut: () => <div data-testid="logout-icon">LogOut</div>,
  Menu: () => <div data-testid="menu-icon">Menu</div>,
  X: () => <div data-testid="x-icon">X</div>,
  Home: () => <div data-testid="home-icon">Home</div>,
  GraduationCap: () => <div data-testid="graduation-cap-icon">GraduationCap</div>,
  MessageSquare: () => <div data-testid="message-square-icon">MessageSquare</div>,
}));

// Mock Next.js components
jest.mock('next/link', () => {
  return function MockLink({ children, href, ...props }: any) {
    return <a href={href} {...props}>{children}</a>;
  };
});

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => '/student/dashboard'),
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// Mock student data
const mockStudent = {
  id: 'student-123',
  name: 'John Doe',
  email: 'john.doe@example.com',
  avatar: 'https://example.com/avatar.jpg',
  course: 'Business English',
  level: 'Intermediate',
  nextClass: '2024-03-15T10:00:00Z',
  progress: 75,
  notifications: 3,
};

describe('StudentDashboardLayout', () => {
  const defaultProps = {
    student: mockStudent,
    children: <div data-testid="dashboard-content">Dashboard Content</div>,
  };

  it('should render student dashboard layout', () => {
    render(<StudentDashboardLayout {...defaultProps} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john.doe@example.com')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
  });

  it('should display student information in header', () => {
    render(<StudentDashboardLayout {...defaultProps} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Business English - Intermediate')).toBeInTheDocument();
  });

  it('should show navigation menu items', () => {
    render(<StudentDashboardLayout {...defaultProps} />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('My Courses')).toBeInTheDocument();
    expect(screen.getByText('Schedule')).toBeInTheDocument();
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('should display notification badge', () => {
    render(<StudentDashboardLayout {...defaultProps} />);
    
    const notificationBadge = screen.getByText('3');
    expect(notificationBadge).toBeInTheDocument();
    expect(notificationBadge).toHaveClass('notification-badge');
  });

  it('should show next class information', () => {
    // Ensure we're on the dashboard path for the overview cards to show
    (usePathname as jest.Mock).mockReturnValue('/student/dashboard');
    
    render(<StudentDashboardLayout {...defaultProps} />);
    
    expect(screen.getByText(/Next Class/i)).toBeInTheDocument();
    expect(screen.getByText(/Mar 15/i)).toBeInTheDocument();
    // Check for time without AM/PM for now, since the format might include different spacing
    expect(screen.getByText(/10:00/)).toBeInTheDocument();
  });

  it('should display progress indicator', () => {
    render(<StudentDashboardLayout {...defaultProps} />);
    
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText(/Course Progress/i)).toBeInTheDocument();
  });

  it('should handle mobile menu toggle', () => {
    render(<StudentDashboardLayout {...defaultProps} />);
    
    const menuButton = screen.getByTestId('mobile-menu-button');
    fireEvent.click(menuButton);
    
    expect(screen.getByTestId('mobile-menu')).toHaveClass('open');
  });

  it('should close mobile menu when close button is clicked', () => {
    render(<StudentDashboardLayout {...defaultProps} />);
    
    const menuButton = screen.getByTestId('mobile-menu-button');
    fireEvent.click(menuButton);
    
    const closeButton = screen.getByTestId('close-menu-button');
    fireEvent.click(closeButton);
    
    expect(screen.getByTestId('mobile-menu')).not.toHaveClass('open');
  });

  it('should highlight active navigation item', () => {
    render(<StudentDashboardLayout {...defaultProps} />);
    
    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    expect(dashboardLink).toHaveClass('active');
  });

  it('should display correct navigation icons', () => {
    render(<StudentDashboardLayout {...defaultProps} />);
    
    expect(screen.getByTestId('home-icon')).toBeInTheDocument();
    expect(screen.getByTestId('book-open-icon')).toBeInTheDocument();
    expect(screen.getByTestId('calendar-icon')).toBeInTheDocument();
    expect(screen.getByTestId('trending-up-icon')).toBeInTheDocument();
    expect(screen.getByTestId('user-icon')).toBeInTheDocument();
  });

  it('should show settings and logout options', () => {
    render(<StudentDashboardLayout {...defaultProps} />);
    
    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
    expect(screen.getByTestId('logout-icon')).toBeInTheDocument();
  });

  it('should handle logout action', () => {
    const mockOnLogout = jest.fn();
    render(<StudentDashboardLayout {...defaultProps} onLogout={mockOnLogout} />);
    
    const logoutButton = screen.getByRole('button', { name: /logout/i });
    fireEvent.click(logoutButton);
    
    expect(mockOnLogout).toHaveBeenCalled();
  });

  it('should display loading state', () => {
    render(<StudentDashboardLayout {...defaultProps} isLoading={true} />);
    
    expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
  });

  it('should handle missing student data gracefully', () => {
    render(<StudentDashboardLayout {...defaultProps} student={null} />);
    
    expect(screen.getByText('Student Portal')).toBeInTheDocument();
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });

  it('should show welcome message for new students', () => {
    const newStudent = { ...mockStudent, progress: 0 };
    render(<StudentDashboardLayout {...defaultProps} student={newStudent} />);
    
    expect(screen.getByText(/Welcome to HeyPeter Academy/i)).toBeInTheDocument();
  });

  it('should display course completion status', () => {
    const completedStudent = { ...mockStudent, progress: 100 };
    render(<StudentDashboardLayout {...defaultProps} student={completedStudent} />);
    
    expect(screen.getByText(/Course Completed/i)).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('should handle notification click', () => {
    const mockOnNotificationClick = jest.fn();
    render(<StudentDashboardLayout {...defaultProps} onNotificationClick={mockOnNotificationClick} />);
    
    const notificationButton = screen.getByTestId('notification-button');
    fireEvent.click(notificationButton);
    
    expect(mockOnNotificationClick).toHaveBeenCalled();
  });

  it('should support theme toggle', () => {
    const mockOnThemeToggle = jest.fn();
    render(<StudentDashboardLayout {...defaultProps} onThemeToggle={mockOnThemeToggle} />);
    
    const themeToggle = screen.getByTestId('theme-toggle');
    fireEvent.click(themeToggle);
    
    expect(mockOnThemeToggle).toHaveBeenCalled();
  });

  it('should display student avatar', () => {
    render(<StudentDashboardLayout {...defaultProps} />);
    
    // Avatar fallback should show first letter of name
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('should show breadcrumb navigation', () => {
    render(<StudentDashboardLayout {...defaultProps} breadcrumbs={['Home', 'Settings']} />);
    
    // Breadcrumbs are rendered as spans within the header
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('/')).toBeInTheDocument(); // The separator
  });

  it('should handle responsive layout', () => {
    render(<StudentDashboardLayout {...defaultProps} />);
    
    const sidebar = screen.getByTestId('sidebar');
    const mainContent = screen.getByTestId('main-content');
    
    expect(sidebar).toHaveClass('responsive-sidebar');
    expect(mainContent).toHaveClass('responsive-content');
  });

  it('should display quick actions', () => {
    (usePathname as jest.Mock).mockReturnValue('/student/dashboard');
    
    render(<StudentDashboardLayout {...defaultProps} />);
    
    expect(screen.getByText('Book a Class')).toBeInTheDocument();
    expect(screen.getByText('View Schedule')).toBeInTheDocument();
    expect(screen.getByText('Study Materials')).toBeInTheDocument();
  });

  it('should show upcoming assignments', () => {
    (usePathname as jest.Mock).mockReturnValue('/student/dashboard');
    
    const studentWithAssignments = {
      ...mockStudent,
      upcomingAssignments: 2,
    };
    
    render(<StudentDashboardLayout {...defaultProps} student={studentWithAssignments} />);
    
    expect(screen.getByText(/2/)).toBeInTheDocument();
    expect(screen.getByText(/upcoming assignments/i)).toBeInTheDocument();
  });

  it('should handle search functionality', () => {
    const mockOnSearch = jest.fn();
    render(<StudentDashboardLayout {...defaultProps} onSearch={mockOnSearch} />);
    
    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'english' } });
    
    expect(mockOnSearch).toHaveBeenCalledWith('english');
  });

  it('should support keyboard navigation', () => {
    render(<StudentDashboardLayout {...defaultProps} />);
    
    const firstNavItem = screen.getByRole('link', { name: /dashboard/i });
    firstNavItem.focus();
    
    fireEvent.keyDown(firstNavItem, { key: 'ArrowDown' });
    
    const secondNavItem = screen.getByRole('link', { name: /my courses/i });
    expect(secondNavItem).toHaveFocus();
  });
});