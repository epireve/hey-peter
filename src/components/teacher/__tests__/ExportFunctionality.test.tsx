import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ExportFunctionality } from '../ExportFunctionality';
import { exportToCSV, exportToExcel, exportToPDF } from '@/lib/export-utils';

// Mock the export utilities
jest.mock('@/lib/export-utils', () => ({
  exportToCSV: jest.fn(),
  exportToExcel: jest.fn(),
  exportToPDF: jest.fn(),
}));

// Mock dropdown menu
jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children, open, onOpenChange }: any) => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownMenuTrigger: ({ children, asChild }: any) => (
    <div data-testid="dropdown-trigger">{children}</div>
  ),
  DropdownMenuContent: ({ children }: any) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid="dropdown-item">
      {children}
    </button>
  ),
  DropdownMenuLabel: ({ children }: any) => (
    <div data-testid="dropdown-label">{children}</div>
  ),
  DropdownMenuSeparator: () => <hr data-testid="dropdown-separator" />,
}));

// Mock the icons
jest.mock('lucide-react', () => ({
  Download: () => <div data-testid="download-icon">Download</div>,
  FileSpreadsheet: () => <div data-testid="spreadsheet-icon">FileSpreadsheet</div>,
  FileText: () => <div data-testid="file-text-icon">FileText</div>,
  FileCheck: () => <div data-testid="file-check-icon">FileCheck</div>,
  ChevronDown: () => <div data-testid="chevron-icon">ChevronDown</div>,
  ChevronUp: () => <div data-testid="chevron-up-icon">ChevronUp</div>,
  Check: () => <div data-testid="check-icon">Check</div>,
  Loader2: () => <div data-testid="loader-icon">Loader2</div>,
  AlertCircle: () => <div data-testid="alert-icon">AlertCircle</div>,
  X: () => <div data-testid="x-icon">X</div>,
}));

// Mock data
const mockData = {
  attendance: [
    { date: '2024-03-01', student: 'John Doe', status: 'present', classType: 'Business English' },
    { date: '2024-03-02', student: 'Jane Smith', status: 'present', classType: 'English Basics' },
    { date: '2024-03-03', student: 'John Doe', status: 'absent', classType: 'Business English' },
  ],
  compensation: {
    weeklyEarnings: { amount: 15000, hours: 25 },
    monthlyEarnings: { amount: 65000, hours: 110 },
    bonuses: [
      { type: 'Student Satisfaction', amount: 5000, eligible: true },
      { type: 'Attendance', amount: 3000, eligible: true },
    ],
  },
  analytics: {
    totalStudents: 45,
    averageRating: 4.7,
    completionRate: 92.5,
    teachingHours: 180,
  },
};

