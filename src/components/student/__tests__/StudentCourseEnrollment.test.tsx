import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StudentCourseEnrollment } from '../StudentCourseEnrollment';

// Mock the icons
jest.mock('lucide-react', () => ({
  BookOpen: () => <div data-testid="book-open-icon">BookOpen</div>,
  Clock: () => <div data-testid="clock-icon">Clock</div>,
  Users: () => <div data-testid="users-icon">Users</div>,
  Star: () => <div data-testid="star-icon">Star</div>,
  Calendar: () => <div data-testid="calendar-icon">Calendar</div>,
  CheckCircle: () => <div data-testid="check-circle-icon">CheckCircle</div>,
  AlertCircle: () => <div data-testid="alert-circle-icon">AlertCircle</div>,
  Info: () => <div data-testid="info-icon">Info</div>,
  Search: () => <div data-testid="search-icon">Search</div>,
  Filter: () => <div data-testid="filter-icon">Filter</div>,
  ChevronDown: () => <div data-testid="chevron-down-icon">ChevronDown</div>,
  MapPin: () => <div data-testid="map-pin-icon">MapPin</div>,
  DollarSign: () => <div data-testid="dollar-sign-icon">DollarSign</div>,
  Award: () => <div data-testid="award-icon">Award</div>,
  Heart: () => <div data-testid="heart-icon">Heart</div>,
  X: () => <div data-testid="x-icon">X</div>,
}));

// Mock course data
const mockCourses = [
  {
    id: 'course-1',
    title: 'Business English Fundamentals',
    description: 'Master professional English communication skills',
    level: 'Beginner',
    duration: '12 weeks',
    price: 2500,
    rating: 4.8,
    studentsEnrolled: 145,
    instructor: 'Ms. Sarah Johnson',
    format: 'Online',
    schedule: 'Mon, Wed, Fri - 7:00 PM',
    image: 'https://example.com/course1.jpg',
    category: 'Business English',
    prerequisites: [],
    isEnrolled: false,
    isPremium: false,
    nextStartDate: '2024-04-01',
    syllabus: [
      { week: 1, topic: 'Introduction to Business Communication' },
      { week: 2, topic: 'Email Writing Skills' },
    ],
  },
  {
    id: 'course-2',
    title: 'Advanced Conversation Skills',
    description: 'Enhance your spoken English confidence',
    level: 'Intermediate',
    duration: '8 weeks',
    price: 3200,
    rating: 4.9,
    studentsEnrolled: 89,
    instructor: 'Mr. David Chen',
    format: 'Hybrid',
    schedule: 'Tue, Thu - 6:30 PM',
    image: 'https://example.com/course2.jpg',
    category: 'Conversation',
    prerequisites: ['Basic English'],
    isEnrolled: true,
    isPremium: true,
    nextStartDate: '2024-04-15',
    syllabus: [
      { week: 1, topic: 'Fluency Building Techniques' },
      { week: 2, topic: 'Advanced Grammar in Context' },
    ],
  },
  {
    id: 'course-3',
    title: 'IELTS Preparation Intensive',
    description: 'Comprehensive IELTS test preparation',
    level: 'Advanced',
    duration: '16 weeks',
    price: 4500,
    rating: 4.7,
    studentsEnrolled: 67,
    instructor: 'Dr. Emily Watson',
    format: 'In-person',
    schedule: 'Sat, Sun - 9:00 AM',
    image: 'https://example.com/course3.jpg',
    category: 'Test Preparation',
    prerequisites: ['Intermediate English', 'Grammar Basics'],
    isEnrolled: false,
    isPremium: true,
    nextStartDate: '2024-05-01',
    syllabus: [
      { week: 1, topic: 'IELTS Overview and Strategy' },
      { week: 2, topic: 'Reading Skills Development' },
    ],
  },
];

