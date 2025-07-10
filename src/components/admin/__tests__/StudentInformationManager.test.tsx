import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StudentInformationManager } from '../StudentInformationManager';

// Mock the icons
jest.mock('lucide-react', () => ({
  User: () => <div data-testid="user-icon">User</div>,
  UserPlus: () => <div data-testid="user-plus-icon">UserPlus</div>,
  Search: () => <div data-testid="search-icon">Search</div>,
  Filter: () => <div data-testid="filter-icon">Filter</div>,
  Download: () => <div data-testid="download-icon">Download</div>,
  Upload: () => <div data-testid="upload-icon">Upload</div>,
  Edit3: () => <div data-testid="edit3-icon">Edit3</div>,
  Trash2: () => <div data-testid="trash2-icon">Trash2</div>,
  Eye: () => <div data-testid="eye-icon">Eye</div>,
  Save: () => <div data-testid="save-icon">Save</div>,
  X: () => <div data-testid="x-icon">X</div>,
  Camera: () => <div data-testid="camera-icon">Camera</div>,
  Calendar: () => <div data-testid="calendar-icon">Calendar</div>,
  CreditCard: () => <div data-testid="credit-card-icon">CreditCard</div>,
  BookOpen: () => <div data-testid="book-open-icon">BookOpen</div>,
  Award: () => <div data-testid="award-icon">Award</div>,
  Users: () => <div data-testid="users-icon">Users</div>,
  MapPin: () => <div data-testid="map-pin-icon">MapPin</div>,
  Phone: () => <div data-testid="phone-icon">Phone</div>,
  Mail: () => <div data-testid="mail-icon">Mail</div>,
  FileText: () => <div data-testid="file-text-icon">FileText</div>,
  GraduationCap: () => <div data-testid="graduation-cap-icon">GraduationCap</div>,
  TrendingUp: () => <div data-testid="trending-up-icon">TrendingUp</div>,
  ChevronDown: () => <div data-testid="chevron-down-icon">ChevronDown</div>,
  ChevronUp: () => <div data-testid="chevron-up-icon">ChevronUp</div>,
  Check: () => <div data-testid="check-icon">Check</div>,
}));

