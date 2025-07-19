import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudentManagerSimplified } from '../StudentManagerSimplified';

// Mock icons
jest.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon">Search</div>,
  Edit: () => <div data-testid="edit-icon">Edit</div>,
  Trash2: () => <div data-testid="trash-icon">Trash2</div>,
  Eye: () => <div data-testid="eye-icon">Eye</div>,
  Plus: () => <div data-testid="plus-icon">Plus</div>,
}));

const mockStudents = [
  {
    id: '1',
    student_id: 'HPA001',
    full_name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    test_level: 'Intermediate',
    status: 'Active' as const,
    progress_percentage: 75,
    payment_status: 'Paid' as const,
    profile_photo: undefined,
  },
  {
    id: '2',
    student_id: 'HPA002',
    full_name: 'Jane Smith',
    email: 'jane@example.com',
    phone: '+1234567891',
    test_level: 'Advanced',
    status: 'Active' as const,
    progress_percentage: 90,
    payment_status: 'Pending' as const,
    profile_photo: undefined,
  },
  {
    id: '3',
    student_id: 'HPA003',
    full_name: 'Bob Wilson',
    email: 'bob@example.com',
    test_level: 'Beginner',
    status: 'Graduated' as const,
    progress_percentage: 100,
    payment_status: 'Paid' as const,
    profile_photo: undefined,
  },
];

