import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClassCapacityManagement from '../ClassCapacityManagement';
import { classCapacityService } from '@/lib/services/class-capacity-service';
import { ENROLLMENT_STATUS } from '@/lib/constants';

// Mock the service
jest.mock('@/lib/services/class-capacity-service', () => ({
  classCapacityService: {
    getClassCapacity: jest.fn(),
    getWaitingList: jest.fn(),
    getClassesThatNeedAttention: jest.fn(),
    enrollStudent: jest.fn(),
    dropStudent: jest.fn(),
    promoteFromWaitlist: jest.fn(),
    createOverflowClass: jest.fn(),
  },
}));

const mockClassCapacityService = classCapacityService as jest.Mocked<typeof classCapacityService>;

describe('ClassCapacityManagement', () => {
  const mockCapacity = {
    class_id: 'class-1',
    current_enrolled: 6,
    max_capacity: 9,
    waiting_list_count: 2,
    available_spots: 3,
    is_full: false,
    can_accept_waitlist: true,
    course_type: 'group',
    capacity_utilization: 67,
  };

  const mockWaitingList = [
    {
      id: 'enrollment-1',
      student_id: 'student-1',
      class_id: 'class-1',
      position: 1,
      enrolled_at: '2023-12-01T10:00:00Z',
      student_name: 'John Doe',
      student_email: 'john@example.com',
    },
    {
      id: 'enrollment-2',
      student_id: 'student-2',
      class_id: 'class-1',
      position: 2,
      enrolled_at: '2023-12-01T11:00:00Z',
      student_name: 'Jane Smith',
      student_email: 'jane@example.com',
    },
  ];

  const mockRecommendations = [
    {
      class_id: 'class-1',
      current_enrollment: 8,
      recommended_action: 'create_new' as const,
      reason: 'Near maximum capacity',
      suggested_splits: [],
      priority: 'high' as const,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockClassCapacityService.getClassCapacity.mockResolvedValue(mockCapacity);
    mockClassCapacityService.getWaitingList.mockResolvedValue(mockWaitingList);
    mockClassCapacityService.getClassesThatNeedAttention.mockResolvedValue(mockRecommendations);
  });

  it('renders capacity overview correctly', async () => {
    render(<ClassCapacityManagement classId="class-1" />);

    await waitFor(() => {
      expect(screen.getByText('Class Capacity Overview')).toBeInTheDocument();
    });

    expect(screen.getByText('6')).toBeInTheDocument(); // Enrolled count
    expect(screen.getByText('3')).toBeInTheDocument(); // Available spots
    expect(screen.getByText('2')).toBeInTheDocument(); // Waitlisted count
    expect(screen.getByText('67% (6/9)')).toBeInTheDocument(); // Capacity utilization
  });

  it('displays waiting list when students are waitlisted', async () => {
    render(<ClassCapacityManagement classId="class-1" />);

    await waitFor(() => {
      expect(screen.getByText('Waiting List (2)')).toBeInTheDocument();
    });

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
  });

  it('shows recommendations when class needs attention', async () => {
    render(<ClassCapacityManagement classId="class-1" />);

    await waitFor(() => {
      expect(screen.getByText('Capacity Recommendations')).toBeInTheDocument();
    });

    expect(screen.getByText('High Priority')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument(); // Check for enrollment number
    expect(screen.getByText('Near maximum capacity')).toBeInTheDocument();
    expect(screen.getByText('create_new')).toBeInTheDocument();
  });

  it('handles student enrollment successfully', async () => {
    mockClassCapacityService.enrollStudent.mockResolvedValue({
      success: true,
      enrollment: {
        id: 'enrollment-new',
        class_id: 'class-1',
        student_id: 'student-new',
        status: ENROLLMENT_STATUS.ENROLLED,
        enrolled_at: new Date().toISOString(),
      },
    });

    render(<ClassCapacityManagement classId="class-1" />);

    await waitFor(() => {
      expect(screen.getByText('Enroll Student')).toBeInTheDocument();
    });

    // Open enrollment dialog
    fireEvent.click(screen.getByText('Enroll Student'));

    await waitFor(() => {
      expect(screen.getByText('Add a student to this class or waiting list')).toBeInTheDocument();
    });

    // Enter student ID
    const studentIdInput = screen.getByPlaceholderText('Enter student ID');
    fireEvent.change(studentIdInput, { target: { value: 'student-new' } });

    // Submit enrollment
    fireEvent.click(screen.getByRole('button', { name: 'Enroll' }));

    await waitFor(() => {
      expect(mockClassCapacityService.enrollStudent).toHaveBeenCalledWith('class-1', 'student-new');
    });
  });

  it('handles student enrollment to waitlist', async () => {
    mockClassCapacityService.enrollStudent.mockResolvedValue({
      success: true,
      enrollment: {
        id: 'enrollment-waitlist',
        class_id: 'class-1',
        student_id: 'student-waitlist',
        status: ENROLLMENT_STATUS.WAITLISTED,
        waitlisted_at: new Date().toISOString(),
        position_in_waitlist: 3,
      },
      waitlisted: true,
      position: 3,
    });

    render(<ClassCapacityManagement classId="class-1" />);

    await waitFor(() => {
      expect(screen.getByText('Enroll Student')).toBeInTheDocument();
    });

    // Open enrollment dialog
    fireEvent.click(screen.getByText('Enroll Student'));

    await waitFor(() => {
      expect(screen.getByText('Add a student to this class or waiting list')).toBeInTheDocument();
    });

    // Enter student ID
    const studentIdInput = screen.getByPlaceholderText('Enter student ID');
    fireEvent.change(studentIdInput, { target: { value: 'student-waitlist' } });

    // Submit enrollment
    fireEvent.click(screen.getByRole('button', { name: 'Enroll' }));

    await waitFor(() => {
      expect(mockClassCapacityService.enrollStudent).toHaveBeenCalledWith('class-1', 'student-waitlist');
    });
  });

  it('handles enrollment errors', async () => {
    mockClassCapacityService.enrollStudent.mockResolvedValue({
      success: false,
      error: 'Student already enrolled',
    });

    render(<ClassCapacityManagement classId="class-1" />);

    await waitFor(() => {
      expect(screen.getByText('Enroll Student')).toBeInTheDocument();
    });

    // Open enrollment dialog
    fireEvent.click(screen.getByText('Enroll Student'));

    await waitFor(() => {
      expect(screen.getByText('Add a student to this class or waiting list')).toBeInTheDocument();
    });

    // Enter student ID
    const studentIdInput = screen.getByPlaceholderText('Enter student ID');
    fireEvent.change(studentIdInput, { target: { value: 'student-existing' } });

    // Submit enrollment
    fireEvent.click(screen.getByRole('button', { name: 'Enroll' }));

    await waitFor(() => {
      expect(screen.getByText('Student already enrolled')).toBeInTheDocument();
    });
  });

  it('creates overflow class when recommended', async () => {
    mockClassCapacityService.createOverflowClass.mockResolvedValue({
      success: true,
      new_class_id: 'class-overflow-1',
    });

    render(<ClassCapacityManagement classId="class-1" />);

    await waitFor(() => {
      expect(screen.getByText('Create Overflow Class')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Create Overflow Class'));

    await waitFor(() => {
      expect(mockClassCapacityService.createOverflowClass).toHaveBeenCalledWith('class-1');
    });
  });

  it('displays correct capacity status badges', async () => {
    // Test high capacity utilization (over 85%)
    const highCapacity = {
      ...mockCapacity,
      capacity_utilization: 90,
      current_enrolled: 8,
      available_spots: 1,
    };

    mockClassCapacityService.getClassCapacity.mockResolvedValue(highCapacity);

    render(<ClassCapacityManagement classId="class-1" />);

    await waitFor(() => {
      expect(screen.getByText('Nearly Full')).toBeInTheDocument();
    });
  });

  it('shows full class status when at capacity', async () => {
    const fullCapacity = {
      ...mockCapacity,
      capacity_utilization: 100,
      current_enrolled: 9,
      available_spots: 0,
      is_full: true,
    };

    mockClassCapacityService.getClassCapacity.mockResolvedValue(fullCapacity);

    render(<ClassCapacityManagement classId="class-1" />);

    await waitFor(() => {
      expect(screen.getByText('Full')).toBeInTheDocument();
    });
  });

  it('disables enrollment button when class is full and waitlist is at capacity', async () => {
    const fullCapacityNoWaitlist = {
      ...mockCapacity,
      capacity_utilization: 100,
      current_enrolled: 9,
      available_spots: 0,
      is_full: true,
      can_accept_waitlist: false,
    };

    mockClassCapacityService.getClassCapacity.mockResolvedValue(fullCapacityNoWaitlist);

    render(<ClassCapacityManagement classId="class-1" />);

    await waitFor(() => {
      const enrollButton = screen.getByRole('button', { name: /enroll student/i });
      expect(enrollButton).toBeDisabled();
    });
  });

  it('handles loading state', () => {
    mockClassCapacityService.getClassCapacity.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    render(<ClassCapacityManagement classId="class-1" />);

    expect(screen.getByText('Class Capacity Management')).toBeInTheDocument();
    expect(screen.getByText('Managing class enrollment and capacity')).toBeInTheDocument();
  });

  it('handles error state when capacity cannot be loaded', async () => {
    mockClassCapacityService.getClassCapacity.mockResolvedValue(null);

    render(<ClassCapacityManagement classId="class-1" />);

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Unable to load class capacity information.')).toBeInTheDocument();
    });
  });

  it('calls onCapacityChange callback when capacity is loaded', async () => {
    const onCapacityChange = jest.fn();

    render(
      <ClassCapacityManagement 
        classId="class-1" 
        onCapacityChange={onCapacityChange}
      />
    );

    await waitFor(() => {
      expect(onCapacityChange).toHaveBeenCalledWith('class-1', mockCapacity);
    });
  });
});