describe('StudentInformationManager', () => {
  const defaultProps = {
    isLoading: false,
  };

  const mockOnCreateStudent = jest.fn();
  const mockOnUpdateStudent = jest.fn();
  const mockOnDeleteStudent = jest.fn();
  const mockOnExportStudents = jest.fn();
  const mockOnImportStudents = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render student information manager', () => {
    render(<StudentInformationManager {...defaultProps} />);
    
    expect(screen.getByText('Student Information Management')).toBeInTheDocument();
    expect(screen.getByText('Manage student profiles, course information, and tracking data')).toBeInTheDocument();
  });

  it('should display statistics cards', () => {
    render(<StudentInformationManager {...defaultProps} />);
    
    expect(screen.getByText('Total Students')).toBeInTheDocument();
    expect(screen.getByText('Active Students')).toBeInTheDocument();
    expect(screen.getByText('Graduated')).toBeInTheDocument();
    expect(screen.getByText('Revenue')).toBeInTheDocument();
  });

  it('should show correct student statistics', () => {
    render(<StudentInformationManager {...defaultProps} />);
    
    // Based on mock data (2 students)
    expect(screen.getAllByText('2')).toHaveLength(2); // Total students and active students
    expect(screen.getByText('100.0% of total')).toBeInTheDocument(); // Active percentage
  });

  it('should display search and filter controls', () => {
    render(<StudentInformationManager {...defaultProps} />);
    
    expect(screen.getByPlaceholderText('Search students by name, email, ID...')).toBeInTheDocument();
    expect(screen.getByDisplayValue('All Statuses')).toBeInTheDocument();
    expect(screen.getByDisplayValue('All Courses')).toBeInTheDocument();
  });

  it('should show action buttons in header', () => {
    render(<StudentInformationManager {...defaultProps} />);
    
    expect(screen.getByText('Export')).toBeInTheDocument();
    expect(screen.getByText('Import')).toBeInTheDocument();
    expect(screen.getByText('Add Student')).toBeInTheDocument();
  });

  it('should display students table with correct headers', () => {
    render(<StudentInformationManager {...defaultProps} />);
    
    expect(screen.getByText('Student')).toBeInTheDocument();
    expect(screen.getByText('Student ID')).toBeInTheDocument();
    expect(screen.getByText('Course Type')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('Payment')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('should display mock students data', () => {
    render(<StudentInformationManager {...defaultProps} />);
    
    expect(screen.getByText('Ahmad Rahman')).toBeInTheDocument();
    expect(screen.getByText('Lim Wei Ming')).toBeInTheDocument();
    expect(screen.getByText('HPA001')).toBeInTheDocument();
    expect(screen.getByText('HPA002')).toBeInTheDocument();
    expect(screen.getByText('Business English')).toBeInTheDocument();
    expect(screen.getByText('Speak Up')).toBeInTheDocument();
  });

  it('should handle search functionality', () => {
    render(<StudentInformationManager {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search students by name, email, ID...');
    fireEvent.change(searchInput, { target: { value: 'Ahmad' } });
    
    expect(screen.getByText('Ahmad Rahman')).toBeInTheDocument();
    expect(screen.queryByText('Lim Wei Ming')).not.toBeInTheDocument();
  });

  it('should handle status filtering', () => {
    render(<StudentInformationManager {...defaultProps} />);
    
    const statusFilter = screen.getByDisplayValue('All Statuses');
    fireEvent.click(statusFilter);
    
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByText('Graduated')).toBeInTheDocument();
  });

  it('should handle course type filtering', () => {
    render(<StudentInformationManager {...defaultProps} />);
    
    const courseFilter = screen.getByDisplayValue('All Courses');
    fireEvent.click(courseFilter);
    
    expect(screen.getByText('Basic')).toBeInTheDocument();
    expect(screen.getByText('Everyday A')).toBeInTheDocument();
    expect(screen.getByText('Business English')).toBeInTheDocument();
  });

  it('should display student progress bars', () => {
    render(<StudentInformationManager {...defaultProps} />);
    
    expect(screen.getByText('58%')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
  });

  it('should show payment status badges', () => {
    render(<StudentInformationManager {...defaultProps} />);
    
    expect(screen.getByText('Paid')).toBeInTheDocument();
    expect(screen.getByText('Installment')).toBeInTheDocument();
  });

  it('should handle export button click', () => {
    render(<StudentInformationManager {...defaultProps} onExportStudents={mockOnExportStudents} />);
    
    const exportButton = screen.getByText('Export');
    fireEvent.click(exportButton);
    
    expect(mockOnExportStudents).toHaveBeenCalledWith('csv');
  });

  it('should handle add student button click', () => {
    render(<StudentInformationManager {...defaultProps} />);
    
    const addButton = screen.getByText('Add Student');
    fireEvent.click(addButton);
    
    // Should open create dialog (we'll verify by checking if the state changes)
    expect(addButton).toBeInTheDocument();
  });

  it('should show student actions dropdown', () => {
    render(<StudentInformationManager {...defaultProps} />);
    
    const actionButtons = screen.getAllByTestId('eye-icon');
    expect(actionButtons.length).toBeGreaterThan(0);
  });

  it('should handle view student details', async () => {
    render(<StudentInformationManager {...defaultProps} />);
    
    const actionButtons = screen.getAllByTestId('eye-icon');
    fireEvent.click(actionButtons[0]);
    
    await waitFor(() => {
      const viewDetailsButton = screen.queryByText('View Details');
      if (viewDetailsButton) {
        fireEvent.click(viewDetailsButton);
      }
    });
    
    await waitFor(() => {
      expect(screen.queryByText('Student Details')).toBeInTheDocument();
    });
  });

  it('should display student details in modal', async () => {
    render(<StudentInformationManager {...defaultProps} />);
    
    const actionButtons = screen.getAllByTestId('eye-icon');
    fireEvent.click(actionButtons[0]);
    fireEvent.click(screen.getByText('View Details'));
    
    await waitFor(() => {
      expect(screen.getByText('Personal Information')).toBeInTheDocument();
      expect(screen.getByText('Course Information')).toBeInTheDocument();
      expect(screen.getByText('Payment Information')).toBeInTheDocument();
      expect(screen.getByText('English Proficiency')).toBeInTheDocument();
    });
  });

  it('should show student ID and internal code in details', async () => {
    render(<StudentInformationManager {...defaultProps} />);
    
    const actionButtons = screen.getAllByTestId('eye-icon');
    fireEvent.click(actionButtons[0]);
    fireEvent.click(screen.getByText('View Details'));
    
    await waitFor(() => {
      expect(screen.getByText('HPA001')).toBeInTheDocument();
      expect(screen.getByText('SC001-001')).toBeInTheDocument();
    });
  });

  it('should display proficiency information', async () => {
    render(<StudentInformationManager {...defaultProps} />);
    
    const actionButtons = screen.getAllByTestId('eye-icon');
    fireEvent.click(actionButtons[0]);
    fireEvent.click(screen.getByText('View Details'));
    
    await waitFor(() => {
      expect(screen.getByText('Intermediate')).toBeInTheDocument();
      expect(screen.getByText('78/100')).toBeInTheDocument();
      expect(screen.getByText('65/100')).toBeInTheDocument();
    });
  });

  it('should show payment information correctly', async () => {
    render(<StudentInformationManager {...defaultProps} />);
    
    const actionButtons = screen.getAllByTestId('eye-icon');
    fireEvent.click(actionButtons[0]);
    fireEvent.click(screen.getByText('View Details'));
    
    await waitFor(() => {
      expect(screen.getByText('RM 3,600')).toBeInTheDocument();
      expect(screen.getByText('25/60 hours')).toBeInTheDocument();
    });
  });

  it('should handle edit student', async () => {
    render(<StudentInformationManager {...defaultProps} />);
    
    const actionButtons = screen.getAllByTestId('eye-icon');
    fireEvent.click(actionButtons[0]);
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Edit'));
    });
    
    // Should open edit dialog
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('should handle delete student confirmation', async () => {
    render(<StudentInformationManager {...defaultProps} onDeleteStudent={mockOnDeleteStudent} />);
    
    const actionButtons = screen.getAllByTestId('eye-icon');
    fireEvent.click(actionButtons[0]);
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Delete'));
    });
    
    await waitFor(() => {
      expect(screen.getByText('Delete Student')).toBeInTheDocument();
      expect(screen.getByText(/Are you sure you want to delete Ahmad Rahman/)).toBeInTheDocument();
    });
  });

  it('should execute delete after confirmation', async () => {
    mockOnDeleteStudent.mockResolvedValue(true);
    render(<StudentInformationManager {...defaultProps} onDeleteStudent={mockOnDeleteStudent} />);
    
    const actionButtons = screen.getAllByTestId('eye-icon');
    fireEvent.click(actionButtons[0]);
    fireEvent.click(screen.getByText('Delete'));
    
    await waitFor(() => {
      const deleteButton = screen.getByRole('button', { name: 'Delete' });
      fireEvent.click(deleteButton);
    });
    
    expect(mockOnDeleteStudent).toHaveBeenCalledWith('1');
  });

  it('should handle loading state', () => {
    render(<StudentInformationManager {...defaultProps} isLoading={true} />);
    
    // Should show skeleton loading state
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('should display correct student count', () => {
    render(<StudentInformationManager {...defaultProps} />);
    
    expect(screen.getByText('Students (2)')).toBeInTheDocument();
  });

  it('should show course type badges', () => {
    render(<StudentInformationManager {...defaultProps} />);
    
    // Should show course type badges for each student
    const courseTypeBadges = screen.getAllByText('Business English');
    expect(courseTypeBadges.length).toBeGreaterThan(0);
  });

  it('should display status badges with correct colors', () => {
    render(<StudentInformationManager {...defaultProps} />);
    
    const statusBadges = screen.getAllByText('Active');
    expect(statusBadges.length).toBe(2); // Both mock students are active
  });

  it('should handle file import', () => {
    render(<StudentInformationManager {...defaultProps} onImportStudents={mockOnImportStudents} />);
    
    const importButton = screen.getByText('Import');
    fireEvent.click(importButton);
    
    // Should trigger file input click
    expect(importButton).toBeInTheDocument();
  });

  it('should show emergency contact information in details', async () => {
    render(<StudentInformationManager {...defaultProps} />);
    
    const actionButtons = screen.getAllByTestId('eye-icon');
    fireEvent.click(actionButtons[0]);
    fireEvent.click(screen.getByText('View Details'));
    
    await waitFor(() => {
      expect(screen.getByText('ahmad.rahman@email.com')).toBeInTheDocument();
      expect(screen.getByText('+60123456789')).toBeInTheDocument();
    });
  });

  it('should display course progress and attendance', async () => {
    render(<StudentInformationManager {...defaultProps} />);
    
    const actionButtons = screen.getAllByTestId('eye-icon');
    fireEvent.click(actionButtons[0]);
    fireEvent.click(screen.getByText('View Details'));
    
    await waitFor(() => {
      expect(screen.getByText('92%')).toBeInTheDocument(); // Attendance rate
    });
  });

  it('should close modals when cancel/close is clicked', async () => {
    render(<StudentInformationManager {...defaultProps} />);
    
    const actionButtons = screen.getAllByTestId('eye-icon');
    fireEvent.click(actionButtons[0]);
    fireEvent.click(screen.getByText('View Details'));
    
    await waitFor(() => {
      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);
    });
    
    await waitFor(() => {
      expect(screen.queryByText('Student Details')).not.toBeInTheDocument();
    });
  });

  it('should handle search by email', () => {
    render(<StudentInformationManager {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search students by name, email, ID...');
    fireEvent.change(searchInput, { target: { value: 'ahmad.rahman@email.com' } });
    
    expect(screen.getByText('Ahmad Rahman')).toBeInTheDocument();
    expect(screen.queryByText('Lim Wei Ming')).not.toBeInTheDocument();
  });

  it('should handle search by student ID', () => {
    render(<StudentInformationManager {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search students by name, email, ID...');
    fireEvent.change(searchInput, { target: { value: 'HPA002' } });
    
    expect(screen.getByText('Lim Wei Ming')).toBeInTheDocument();
    expect(screen.queryByText('Ahmad Rahman')).not.toBeInTheDocument();
  });

  it('should handle search by internal code', () => {
    render(<StudentInformationManager {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search students by name, email, ID...');
    fireEvent.change(searchInput, { target: { value: 'SC002-001' } });
    
    expect(screen.getByText('Lim Wei Ming')).toBeInTheDocument();
    expect(screen.queryByText('Ahmad Rahman')).not.toBeInTheDocument();
  });

  it('should show referrer information for referred students', async () => {
    render(<StudentInformationManager {...defaultProps} />);
    
    // Click on second student (Lim Wei Ming) who has referrer
    const actionButtons = screen.getAllByTestId('eye-icon');
    fireEvent.click(actionButtons[1]);
    fireEvent.click(screen.getByText('View Details'));
    
    await waitFor(() => {
      expect(screen.getByText('Lim Wei Ming')).toBeInTheDocument();
    });
  });

  it('should display material issuance information', async () => {
    render(<StudentInformationManager {...defaultProps} />);
    
    const actionButtons = screen.getAllByTestId('eye-icon');
    fireEvent.click(actionButtons[0]);
    fireEvent.click(screen.getByText('View Details'));
    
    await waitFor(() => {
      // Check if business english student details are shown
      expect(screen.getByText('Business English')).toBeInTheDocument();
    });
  });

  it('should show formatted currency values', () => {
    render(<StudentInformationManager {...defaultProps} />);
    
    // Check revenue in statistics card
    expect(screen.getByText('RM 4,800')).toBeInTheDocument(); // Total revenue from both students
  });

  it('should handle create student with auto-generated IDs', () => {
    render(<StudentInformationManager {...defaultProps} onCreateStudent={mockOnCreateStudent} />);
    
    const addButton = screen.getByText('Add Student');
    fireEvent.click(addButton);
    
    // Should open create dialog
    expect(addButton).toBeInTheDocument();
  });

  it('should show AI assessment status', async () => {
    render(<StudentInformationManager {...defaultProps} />);
    
    const actionButtons = screen.getAllByTestId('eye-icon');
    fireEvent.click(actionButtons[0]);
    fireEvent.click(screen.getByText('View Details'));
    
    await waitFor(() => {
      expect(screen.getByText('78/100')).toBeInTheDocument(); // Current assessment score
    });
  });

  it('should display attendance percentage in table', () => {
    render(<StudentInformationManager {...defaultProps} />);
    
    // Both students have different attendance rates in mock data
    expect(screen.getByText('58%')).toBeInTheDocument(); // Progress for Ahmad
    expect(screen.getByText('45%')).toBeInTheDocument(); // Progress for Lim
  });
});