describe('StudentManagerSimplified', () => {
  const user = userEvent.setup();
  
  const defaultProps = {
    students: mockStudents,
    loading: false,
  };

  it('should render student manager with header', () => {
    render(<StudentManagerSimplified {...defaultProps} />);
    
    expect(screen.getByText('Student Management')).toBeInTheDocument();
    expect(screen.getByText('Manage your students efficiently')).toBeInTheDocument();
  });

  it('should display correct statistics', () => {
    render(<StudentManagerSimplified {...defaultProps} />);
    
    expect(screen.getByText('3')).toBeInTheDocument(); // Total students
    expect(screen.getByText('2')).toBeInTheDocument(); // Active students (John and Jane)
    expect(screen.getByText('1')).toBeInTheDocument(); // Graduated students (Bob)
  });

  it('should render all students in table', () => {
    render(<StudentManagerSimplified {...defaultProps} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    
    expect(screen.getByText('HPA001')).toBeInTheDocument();
    expect(screen.getByText('HPA002')).toBeInTheDocument();
    expect(screen.getByText('HPA003')).toBeInTheDocument();
  });

  it('should show correct student count', () => {
    render(<StudentManagerSimplified {...defaultProps} />);
    
    expect(screen.getByText('Students (3)')).toBeInTheDocument();
  });

  it('should handle search functionality', async () => {
    render(<StudentManagerSimplified {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search students by name, email, or ID...');
    
    await user.type(searchInput, 'John');
    
    // Should show only John Doe
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument();
    
    // Student count should update
    expect(screen.getByText('Students (1)')).toBeInTheDocument();
  });

  it('should search by email', async () => {
    render(<StudentManagerSimplified {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search students by name, email, or ID...');
    
    await user.type(searchInput, 'jane@example.com');
    
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    expect(screen.queryByText('Bob Wilson')).not.toBeInTheDocument();
  });

  it('should search by student ID', async () => {
    render(<StudentManagerSimplified {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search students by name, email, or ID...');
    
    await user.type(searchInput, 'HPA003');
    
    expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
  });

  it('should clear search results when search term is empty', async () => {
    render(<StudentManagerSimplified {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search students by name, email, or ID...');
    
    // Search for something
    await user.type(searchInput, 'John');
    expect(screen.getByText('Students (1)')).toBeInTheDocument();
    
    // Clear search
    await user.clear(searchInput);
    expect(screen.getByText('Students (3)')).toBeInTheDocument();
  });

  it('should display student status badges with correct colors', () => {
    render(<StudentManagerSimplified {...defaultProps} />);
    
    const activeBadges = screen.getAllByText('Active');
    expect(activeBadges).toHaveLength(2);
    
    const graduatedBadge = screen.getByText('Graduated');
    expect(graduatedBadge).toBeInTheDocument();
  });

  it('should display payment status badges', () => {
    render(<StudentManagerSimplified {...defaultProps} />);
    
    const paidBadges = screen.getAllByText('Paid');
    expect(paidBadges).toHaveLength(2);
    
    const pendingBadge = screen.getByText('Pending');
    expect(pendingBadge).toBeInTheDocument();
  });

  it('should display progress bars with correct values', () => {
    render(<StudentManagerSimplified {...defaultProps} />);
    
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('should display course levels', () => {
    render(<StudentManagerSimplified {...defaultProps} />);
    
    expect(screen.getByText('Intermediate')).toBeInTheDocument();
    expect(screen.getByText('Advanced')).toBeInTheDocument();
    expect(screen.getByText('Beginner')).toBeInTheDocument();
  });

  it('should display student avatars with initials', () => {
    render(<StudentManagerSimplified {...defaultProps} />);
    
    // Check for avatar fallback initials
    expect(screen.getByText('JD')).toBeInTheDocument(); // John Doe
    expect(screen.getByText('JS')).toBeInTheDocument(); // Jane Smith
    expect(screen.getByText('BW')).toBeInTheDocument(); // Bob Wilson
  });

  it('should render Add Student button when onAdd is provided', () => {
    const onAdd = jest.fn();
    render(<StudentManagerSimplified {...defaultProps} onAdd={onAdd} />);
    
    const addButton = screen.getByRole('button', { name: /add student/i });
    expect(addButton).toBeInTheDocument();
  });

  it('should call onAdd when Add Student button is clicked', async () => {
    const onAdd = jest.fn();
    render(<StudentManagerSimplified {...defaultProps} onAdd={onAdd} />);
    
    const addButton = screen.getByRole('button', { name: /add student/i });
    await user.click(addButton);
    
    expect(onAdd).toHaveBeenCalled();
  });

  it('should not render Add Student button when onAdd is not provided', () => {
    render(<StudentManagerSimplified {...defaultProps} />);
    
    const addButton = screen.queryByRole('button', { name: /add student/i });
    expect(addButton).not.toBeInTheDocument();
  });

  it('should render action buttons when handlers are provided', () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    const onView = jest.fn();
    
    render(
      <StudentManagerSimplified 
        {...defaultProps} 
        onEdit={onEdit}
        onDelete={onDelete}
        onView={onView}
      />
    );
    
    // Should have 3 students × 3 action buttons each = 9 action buttons
    expect(screen.getAllByTestId('eye-icon')).toHaveLength(3);
    expect(screen.getAllByTestId('edit-icon')).toHaveLength(3);
    expect(screen.getAllByTestId('trash-icon')).toHaveLength(3);
  });

  it('should call action handlers when buttons are clicked', async () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    const onView = jest.fn();
    
    render(
      <StudentManagerSimplified 
        {...defaultProps} 
        onEdit={onEdit}
        onDelete={onDelete}
        onView={onView}
      />
    );
    
    // Click first student's view button
    const viewButtons = screen.getAllByTestId('eye-icon');
    await user.click(viewButtons[0]);
    expect(onView).toHaveBeenCalledWith('1');
    
    // Click first student's edit button
    const editButtons = screen.getAllByTestId('edit-icon');
    await user.click(editButtons[0]);
    expect(onEdit).toHaveBeenCalledWith('1');
    
    // Click first student's delete button
    const deleteButtons = screen.getAllByTestId('trash-icon');
    await user.click(deleteButtons[0]);
    expect(onDelete).toHaveBeenCalledWith('1');
  });

  it('should show loading skeleton when loading is true', () => {
    render(<StudentManagerSimplified {...defaultProps} loading={true} />);
    
    // Should show loading skeleton instead of content
    expect(screen.queryByText('Student Management')).not.toBeInTheDocument();
    
    // Should show skeleton elements
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should handle empty student list', () => {
    render(<StudentManagerSimplified students={[]} loading={false} />);
    
    expect(screen.getByText('Students (0)')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument(); // Total students stat
  });

  it('should handle students without course levels', () => {
    const studentsWithoutCourse = [
      {
        ...mockStudents[0],
        test_level: undefined,
      },
    ];
    
    render(<StudentManagerSimplified students={studentsWithoutCourse} loading={false} />);
    
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('should handle search case insensitivity', async () => {
    render(<StudentManagerSimplified {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search students by name, email, or ID...');
    
    await user.type(searchInput, 'JOHN');
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
  });

  it('should maintain search state on re-render', async () => {
    const { rerender } = render(<StudentManagerSimplified {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search students by name, email, or ID...');
    
    await user.type(searchInput, 'John');
    expect(screen.getByText('Students (1)')).toBeInTheDocument();
    
    // Re-render with same props
    rerender(<StudentManagerSimplified {...defaultProps} />);
    
    // Search should still be active
    expect(searchInput).toHaveValue('John');
    expect(screen.getByText('Students (1)')).toBeInTheDocument();
  });
});
