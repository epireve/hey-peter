import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudentAttendanceTracking } from '../StudentAttendanceTracking';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { toast } from 'sonner';

// Mock toast
jest.mock('sonner', () => ({
  toast: Object.assign(jest.fn(), {
    success: jest.fn(),
    error: jest.fn()
  })
}));

// Mock Supabase client
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: jest.fn(() => ({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    storage: {
      from: jest.fn().mockReturnThis(),
      upload: jest.fn(),
      getPublicUrl: jest.fn()
    },
    channel: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
    removeChannel: jest.fn()
  }))
}));

// Mock data - using fixed test dates
const year = 2024;
const month = 0; // January

const mockAttendanceData = [
  {
    id: '1',
    student_id: 'student-1',
    class_id: 'class-1',
    date: format(new Date(year, month, 15), 'yyyy-MM-dd'),
    status: 'present',
    check_in_time: '09:00:00',
    check_out_time: '10:00:00',
    late_minutes: 0,
    comments: null,
    class: {
      id: 'class-1',
      course_name: 'Basic English',
      start_time: '09:00:00',
      end_time: '10:00:00',
      teacher: {
        first_name: 'John',
        last_name: 'Doe'
      }
    }
  },
  {
    id: '2',
    student_id: 'student-1',
    class_id: 'class-2',
    date: format(new Date(year, month, 16), 'yyyy-MM-dd'),
    status: 'late',
    check_in_time: '09:15:00',
    check_out_time: '10:00:00',
    late_minutes: 15,
    comments: 'Traffic jam',
    class: {
      id: 'class-2',
      course_name: 'Basic English',
      start_time: '09:00:00',
      end_time: '10:00:00',
      teacher: {
        first_name: 'John',
        last_name: 'Doe'
      }
    }
  },
  {
    id: '3',
    student_id: 'student-1',
    class_id: 'class-3',
    date: format(new Date(year, month, 17), 'yyyy-MM-dd'),
    status: 'absent',
    check_in_time: null,
    check_out_time: null,
    late_minutes: 0,
    comments: 'Sick',
    class: {
      id: 'class-3',
      course_name: 'Basic English',
      start_time: '09:00:00',
      end_time: '10:00:00',
      teacher: {
        first_name: 'Jane',
        last_name: 'Smith'
      }
    }
  },
  {
    id: '4',
    student_id: 'student-1',
    class_id: 'class-4',
    date: format(new Date(year, month, 18), 'yyyy-MM-dd'),
    status: 'excused',
    check_in_time: null,
    check_out_time: null,
    late_minutes: 0,
    comments: 'Medical appointment',
    class: {
      id: 'class-4',
      course_name: 'Speak Up',
      start_time: '14:00:00',
      end_time: '15:00:00',
      teacher: {
        first_name: 'Jane',
        last_name: 'Smith'
      }
    }
  }
];

const mockLeaveRequests = [
  {
    id: 'leave-1',
    student_id: 'student-1',
    request_date: format(new Date(year, month, 10), 'yyyy-MM-dd'),
    leave_date: format(new Date(year, month, 17), 'yyyy-MM-dd'),
    reason: 'Medical appointment',
    supporting_document_url: 'https://example.com/doc1.pdf',
    status: 'approved',
    reviewed_by: 'admin-1',
    reviewed_at: format(new Date(year, month, 11), 'yyyy-MM-dd')
  }
];

const mockAttendanceStats = {
  total_classes: 20,
  present: 12,
  late: 3,
  absent: 3,
  excused: 2,
  attendance_percentage: 75,
  hours_deducted: 4
};

const mockAttendancePolicies = {
  minimum_attendance_percentage: 80,
  late_threshold_minutes: 15,
  hours_deduction_per_absence: 2,
  max_consecutive_absences: 3
};

