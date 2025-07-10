import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExportButton } from '../ExportButton';
import { analyticsExportService } from '@/lib/services/analytics-export-service';

// Mock the analytics export service
jest.mock('@/lib/services/analytics-export-service', () => ({
  analyticsExportService: {
    exportData: jest.fn(),
  },
}));

// Mock the UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <div onClick={onClick}>{children}</div>
  ),
  DropdownMenuLabel: ({ children }: any) => <div>{children}</div>,
  DropdownMenuSeparator: () => <div />,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
}));

const mockData = [
  { id: 1, name: 'John Doe', email: 'john@example.com', score: 85 },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', score: 92 },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', score: 78 },
];

describe('ExportButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders export button', () => {
    render(<ExportButton data={mockData} />);
    
    expect(screen.getByText('Export')).toBeInTheDocument();
  });

  it('disables button when no data is provided', () => {
    render(<ExportButton data={[]} />);
    
    const button = screen.getByText('Export');
    expect(button).toBeDisabled();
  });

  it('calls export service when quick export is triggered', async () => {
    const mockExportData = jest.fn().mockResolvedValue(undefined);
    (analyticsExportService.exportData as jest.Mock) = mockExportData;

    render(<ExportButton data={mockData} showDropdown={false} />);
    
    const button = screen.getByText('Export');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockExportData).toHaveBeenCalledWith(
        mockData,
        expect.objectContaining({
          format: 'excel',
          includeHeaders: true,
          includeMetadata: true,
        }),
        expect.objectContaining({
          title: 'Export Data',
          generatedBy: 'Hey Peter Analytics',
        })
      );
    });
  });

  it('shows loading state during export', async () => {
    const mockExportData = jest.fn().mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );
    (analyticsExportService.exportData as jest.Mock) = mockExportData;

    render(<ExportButton data={mockData} showDropdown={false} />);
    
    const button = screen.getByText('Export');
    fireEvent.click(button);

    expect(screen.getByText('Exporting...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Export')).toBeInTheDocument();
    });
  });

  it('calls onExportComplete callback on successful export', async () => {
    const mockExportData = jest.fn().mockResolvedValue(undefined);
    const mockOnExportComplete = jest.fn();
    (analyticsExportService.exportData as jest.Mock) = mockExportData;

    render(
      <ExportButton 
        data={mockData} 
        showDropdown={false}
        onExportComplete={mockOnExportComplete}
      />
    );
    
    const button = screen.getByText('Export');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOnExportComplete).toHaveBeenCalledWith(
        true,
        expect.stringContaining('Successfully exported 3 records')
      );
    });
  });

  it('calls onExportComplete callback on failed export', async () => {
    const mockExportData = jest.fn().mockRejectedValue(new Error('Export failed'));
    const mockOnExportComplete = jest.fn();
    (analyticsExportService.exportData as jest.Mock) = mockExportData;

    render(
      <ExportButton 
        data={mockData} 
        showDropdown={false}
        onExportComplete={mockOnExportComplete}
      />
    );
    
    const button = screen.getByText('Export');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOnExportComplete).toHaveBeenCalledWith(
        false,
        expect.stringContaining('Export failed')
      );
    });
  });

  it('uses custom title and filename', async () => {
    const mockExportData = jest.fn().mockResolvedValue(undefined);
    (analyticsExportService.exportData as jest.Mock) = mockExportData;

    render(
      <ExportButton 
        data={mockData} 
        title="Custom Report"
        fileName="custom-report-2024"
        showDropdown={false}
      />
    );
    
    const button = screen.getByText('Export');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockExportData).toHaveBeenCalledWith(
        mockData,
        expect.objectContaining({
          fileName: 'custom-report-2024',
        }),
        expect.objectContaining({
          title: 'Custom Report',
        })
      );
    });
  });

  it('renders dropdown menu when showDropdown is true', () => {
    render(<ExportButton data={mockData} showDropdown={true} />);
    
    // The dropdown should be present (mocked implementation)
    expect(screen.getByText('Export')).toBeInTheDocument();
  });
});