describe('StudentCourseEnrollment', () => {
  const defaultProps = {
    courses: mockCourses,
    studentId: 'student-123',
  };

  it('should render course enrollment component', () => {
    render(<StudentCourseEnrollment {...defaultProps} />);
    
    expect(screen.getByText('Available Courses')).toBeInTheDocument();
    expect(screen.getByText('Business English Fundamentals')).toBeInTheDocument();
    expect(screen.getByText('Advanced Conversation Skills')).toBeInTheDocument();
    expect(screen.getByText('IELTS Preparation Intensive')).toBeInTheDocument();
  });

  it('should display course information correctly', () => {
    render(<StudentCourseEnrollment {...defaultProps} />);
    
    // Check first course details
    expect(screen.getByText('Business English Fundamentals')).toBeInTheDocument();
    expect(screen.getByText(/Master professional English communication skills/)).toBeInTheDocument();
    expect(screen.getByText('Beginner')).toBeInTheDocument();
    expect(screen.getByText('12 weeks')).toBeInTheDocument();
    expect(screen.getByText('RM 2,500')).toBeInTheDocument();
    expect(screen.getByText('145 students')).toBeInTheDocument();
    expect(screen.getByText('Ms. Sarah Johnson')).toBeInTheDocument();
  });

  it('should show course ratings and format', () => {
    render(<StudentCourseEnrollment {...defaultProps} />);
    
    expect(screen.getByText('4.8')).toBeInTheDocument();
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByText('Hybrid')).toBeInTheDocument();
    expect(screen.getByText('In-person')).toBeInTheDocument();
  });

  it('should display enrollment status', () => {
    render(<StudentCourseEnrollment {...defaultProps} />);
    
    // Should show "Enroll Now" for non-enrolled courses
    expect(screen.getAllByText('Enroll Now').length).toBeGreaterThan(0);
    
    // Should show "Enrolled" for enrolled courses
    expect(screen.getByText('Enrolled')).toBeInTheDocument();
  });

  it('should handle course search', () => {
    render(<StudentCourseEnrollment {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText(/search courses/i);
    fireEvent.change(searchInput, { target: { value: 'Business' } });
    
    expect(screen.getByText('Business English Fundamentals')).toBeInTheDocument();
    expect(screen.queryByText('Advanced Conversation Skills')).not.toBeInTheDocument();
  });

  it('should filter courses by level', () => {
    render(<StudentCourseEnrollment {...defaultProps} />);
    
    const filterButton = screen.getByRole('button', { name: /filter/i });
    fireEvent.click(filterButton);
    
    const beginnerFilter = screen.getByText('Beginner');
    fireEvent.click(beginnerFilter);
    
    expect(screen.getByText('Business English Fundamentals')).toBeInTheDocument();
  });

  it('should filter courses by category', () => {
    render(<StudentCourseEnrollment {...defaultProps} />);
    
    const categoryFilter = screen.getByText('Business English');
    fireEvent.click(categoryFilter);
    
    expect(screen.getByText('Business English Fundamentals')).toBeInTheDocument();
  });

  it('should handle course enrollment', async () => {
    const mockOnEnroll = jest.fn().mockResolvedValue(true);
    render(<StudentCourseEnrollment {...defaultProps} onEnroll={mockOnEnroll} />);
    
    const enrollButton = screen.getAllByText('Enroll Now')[0];
    fireEvent.click(enrollButton);
    
    // Should show confirmation dialog
    expect(screen.getByText(/confirm enrollment/i)).toBeInTheDocument();
    
    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(mockOnEnroll).toHaveBeenCalledWith('course-1');
    });
  });

  it('should show course prerequisites', () => {
    render(<StudentCourseEnrollment {...defaultProps} />);
    
    expect(screen.getByText('Basic English')).toBeInTheDocument();
    expect(screen.getByText('Intermediate English')).toBeInTheDocument();
    expect(screen.getByText('Grammar Basics')).toBeInTheDocument();
  });

  it('should display course schedule', () => {
    render(<StudentCourseEnrollment {...defaultProps} />);
    
    expect(screen.getByText('Mon, Wed, Fri - 7:00 PM')).toBeInTheDocument();
    expect(screen.getByText('Tue, Thu - 6:30 PM')).toBeInTheDocument();
    expect(screen.getByText('Sat, Sun - 9:00 AM')).toBeInTheDocument();
  });

  it('should show premium course indicator', () => {
    render(<StudentCourseEnrollment {...defaultProps} />);
    
    const premiumBadges = screen.getAllByText('Premium');
    expect(premiumBadges.length).toBe(2); // Two premium courses
  });

  it('should display loading state', () => {
    render(<StudentCourseEnrollment {...defaultProps} isLoading={true} />);
    
    expect(screen.getByTestId('courses-loading')).toBeInTheDocument();
  });

  it('should handle empty courses list', () => {
    render(<StudentCourseEnrollment {...defaultProps} courses={[]} />);
    
    expect(screen.getByText(/no courses available/i)).toBeInTheDocument();
  });

  it('should show course details modal', () => {
    render(<StudentCourseEnrollment {...defaultProps} />);
    
    const viewDetailsButton = screen.getAllByText('View Details')[0];
    fireEvent.click(viewDetailsButton);
    
    expect(screen.getByText('Course Details')).toBeInTheDocument();
    expect(screen.getByText('Syllabus')).toBeInTheDocument();
  });

  it('should display course syllabus', () => {
    render(<StudentCourseEnrollment {...defaultProps} />);
    
    const viewDetailsButton = screen.getAllByText('View Details')[0];
    fireEvent.click(viewDetailsButton);
    
    expect(screen.getByText('Fluency Building Techniques')).toBeInTheDocument();
    expect(screen.getByText('Advanced Grammar in Context')).toBeInTheDocument();
  });

  it('should handle enrollment confirmation', async () => {
    const mockOnEnroll = jest.fn().mockResolvedValue(true);
    render(<StudentCourseEnrollment {...defaultProps} onEnroll={mockOnEnroll} />);
    
    const enrollButton = screen.getAllByText('Enroll Now')[0];
    fireEvent.click(enrollButton);
    
    // Should show confirmation dialog
    expect(screen.getByText(/confirm enrollment/i)).toBeInTheDocument();
    
    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(mockOnEnroll).toHaveBeenCalledWith('course-1');
    });
  });

  it('should show enrollment success message', async () => {
    const mockOnEnroll = jest.fn().mockResolvedValue(true);
    render(<StudentCourseEnrollment {...defaultProps} onEnroll={mockOnEnroll} />);
    
    const enrollButton = screen.getAllByText('Enroll Now')[0];
    fireEvent.click(enrollButton);
    
    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(screen.getByText(/enrollment successful/i)).toBeInTheDocument();
    });
  });

  it('should handle enrollment failure', async () => {
    const mockOnEnroll = jest.fn().mockRejectedValue(new Error('Enrollment failed'));
    render(<StudentCourseEnrollment {...defaultProps} onEnroll={mockOnEnroll} />);
    
    const enrollButton = screen.getAllByText('Enroll Now')[0];
    fireEvent.click(enrollButton);
    
    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(screen.getByText(/enrollment failed/i)).toBeInTheDocument();
    });
  });

  it('should display sort dropdown', () => {
    render(<StudentCourseEnrollment {...defaultProps} />);
    
    const sortButton = screen.getByText('Sort');
    expect(sortButton).toBeInTheDocument();
    
    // Check that courses are displayed in default order (by title)
    const courseCards = screen.getAllByTestId('course-card');
    expect(courseCards[0]).toHaveTextContent('Advanced Conversation Skills');
    expect(courseCards[1]).toHaveTextContent('Business English Fundamentals');
    expect(courseCards[2]).toHaveTextContent('IELTS Preparation Intensive');
  });

  it('should show next start date', () => {
    render(<StudentCourseEnrollment {...defaultProps} />);
    
    expect(screen.getByText(/Apr 1, 2024/)).toBeInTheDocument();
    expect(screen.getByText(/Apr 15, 2024/)).toBeInTheDocument();
    expect(screen.getByText(/May 1, 2024/)).toBeInTheDocument();
  });

  it('should display course categories filter', () => {
    render(<StudentCourseEnrollment {...defaultProps} />);
    
    expect(screen.getByText('Business English')).toBeInTheDocument();
    expect(screen.getByText('Conversation')).toBeInTheDocument();
    expect(screen.getByText('Test Preparation')).toBeInTheDocument();
  });

  it('should handle wishlist functionality', () => {
    const mockOnWishlist = jest.fn();
    render(<StudentCourseEnrollment {...defaultProps} onWishlist={mockOnWishlist} />);
    
    // Get the first course card and find its wishlist button
    const firstCourseCard = screen.getAllByTestId('course-card')[0];
    const wishlistButton = firstCourseCard.querySelector('[data-testid="wishlist-button"]');
    fireEvent.click(wishlistButton);
    
    expect(mockOnWishlist).toHaveBeenCalledWith('course-2');
  });

  it('should show course images', () => {
    render(<StudentCourseEnrollment {...defaultProps} />);
    
    const courseImages = screen.getAllByRole('img');
    expect(courseImages.length).toBe(3);
    expect(courseImages[0]).toHaveAttribute('src', 'https://example.com/course2.jpg');
  });

  it('should display instructor information', () => {
    render(<StudentCourseEnrollment {...defaultProps} />);
    
    expect(screen.getByText('Ms. Sarah Johnson')).toBeInTheDocument();
    expect(screen.getByText('Mr. David Chen')).toBeInTheDocument();
    expect(screen.getByText('Dr. Emily Watson')).toBeInTheDocument();
  });

  it('should show course comparison feature', () => {
    render(<StudentCourseEnrollment {...defaultProps} enableComparison={true} />);
    
    const compareCheckboxes = screen.getAllByTestId('compare-checkbox');
    expect(compareCheckboxes.length).toBe(3);
    
    fireEvent.click(compareCheckboxes[0]);
    fireEvent.click(compareCheckboxes[1]);
    
    expect(screen.getByText('Compare Courses (2)')).toBeInTheDocument();
  });

  it('should handle responsive grid layout', () => {
    render(<StudentCourseEnrollment {...defaultProps} />);
    
    const coursesGrid = screen.getByTestId('courses-grid');
    expect(coursesGrid).toHaveClass('responsive-grid');
  });
});