describe('StudentAttendanceTracking', () => {
  const mockSupabase = createClientComponentClient() as jest.Mocked<ReturnType<typeof createClientComponentClient>>;
  const mockStudentId = 'student-1';
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock attendance data fetch
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis()
    };

    (mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'attendance') {
        return {
          ...mockChain,
          order: jest.fn().mockResolvedValue({ data: mockAttendanceData, error: null })
        };
      }
      if (table === 'leave_requests') {
        return {
          ...mockChain,
          order: jest.fn().mockResolvedValue({ data: mockLeaveRequests, error: null })
        };
      }
      if (table === 'attendance_policies') {
        return {
          ...mockChain,
          single: jest.fn().mockResolvedValue({ data: mockAttendancePolicies, error: null })
        };
      }
      return mockChain;
    });

    // Mock channel for real-time subscription
    (mockSupabase.channel as jest.Mock).mockReturnValue(mockSupabase);
    (mockSupabase.on as jest.Mock).mockReturnValue(mockSupabase);
    (mockSupabase.subscribe as jest.Mock).mockReturnValue(mockSupabase);
  });

  // Test 1: Component renders with loading state
  it('should show loading state initially', () => {
    render(<StudentAttendanceTracking studentId={mockStudentId} />);
    // Check for loading skeleton
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // Test 2: Calendar view displays correctly
  it('should display calendar view with attendance data', async () => {
    render(<StudentAttendanceTracking studentId={mockStudentId} />);
    
    // Wait for the component to render and data to load
    await waitFor(() => {
      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBe(0);
    }, { timeout: 5000 });
    
    // Check for calendar presence
    expect(screen.getByTestId('attendance-calendar')).toBeInTheDocument();
    
    // Check for attendance markers on calendar
    const calendar = screen.getByTestId('attendance-calendar');
    expect(within(calendar).getByText('15')).toBeInTheDocument();
    expect(within(calendar).getByText('16')).toBeInTheDocument();
    expect(within(calendar).getByText('17')).toBeInTheDocument();
    expect(within(calendar).getByText('18')).toBeInTheDocument();
  });

  // Test 3: Attendance statistics display
  it('should display attendance statistics correctly', async () => {
    render(<StudentAttendanceTracking studentId={mockStudentId} />);
    
    // Wait for data to load
    await waitFor(() => {
      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBe(0);
    });
    
    // Check for attendance rate
    expect(screen.getByText('Attendance Rate')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument(); // 2 out of 4 classes attended (present + late)
    
    // Check for class counts
    expect(screen.getByText('Classes')).toBeInTheDocument();
    expect(screen.getByText(/1 Present/)).toBeInTheDocument();
    expect(screen.getByText(/1 Late/)).toBeInTheDocument();
    expect(screen.getByText(/1 Absent/)).toBeInTheDocument();
    expect(screen.getByText(/1 Excused/)).toBeInTheDocument();
  });

  // Test 4: View mode switching
  it('should switch between calendar, week, and list views', async () => {
    render(<StudentAttendanceTracking studentId={mockStudentId} />);
    
    // Wait for data to load
    await waitFor(() => {
      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBe(0);
    });
    
    // Default is calendar view
    expect(screen.getByTestId('attendance-calendar')).toBeInTheDocument();
    
    // Switch to week view
    const weekTab = screen.getByRole('tab', { name: /week view/i });
    await user.click(weekTab);
    expect(screen.getByTestId('attendance-week-view')).toBeInTheDocument();
    
    // Switch to list view
    const listTab = screen.getByRole('tab', { name: /list view/i });
    await user.click(listTab);
    expect(screen.getByTestId('attendance-list-view')).toBeInTheDocument();
  });

  // Test 5: Filter by course
  it('should filter attendance by course', async () => {
    render(<StudentAttendanceTracking studentId={mockStudentId} />);
    
    // Wait for data to load
    await waitFor(() => {
      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBe(0);
    });
    
    // Switch to list view to see filtered items
    await user.click(screen.getByRole('tab', { name: /list view/i }));
    
    const courseFilter = screen.getByLabelText(/filter by course/i);
    await user.selectOptions(courseFilter, 'Basic English');
    
    await waitFor(() => {
      const listItems = screen.getAllByTestId('attendance-item');
      expect(listItems).toHaveLength(3); // Only Basic English classes
    });
  });

  // Test 6: Date range selection
  it('should filter attendance by date range', async () => {
    render(<StudentAttendanceTracking studentId={mockStudentId} />);
    
    // Wait for data to load
    await waitFor(() => {
      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBe(0);
    });
    
    const startDate = screen.getByLabelText(/start date/i);
    const endDate = screen.getByLabelText(/end date/i);
    
    await user.type(startDate, '2024-01-15');
    await user.type(endDate, '2024-01-16');
    
    await waitFor(() => {
      const listItems = screen.getAllByTestId('attendance-item');
      expect(listItems).toHaveLength(2);
    });
  });

  // Test 7: Display attendance details on click
  it('should show attendance details when clicking on a date', async () => {
    render(<StudentAttendanceTracking studentId={mockStudentId} />);
    
    // Wait for data to load
    await waitFor(() => {
      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBe(0);
    });
    
    const calendar = screen.getByTestId('attendance-calendar');
    const date15 = within(calendar).getByText('15');
    await user.click(date15);
    
    // Toast should show with attendance details
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Basic English'));
    });
  });

  // Test 8: Show impact on grades/hours
  it('should display impact on grades and hours', async () => {
    render(<StudentAttendanceTracking studentId={mockStudentId} />);
    
    // Wait for data to load
    await waitFor(() => {
      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBe(0);
    });
    
    expect(screen.getByText('Impact on Hours')).toBeInTheDocument();
    expect(screen.getByText(/2 hours deducted/i)).toBeInTheDocument(); // 1 absence * 2 hours
  });

  // Test 9: Request leave/absence form
  it('should open leave request form when clicking request leave button', async () => {
    render(<StudentAttendanceTracking studentId={mockStudentId} />);
    
    // Wait for data to load
    await waitFor(() => {
      const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
      expect(skeletons.length).toBe(0);
    });
    
    await user.click(screen.getByRole('button', { name: /request leave/i }));
    
    // Check dialog content
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/leave date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/reason/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/supporting document/i)).toBeInTheDocument();
  });

  // Test 10: Submit leave request
  it('should submit leave request with reason and document', async () => {
    const mockFile = new File(['test'], 'medical-cert.pdf', { type: 'application/pdf' });
    
    mockSupabase.storage.from.mockReturnValue({
      upload: jest.fn().mockResolvedValue({ data: { path: 'uploads/medical-cert.pdf' }, error: null }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/medical-cert.pdf' } })
    });
    
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'leave_requests') {
        return {
          insert: jest.fn().mockResolvedValue({ data: { id: 'new-leave-1' }, error: null })
        };
      }
      return mockSupabase;
    });
    
    render(<StudentAttendanceTracking studentId={mockStudentId} />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /request leave/i })).toBeInTheDocument();
    });
    
    await user.click(screen.getByRole('button', { name: /request leave/i }));
    
    const leaveDate = screen.getByLabelText(/leave date/i);
    const reason = screen.getByLabelText(/reason/i);
    const fileInput = screen.getByLabelText(/supporting document/i);
    
    await user.type(leaveDate, '2024-01-25');
    await user.type(reason, 'Medical checkup');
    await user.upload(fileInput, mockFile);
    
    await user.click(screen.getByRole('button', { name: /submit request/i }));
    
    await waitFor(() => {
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('leave-documents');
      expect(screen.getByText(/leave request submitted successfully/i)).toBeInTheDocument();
    });
  });

  // Test 11: View teacher comments
  it('should display teacher comments on attendance', async () => {
    render(<StudentAttendanceTracking studentId={mockStudentId} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('attendance-list-view')).toBeInTheDocument();
    });
    
    await user.click(screen.getByRole('button', { name: /list view/i }));
    
    expect(screen.getByText(/traffic jam/i)).toBeInTheDocument();
    expect(screen.getByText(/sick/i)).toBeInTheDocument();
    expect(screen.getByText(/medical appointment/i)).toBeInTheDocument();
  });

  // Test 12: Export attendance report
  it('should export attendance report', async () => {
    const mockCreateObjectURL = jest.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    
    render(<StudentAttendanceTracking studentId={mockStudentId} />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /export report/i })).toBeInTheDocument();
    });
    
    await user.click(screen.getByRole('button', { name: /export report/i }));
    
    expect(screen.getByRole('dialog', { name: /export options/i })).toBeInTheDocument();
    
    await user.click(screen.getByRole('radio', { name: /pdf/i }));
    await user.click(screen.getByRole('button', { name: /download/i }));
    
    expect(mockCreateObjectURL).toHaveBeenCalled();
  });

  // Test 13: Show attendance requirements and policies
  it('should display attendance requirements and policies', async () => {
    render(<StudentAttendanceTracking studentId={mockStudentId} />);
    
    await waitFor(() => {
      expect(screen.getByText(/attendance policies/i)).toBeInTheDocument();
    });
    
    expect(screen.getByText(/minimum attendance: 80%/i)).toBeInTheDocument();
    expect(screen.getByText(/late threshold: 15 minutes/i)).toBeInTheDocument();
    expect(screen.getByText(/hours deducted per absence: 2/i)).toBeInTheDocument();
    expect(screen.getByText(/max consecutive absences: 3/i)).toBeInTheDocument();
  });

  // Test 14: Attendance trends visualization
  it('should display attendance trends chart', async () => {
    render(<StudentAttendanceTracking studentId={mockStudentId} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('attendance-trends-chart')).toBeInTheDocument();
    });
    
    const chart = screen.getByTestId('attendance-trends-chart');
    expect(within(chart).getByText(/attendance trend/i)).toBeInTheDocument();
  });

  // Test 15: Color coding for attendance status
  it('should use color coding for different attendance statuses', async () => {
    render(<StudentAttendanceTracking studentId={mockStudentId} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('attendance-legend')).toBeInTheDocument();
    });
    
    const legend = screen.getByTestId('attendance-legend');
    expect(within(legend).getByText(/present/i)).toHaveClass('text-green-600');
    expect(within(legend).getByText(/late/i)).toHaveClass('text-yellow-600');
    expect(within(legend).getByText(/absent/i)).toHaveClass('text-red-600');
    expect(within(legend).getByText(/excused/i)).toHaveClass('text-blue-600');
  });

  // Test 16: Pagination for list view
  it('should paginate attendance records in list view', async () => {
    const manyRecords = Array.from({ length: 25 }, (_, i) => ({
      ...mockAttendanceData[0],
      id: `record-${i}`,
      date: format(new Date(2024, 0, i + 1), 'yyyy-MM-dd')
    }));
    
    mockSupabase.from.mockImplementation((table) => {
      if (table === 'attendance') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: manyRecords, error: null })
        };
      }
      return mockSupabase;
    });
    
    render(<StudentAttendanceTracking studentId={mockStudentId} />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /list view/i })).toBeInTheDocument();
    });
    
    await user.click(screen.getByRole('button', { name: /list view/i }));
    
    expect(screen.getAllByTestId('attendance-item')).toHaveLength(20); // First page
    expect(screen.getByRole('button', { name: /next page/i })).toBeInTheDocument();
    
    await user.click(screen.getByRole('button', { name: /next page/i }));
    expect(screen.getAllByTestId('attendance-item')).toHaveLength(5); // Remaining records
  });

  // Test 17: Search functionality
  it('should search attendance records', async () => {
    render(<StudentAttendanceTracking studentId={mockStudentId} />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search by course or teacher/i)).toBeInTheDocument();
    });
    
    const searchInput = screen.getByPlaceholderText(/search by course or teacher/i);
    await user.type(searchInput, 'Jane Smith');
    
    await waitFor(() => {
      const listItems = screen.getAllByTestId('attendance-item');
      expect(listItems).toHaveLength(2); // Classes taught by Jane Smith
    });
  });

  // Test 18: Attendance summary by month
  it('should show monthly attendance summary', async () => {
    render(<StudentAttendanceTracking studentId={mockStudentId} />);
    
    await waitFor(() => {
      expect(screen.getByText(/monthly summary/i)).toBeInTheDocument();
    });
    
    expect(screen.getByText(/january 2024: 75%/i)).toBeInTheDocument();
  });

  // Test 19: Handle API errors gracefully
  it('should display error message when API fails', async () => {
    mockSupabase.from.mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: null, error: { message: 'Failed to fetch attendance' } })
    }));
    
    render(<StudentAttendanceTracking studentId={mockStudentId} />);
    
    await waitFor(() => {
      expect(screen.getByText(/failed to fetch attendance/i)).toBeInTheDocument();
    });
  });

  // Test 20: Refresh attendance data
  it('should refresh attendance data when clicking refresh button', async () => {
    render(<StudentAttendanceTracking studentId={mockStudentId} />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await user.click(refreshButton);
    
    expect(mockSupabase.from).toHaveBeenCalledWith('attendance');
  });

  // Test 21: Week view navigation
  it('should navigate between weeks in week view', async () => {
    render(<StudentAttendanceTracking studentId={mockStudentId} />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /week view/i })).toBeInTheDocument();
    });
    
    await user.click(screen.getByRole('button', { name: /week view/i }));
    
    expect(screen.getByText(/jan 15.*jan 21, 2024/i)).toBeInTheDocument();
    
    await user.click(screen.getByRole('button', { name: /previous week/i }));
    expect(screen.getByText(/jan 8.*jan 14, 2024/i)).toBeInTheDocument();
    
    await user.click(screen.getByRole('button', { name: /next week/i }));
    expect(screen.getByText(/jan 15.*jan 21, 2024/i)).toBeInTheDocument();
  });

  // Test 22: Attendance streak tracking
  it('should display attendance streak information', async () => {
    render(<StudentAttendanceTracking studentId={mockStudentId} />);
    
    await waitFor(() => {
      expect(screen.getByText(/current streak/i)).toBeInTheDocument();
    });
    
    expect(screen.getByText(/0 days/i)).toBeInTheDocument(); // Broken by absence
    expect(screen.getByText(/longest streak: 2 days/i)).toBeInTheDocument();
  });

  // Test 23: Accessibility features
  it('should be keyboard navigable and screen reader friendly', async () => {
    render(<StudentAttendanceTracking studentId={mockStudentId} />);
    
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /attendance tracking/i })).toBeInTheDocument();
    });
    
    // Check ARIA labels
    expect(screen.getByLabelText(/attendance calendar/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/attendance statistics/i)).toBeInTheDocument();
    
    // Tab navigation
    const firstButton = screen.getAllByRole('button')[0];
    firstButton.focus();
    expect(document.activeElement).toBe(firstButton);
  });

  // Test 24: Print attendance report
  it('should print attendance report', async () => {
    const mockPrint = jest.fn();
    global.window.print = mockPrint;
    
    render(<StudentAttendanceTracking studentId={mockStudentId} />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /print report/i })).toBeInTheDocument();
    });
    
    await user.click(screen.getByRole('button', { name: /print report/i }));
    
    expect(mockPrint).toHaveBeenCalled();
  });

  // Test 25: Leave request status tracking
  it('should display leave request status', async () => {
    render(<StudentAttendanceTracking studentId={mockStudentId} />);
    
    await waitFor(() => {
      expect(screen.getByText(/leave requests/i)).toBeInTheDocument();
    });
    
    expect(screen.getByText(/jan 17, 2024/i)).toBeInTheDocument();
    expect(screen.getByText(/medical appointment/i)).toBeInTheDocument();
    expect(screen.getByText(/approved/i)).toHaveClass('text-green-600');
  });

  // Test 26: Attendance comparison with class average
  it('should show attendance comparison with class average', async () => {
    render(<StudentAttendanceTracking studentId={mockStudentId} />);
    
    await waitFor(() => {
      expect(screen.getByText(/class average: 85%/i)).toBeInTheDocument();
    });
    
    expect(screen.getByText(/your attendance: 75%/i)).toBeInTheDocument();
    expect(screen.getByText(/10% below average/i)).toHaveClass('text-red-600');
  });

  // Test 27: Mobile responsive design
  it('should be responsive on mobile devices', async () => {
    // Mock mobile viewport
    global.innerWidth = 375;
    global.innerHeight = 667;
    
    render(<StudentAttendanceTracking studentId={mockStudentId} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('mobile-view-selector')).toBeInTheDocument();
    });
    
    // Should default to list view on mobile
    expect(screen.getByTestId('attendance-list-view')).toBeInTheDocument();
  });

  // Test 28: Attendance certificate generation
  it('should generate attendance certificate', async () => {
    render(<StudentAttendanceTracking studentId={mockStudentId} />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /generate certificate/i })).toBeInTheDocument();
    });
    
    await user.click(screen.getByRole('button', { name: /generate certificate/i }));
    
    expect(screen.getByText(/attendance certificate generated/i)).toBeInTheDocument();
  });

  // Test 29: Real-time attendance updates
  it('should update attendance in real-time when marked present', async () => {
    render(<StudentAttendanceTracking studentId={mockStudentId} />);
    
    await waitFor(() => {
      expect(mockSupabase.channel).toHaveBeenCalledWith(`attendance-${mockStudentId}`);
      expect(mockSupabase.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({ 
          event: 'INSERT',
          schema: 'public',
          table: 'attendance',
          filter: `student_id=eq.${mockStudentId}`
        }),
        expect.any(Function)
      );
    });
  });

  // Test 30: Attendance goal setting and tracking
  it('should allow setting and tracking attendance goals', async () => {
    render(<StudentAttendanceTracking studentId={mockStudentId} />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /set attendance goal/i })).toBeInTheDocument();
    });
    
    await user.click(screen.getByRole('button', { name: /set attendance goal/i }));
    
    const goalInput = screen.getByLabelText(/target attendance percentage/i);
    await user.clear(goalInput);
    await user.type(goalInput, '90');
    
    await user.click(screen.getByRole('button', { name: /save goal/i }));
    
    expect(screen.getByText(/goal: 90%/i)).toBeInTheDocument();
    expect(screen.getByText(/15% to go/i)).toBeInTheDocument();
  });
});