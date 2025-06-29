import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportExportDialog } from '../ImportExportDialog';

// Mock the toast hook
jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn(),
}));

// Mock the import-export utilities
jest.mock('@/lib/utils/import-export', () => ({
  parseImportFile: jest.fn(),
  exportToCSV: jest.fn(),
  exportToExcel: jest.fn(),
  validators: {
    email: jest.fn(() => true),
  },
}));

const mockProps = {
  open: true,
  onOpenChange: jest.fn(),
  title: 'Test Import/Export',
  description: 'Test description',
  columns: [
    { field: 'name', label: 'Name', required: true },
    { field: 'email', label: 'Email' },
  ],
  onImport: jest.fn(),
  onExport: jest.fn(),
  templateUrl: '/templates/test.csv',
};

describe('ImportExportDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when open', () => {
    render(<ImportExportDialog {...mockProps} />);
    
    expect(screen.getByText('Test Import/Export')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
    expect(screen.getByText('Import Data')).toBeInTheDocument();
    expect(screen.getByText('Export Data')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<ImportExportDialog {...mockProps} open={false} />);
    
    expect(screen.queryByText('Test Import/Export')).not.toBeInTheDocument();
  });

  it('switches between import and export modes', async () => {
    const user = userEvent.setup();
    render(<ImportExportDialog {...mockProps} />);
    
    // Should default to import mode
    expect(screen.getByText('Drag & drop your file here, or click to browse')).toBeInTheDocument();
    
    // Switch to export mode
    await user.click(screen.getByLabelText('Export Data'));
    
    expect(screen.getByText('CSV Format')).toBeInTheDocument();
    expect(screen.getByText('Excel Format (.xlsx)')).toBeInTheDocument();
  });

  it('handles file selection', async () => {
    const user = userEvent.setup();
    render(<ImportExportDialog {...mockProps} />);
    
    const file = new File(['name,email\nJohn,john@test.com'], 'test.csv', { type: 'text/csv' });
    const input = document.getElementById('file-upload') as HTMLInputElement;
    
    // Simulate file selection
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });
    
    fireEvent.change(input);
    
    await waitFor(() => {
      expect(screen.getByText('test.csv')).toBeInTheDocument();
    });
  });

  it('shows template download link when provided', () => {
    render(<ImportExportDialog {...mockProps} />);
    
    const templateLink = screen.getByText('Download template file');
    expect(templateLink).toBeInTheDocument();
    expect(templateLink.getAttribute('href')).toBe('/templates/test.csv');
  });

  it('handles import operation', async () => {
    const { parseImportFile } = require('@/lib/utils/import-export');
    parseImportFile.mockResolvedValue({
      success: true,
      data: [{ name: 'John', email: 'john@test.com' }],
      successCount: 1,
    });

    const user = userEvent.setup();
    render(<ImportExportDialog {...mockProps} />);
    
    const file = new File(['name,email\nJohn,john@test.com'], 'test.csv', { type: 'text/csv' });
    const input = document.getElementById('file-upload') as HTMLInputElement;
    
    // Simulate file selection
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });
    
    fireEvent.change(input);
    
    await waitFor(() => {
      expect(screen.getByText('test.csv')).toBeInTheDocument();
    });
    
    const importButton = screen.getByRole('button', { name: /import/i });
    await user.click(importButton);
    
    await waitFor(() => {
      expect(mockProps.onImport).toHaveBeenCalledWith([{ name: 'John', email: 'john@test.com' }]);
      expect(mockProps.onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('handles export operation', async () => {
    mockProps.onExport.mockResolvedValue([
      { name: 'John', email: 'john@test.com' },
      { name: 'Jane', email: 'jane@test.com' },
    ]);

    const { exportToCSV } = require('@/lib/utils/import-export');

    const user = userEvent.setup();
    render(<ImportExportDialog {...mockProps} />);
    
    // Switch to export mode
    await user.click(screen.getByLabelText('Export Data'));
    
    const exportButton = screen.getByRole('button', { name: /export/i });
    await user.click(exportButton);
    
    await waitFor(() => {
      expect(mockProps.onExport).toHaveBeenCalled();
      expect(exportToCSV).toHaveBeenCalled();
      expect(mockProps.onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('shows error when import fails', async () => {
    const { parseImportFile } = require('@/lib/utils/import-export');
    parseImportFile.mockResolvedValue({
      success: false,
      errors: [{ row: 2, message: 'Invalid email format' }],
      errorCount: 1,
    });

    const user = userEvent.setup();
    render(<ImportExportDialog {...mockProps} />);
    
    const file = new File(['name,email\nJohn,invalid-email'], 'test.csv', { type: 'text/csv' });
    const input = document.getElementById('file-upload') as HTMLInputElement;
    
    // Simulate file selection
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });
    
    fireEvent.change(input);
    
    await waitFor(() => {
      expect(screen.getByText('test.csv')).toBeInTheDocument();
    });
    
    const importButton = screen.getByRole('button', { name: /import/i });
    await user.click(importButton);
    
    await waitFor(() => {
      expect(screen.getByText(/import failed with 1 errors/i)).toBeInTheDocument();
      expect(screen.getByText(/row 2: invalid email format/i)).toBeInTheDocument();
    });
  });

  it('disables import button when no file is selected', () => {
    render(<ImportExportDialog {...mockProps} />);
    
    const importButton = screen.getByRole('button', { name: /import/i });
    expect(importButton).toBeDisabled();
  });

  it('handles drag and drop', async () => {
    render(<ImportExportDialog {...mockProps} />);
    
    const dropZone = screen.getByText(/drag & drop your file here/i).closest('div');
    const file = new File(['name,email\nJohn,john@test.com'], 'test.csv', { type: 'text/csv' });
    
    fireEvent.dragOver(dropZone!, {
      dataTransfer: {
        files: [file],
      },
    });
    
    fireEvent.drop(dropZone!, {
      dataTransfer: {
        files: [file],
      },
    });
    
    await waitFor(() => {
      expect(screen.getByText('test.csv')).toBeInTheDocument();
    });
  });

  it('removes selected file when remove button is clicked', async () => {
    const user = userEvent.setup();
    render(<ImportExportDialog {...mockProps} />);
    
    const file = new File(['name,email\nJohn,john@test.com'], 'test.csv', { type: 'text/csv' });
    const input = document.getElementById('file-upload') as HTMLInputElement;
    
    // Simulate file selection
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });
    
    fireEvent.change(input);
    
    await waitFor(() => {
      expect(screen.getByText('test.csv')).toBeInTheDocument();
    });
    
    const removeButton = screen.getByRole('button', { name: /remove/i });
    await user.click(removeButton);
    
    expect(screen.queryByText('test.csv')).not.toBeInTheDocument();
    expect(screen.getByText(/drag & drop your file here/i)).toBeInTheDocument();
  });
});