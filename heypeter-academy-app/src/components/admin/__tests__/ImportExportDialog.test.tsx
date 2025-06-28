import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImportExportDialog } from '../ImportExportDialog';
import { ImportExportService } from '@/lib/utils/import-export';

// Mock the ImportExportService
jest.mock('@/lib/utils/import-export', () => ({
  ImportExportService: {
    parseCSV: jest.fn(),
    parseExcel: jest.fn(),
    exportToCSV: jest.fn(),
    exportToExcel: jest.fn(),
    downloadFile: jest.fn(),
    batchImport: jest.fn(),
  },
}));

describe('ImportExportDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    entityType: 'students' as const,
    onImport: jest.fn(),
    onExport: jest.fn(),
    columns: [
      { key: 'name', header: 'Name', required: true },
      { key: 'email', header: 'Email', required: true },
      { key: 'phone', header: 'Phone' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the dialog with correct title', () => {
    render(<ImportExportDialog {...defaultProps} />);
    expect(screen.getByText('Import/Export students')).toBeInTheDocument();
  });

  it('toggles between import and export modes', () => {
    render(<ImportExportDialog {...defaultProps} />);

    const importRadio = screen.getByLabelText('Import Data');
    const exportRadio = screen.getByLabelText('Export Data');

    expect(importRadio).toBeChecked();
    expect(exportRadio).not.toBeChecked();

    fireEvent.click(exportRadio);

    expect(importRadio).not.toBeChecked();
    expect(exportRadio).toBeChecked();
  });

  it('changes file format selection', async () => {
    render(<ImportExportDialog {...defaultProps} />);
    const user = userEvent.setup();

    const formatSelect = screen.getByRole('combobox');
    await user.click(formatSelect);

    const excelOption = screen.getByText('Excel (.xlsx)');
    await user.click(excelOption);

    expect(screen.getByText('Excel (.xlsx)')).toBeInTheDocument();
  });

  describe('Import mode', () => {
    it('handles file selection', async () => {
      render(<ImportExportDialog {...defaultProps} />);
      const user = userEvent.setup();

      const file = new File(['test,data'], 'test.csv', { type: 'text/csv' });
      const input = screen.getByLabelText('Select File');

      await user.upload(input, file);

      expect(screen.getByText(/Selected: test.csv/)).toBeInTheDocument();
    });

    it('imports CSV file successfully', async () => {
      const mockImportResult = {
        data: [
          { name: 'John Doe', email: 'john@example.com' },
          { name: 'Jane Smith', email: 'jane@example.com' },
        ],
        errors: [],
        totalRows: 2,
        successCount: 2,
        errorCount: 0,
      };

      (ImportExportService.parseCSV as jest.Mock).mockResolvedValue(mockImportResult);
      (ImportExportService.batchImport as jest.Mock).mockImplementation(
        async (data, options) => {
          await options.processor(data);
          options.onProgress(data.length, data.length);
        }
      );

      render(<ImportExportDialog {...defaultProps} />);
      const user = userEvent.setup();

      const file = new File(['name,email\nJohn,john@example.com'], 'test.csv', {
        type: 'text/csv',
      });
      const input = screen.getByLabelText('Select File');
      await user.upload(input, file);

      const importButton = screen.getByRole('button', { name: /Import/i });
      await user.click(importButton);

      await waitFor(() => {
        expect(screen.getByText(/Total rows: 2/)).toBeInTheDocument();
        expect(screen.getByText(/Success: 2/)).toBeInTheDocument();
        expect(screen.getByText(/Errors: 0/)).toBeInTheDocument();
      });

      expect(defaultProps.onImport).toHaveBeenCalledWith(mockImportResult.data);
    });

    it('handles import errors', async () => {
      const mockImportResult = {
        data: [],
        errors: [
          { row: 2, message: 'Name is required' },
          { row: 3, message: 'Email is required' },
        ],
        totalRows: 3,
        successCount: 1,
        errorCount: 2,
      };

      (ImportExportService.parseCSV as jest.Mock).mockResolvedValue(mockImportResult);

      render(<ImportExportDialog {...defaultProps} />);
      const user = userEvent.setup();

      const file = new File(['invalid data'], 'test.csv', { type: 'text/csv' });
      const input = screen.getByLabelText('Select File');
      await user.upload(input, file);

      const importButton = screen.getByRole('button', { name: /Import/i });
      await user.click(importButton);

      await waitFor(() => {
        expect(screen.getByText(/Errors: 2/)).toBeInTheDocument();
        expect(screen.getByText(/Row 2: Name is required/)).toBeInTheDocument();
        expect(screen.getByText(/Row 3: Email is required/)).toBeInTheDocument();
      });
    });

    it('imports Excel file', async () => {
      const mockImportResult = {
        data: [{ name: 'John Doe', email: 'john@example.com' }],
        errors: [],
        totalRows: 1,
        successCount: 1,
        errorCount: 0,
      };

      (ImportExportService.parseExcel as jest.Mock).mockResolvedValue(mockImportResult);
      (ImportExportService.batchImport as jest.Mock).mockResolvedValue(undefined);

      render(<ImportExportDialog {...defaultProps} />);
      const user = userEvent.setup();

      // Change format to Excel
      const formatSelect = screen.getByRole('combobox');
      await user.click(formatSelect);
      const excelOption = screen.getByText('Excel (.xlsx)');
      await user.click(excelOption);

      const file = new File(['excel data'], 'test.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const input = screen.getByLabelText('Select File');
      await user.upload(input, file);

      const importButton = screen.getByRole('button', { name: /Import/i });
      await user.click(importButton);

      await waitFor(() => {
        expect(ImportExportService.parseExcel).toHaveBeenCalled();
      });
    });

    it('shows progress during import', async () => {
      let progressCallback: ((processed: number, total: number) => void) | undefined;

      (ImportExportService.parseCSV as jest.Mock).mockResolvedValue({
        data: Array(100).fill({ name: 'Test', email: 'test@example.com' }),
        errors: [],
        totalRows: 100,
        successCount: 100,
        errorCount: 0,
      });

      (ImportExportService.batchImport as jest.Mock).mockImplementation(
        async (data, options) => {
          progressCallback = options.onProgress;
          // Simulate progress
          options.onProgress(50, 100);
        }
      );

      render(<ImportExportDialog {...defaultProps} />);
      const user = userEvent.setup();

      const file = new File(['data'], 'test.csv', { type: 'text/csv' });
      const input = screen.getByLabelText('Select File');
      await user.upload(input, file);

      const importButton = screen.getByRole('button', { name: /Import/i });
      await user.click(importButton);

      await waitFor(() => {
        expect(screen.getByText(/Processing... 50%/)).toBeInTheDocument();
      });
    });
  });

  describe('Export mode', () => {
    beforeEach(() => {
      const { rerender } = render(<ImportExportDialog {...defaultProps} />);
      const exportRadio = screen.getByLabelText('Export Data');
      fireEvent.click(exportRadio);
    });

    it('exports data as CSV', async () => {
      const mockData = [
        { name: 'John Doe', email: 'john@example.com', phone: '123-456-7890' },
        { name: 'Jane Smith', email: 'jane@example.com', phone: '098-765-4321' },
      ];

      defaultProps.onExport.mockResolvedValue(mockData);
      (ImportExportService.exportToCSV as jest.Mock).mockReturnValue('csv content');

      render(<ImportExportDialog {...defaultProps} />);
      const user = userEvent.setup();

      const exportRadio = screen.getByLabelText('Export Data');
      await user.click(exportRadio);

      const exportButton = screen.getByRole('button', { name: /Export/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(defaultProps.onExport).toHaveBeenCalled();
        expect(ImportExportService.exportToCSV).toHaveBeenCalledWith(mockData, {
          format: 'csv',
          filename: expect.stringContaining('students_'),
          columns: defaultProps.columns,
        });
        expect(ImportExportService.downloadFile).toHaveBeenCalledWith(
          'csv content',
          expect.stringContaining('.csv'),
          'text/csv'
        );
      });
    });

    it('exports data as Excel', async () => {
      const mockData = [{ name: 'John Doe', email: 'john@example.com' }];
      const mockBuffer = new ArrayBuffer(0);

      defaultProps.onExport.mockResolvedValue(mockData);
      (ImportExportService.exportToExcel as jest.Mock).mockReturnValue(mockBuffer);

      render(<ImportExportDialog {...defaultProps} />);
      const user = userEvent.setup();

      const exportRadio = screen.getByLabelText('Export Data');
      await user.click(exportRadio);

      // Change format to Excel
      const formatSelect = screen.getByRole('combobox');
      await user.click(formatSelect);
      const excelOption = screen.getByText('Excel (.xlsx)');
      await user.click(excelOption);

      const exportButton = screen.getByRole('button', { name: /Export/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(ImportExportService.exportToExcel).toHaveBeenCalledWith(mockData, {
          format: 'xlsx',
          filename: expect.stringContaining('students_'),
          columns: defaultProps.columns,
        });
        expect(ImportExportService.downloadFile).toHaveBeenCalledWith(
          mockBuffer,
          expect.stringContaining('.xlsx'),
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
      });
    });

    it('handles export errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      defaultProps.onExport.mockRejectedValue(new Error('Export failed'));

      render(<ImportExportDialog {...defaultProps} />);
      const user = userEvent.setup();

      const exportRadio = screen.getByLabelText('Export Data');
      await user.click(exportRadio);

      const exportButton = screen.getByRole('button', { name: /Export/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Export failed:', expect.any(Error));
      });

      consoleError.mockRestore();
    });
  });

  it('closes dialog when cancel is clicked', async () => {
    render(<ImportExportDialog {...defaultProps} />);
    const user = userEvent.setup();

    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    await user.click(cancelButton);

    expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('generates correct template URLs', () => {
    const { rerender } = render(<ImportExportDialog {...defaultProps} />);

    expect(screen.getByText('Download template')).toHaveAttribute(
      'href',
      '/templates/students_template.csv'
    );

    rerender(<ImportExportDialog {...defaultProps} entityType="teachers" />);
    expect(screen.getByText('Download template')).toHaveAttribute(
      'href',
      '/templates/teachers_template.csv'
    );
  });
});