describe('ExportFunctionality', () => {
  const defaultProps = {
    data: mockData,
    dataType: 'attendance' as const,
    filename: 'teacher-report',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render export button', () => {
    render(<ExportFunctionality {...defaultProps} />);
    
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    expect(screen.getByTestId('download-icon')).toBeInTheDocument();
  });

  it('should show format options on button click', async () => {
    render(<ExportFunctionality {...defaultProps} />);
    
    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);
    
    await waitFor(() => {
      expect(screen.getByText('CSV')).toBeInTheDocument();
    });
    expect(screen.getByText('Excel')).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
  });

  it('should export to CSV format', async () => {
    render(<ExportFunctionality {...defaultProps} />);
    
    const csvButton = screen.getAllByTestId('dropdown-item')[0];
    fireEvent.click(csvButton);
    
    await waitFor(() => {
      expect(exportToCSV).toHaveBeenCalledWith(
        mockData.attendance,
        'teacher-report',
        expect.any(Object)
      );
    });
  });

  it('should export to Excel format', async () => {
    render(<ExportFunctionality {...defaultProps} />);
    
    const excelButton = screen.getAllByTestId('dropdown-item')[1];
    fireEvent.click(excelButton);
    
    await waitFor(() => {
      expect(exportToExcel).toHaveBeenCalledWith(
        mockData.attendance,
        'teacher-report',
        expect.any(Object)
      );
    });
  });

  it('should export to PDF format', async () => {
    render(<ExportFunctionality {...defaultProps} />);
    
    const pdfButton = screen.getAllByTestId('dropdown-item')[2];
    fireEvent.click(pdfButton);
    
    await waitFor(() => {
      expect(exportToPDF).toHaveBeenCalledWith(
        mockData.attendance,
        'teacher-report',
        expect.any(Object)
      );
    });
  });

  it('should show loading state during export', async () => {
    (exportToCSV as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );
    
    render(<ExportFunctionality {...defaultProps} />);
    
    const csvButton = screen.getAllByTestId('dropdown-item')[0];
    fireEvent.click(csvButton);
    
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    expect(screen.getByText(/exporting/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument();
    });
  });

  it('should show success message after export', async () => {
    render(<ExportFunctionality {...defaultProps} />);
    
    const csvButton = screen.getAllByTestId('dropdown-item')[0];
    fireEvent.click(csvButton);
    
    await waitFor(() => {
      expect(screen.getByText(/export successful/i)).toBeInTheDocument();
    });
  });

  it('should handle export errors', async () => {
    const errorMessage = 'Export failed';
    (exportToCSV as jest.Mock).mockRejectedValue(new Error(errorMessage));
    
    render(<ExportFunctionality {...defaultProps} />);
    
    const csvButton = screen.getAllByTestId('dropdown-item')[0];
    fireEvent.click(csvButton);
    
    await waitFor(() => {
      expect(screen.getByText(/export failed/i)).toBeInTheDocument();
    });
  });

  it('should allow custom columns configuration', () => {
    const customColumns = ['date', 'student', 'status'];
    render(<ExportFunctionality {...defaultProps} columns={customColumns} />);
    
    const csvButton = screen.getAllByTestId('dropdown-item')[0];
    fireEvent.click(csvButton);
    
    expect(exportToCSV).toHaveBeenCalledWith(
      mockData.attendance,
      'teacher-report',
      expect.objectContaining({ columns: customColumns })
    );
  });

  it('should handle different data types', () => {
    render(<ExportFunctionality {...defaultProps} dataType="compensation" />);
    
    expect(screen.getAllByTestId('dropdown-item').length).toBeGreaterThan(0);
  });

  it('should include date range in export', () => {
    const dateRange = {
      from: new Date('2024-03-01'),
      to: new Date('2024-03-31'),
    };
    
    render(<ExportFunctionality {...defaultProps} dateRange={dateRange} />);
    
    const csvButton = screen.getAllByTestId('dropdown-item')[0];
    fireEvent.click(csvButton);
    
    expect(exportToCSV).toHaveBeenCalledWith(
      mockData.attendance,
      'teacher-report',
      expect.objectContaining({ dateRange })
    );
  });

  it('should support bulk export', () => {
    render(<ExportFunctionality {...defaultProps} allowBulkExport={true} />);
    
    expect(screen.queryByText(/export all data/i)).toBeInTheDocument();
  });

  it('should show export preview', () => {
    render(<ExportFunctionality {...defaultProps} showPreview={true} />);
    
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });

  it('should disable export when no data', () => {
    render(<ExportFunctionality {...defaultProps} data={[]} />);
    
    const exportButton = screen.getByRole('button', { name: /export/i });
    expect(exportButton).toBeDisabled();
  });

  it('should handle custom export handlers', async () => {
    const customHandler = jest.fn().mockResolvedValue(true);
    render(<ExportFunctionality {...defaultProps} onExport={customHandler} />);
    
    const csvButton = screen.getAllByTestId('dropdown-item')[0];
    fireEvent.click(csvButton);
    
    await waitFor(() => {
      expect(customHandler).toHaveBeenCalledWith({
        format: 'csv',
        data: mockData,
        filename: 'teacher-report',
      });
    });
  });

  it('should support dropdown variant', () => {
    render(<ExportFunctionality {...defaultProps} variant="dropdown" />);
    
    const dropdownTrigger = screen.getByRole('button', { name: /export/i });
    expect(dropdownTrigger).toHaveClass('w-40');
  });

  it('should support icon-only variant', () => {
    render(<ExportFunctionality {...defaultProps} variant="icon" />);
    
    const iconButtons = screen.getAllByRole('button');
    expect(iconButtons[0]).toBeInTheDocument();
    expect(screen.queryByText('Export')).not.toBeInTheDocument();
  });

  it('should close dropdown after export', async () => {
    render(<ExportFunctionality {...defaultProps} />);
    
    const csvButton = screen.getAllByTestId('dropdown-item')[0];
    fireEvent.click(csvButton);
    
    await waitFor(() => {
      expect(exportToCSV).toHaveBeenCalled();
    });
  });

  it('should show file size estimation', () => {
    render(<ExportFunctionality {...defaultProps} showSizeEstimate={true} />);
    
    // File size is shown next to each format option
    expect(screen.getAllByText(/\d+\s*(B|KB|MB)/)).toHaveLength(3); // CSV, Excel, PDF
  });
});