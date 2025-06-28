import * as XLSX from 'xlsx';

export interface ImportResult<T> {
  data: T[];
  errors: Array<{
    row: number;
    field?: string;
    message: string;
  }>;
  totalRows: number;
  successCount: number;
  errorCount: number;
}

export interface ExportOptions {
  format: 'csv' | 'xlsx';
  filename: string;
  columns: Array<{
    key: string;
    header: string;
    transform?: (value: any) => any;
  }>;
}

export class ImportExportService {
  /**
   * Parse CSV file content
   */
  static async parseCSV<T>(
    content: string,
    options: {
      columns?: string[];
      skipHeader?: boolean;
      validator?: (row: any, index: number) => { valid: boolean; errors?: string[] };
    } = {}
  ): Promise<ImportResult<T>> {
    const result: ImportResult<T> = {
      data: [],
      errors: [],
      totalRows: 0,
      successCount: 0,
      errorCount: 0,
    };

    try {
      // Simple CSV parsing
      const lines = content.split('\n').filter(line => line.trim());
      
      // Parse header
      let headers: string[];
      let dataStartLine: number;
      
      if (options.columns) {
        headers = options.columns;
        dataStartLine = options.skipHeader ? 1 : 0;
      } else {
        headers = lines[0].split(',').map(h => h.trim());
        dataStartLine = 1; // Skip the header row if we parsed it
      }
      
      // Parse data rows
      for (let i = dataStartLine; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const record: any = {};
        
        headers.forEach((header, index) => {
          record[header] = values[index] || '';
        });

        const rowNumber = i + 1;

        if (options.validator) {
          const validation = options.validator(record, i - dataStartLine);
          if (!validation.valid) {
            result.errors.push({
              row: rowNumber,
              message: validation.errors?.join(', ') || 'Validation failed',
            });
            result.errorCount++;
            continue;
          }
        }

        result.data.push(record as T);
        result.successCount++;
      }

      result.totalRows = lines.length - dataStartLine;
    } catch (error) {
      result.errors.push({
        row: 0,
        message: `CSV parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return result;
  }

  /**
   * Parse Excel file content
   */
  static async parseExcel<T>(
    buffer: ArrayBuffer,
    options: {
      sheetName?: string;
      columns?: string[];
      validator?: (row: any, index: number) => { valid: boolean; errors?: string[] };
    } = {}
  ): Promise<ImportResult<T>> {
    const result: ImportResult<T> = {
      data: [],
      errors: [],
      totalRows: 0,
      successCount: 0,
      errorCount: 0,
    };

    try {
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = options.sheetName || workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      if (!worksheet) {
        throw new Error(`Sheet "${sheetName}" not found`);
      }

      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: options.columns || undefined,
        defval: '',
      });

      result.totalRows = jsonData.length;

      jsonData.forEach((record: any, index: number) => {
        const rowNumber = index + 2; // Excel rows start at 1, plus header

        if (options.validator) {
          const validation = options.validator(record, index);
          if (!validation.valid) {
            result.errors.push({
              row: rowNumber,
              message: validation.errors?.join(', ') || 'Validation failed',
            });
            result.errorCount++;
            return;
          }
        }

        result.data.push(record as T);
        result.successCount++;
      });
    } catch (error) {
      result.errors.push({
        row: 0,
        message: `Excel parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return result;
  }

  /**
   * Export data to CSV format
   */
  static exportToCSV(data: any[], options: ExportOptions): string {
    // Create header row
    const headers = options.columns.map(col => col.header);
    const csvRows = [headers.join(',')];

    // Create data rows
    data.forEach(row => {
      const values = options.columns.map(col => {
        const value = row[col.key];
        const transformed = col.transform ? col.transform(value) : value;
        // Escape quotes and wrap in quotes if contains comma
        const stringValue = String(transformed || '');
        if (stringValue.includes(',') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csvRows.push(values.join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * Export data to Excel format
   */
  static exportToExcel(data: any[], options: ExportOptions): ArrayBuffer {
    const transformedData = data.map(row => {
      const transformed: any = {};
      options.columns.forEach(col => {
        const value = row[col.key];
        transformed[col.header] = col.transform ? col.transform(value) : value;
      });
      return transformed;
    });

    const worksheet = XLSX.utils.json_to_sheet(transformedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

    // Auto-size columns
    const maxWidth = 50;
    const colWidths = options.columns.map(col => {
      const headerLength = col.header.length;
      const maxDataLength = Math.max(
        ...transformedData.map(row => String(row[col.header] || '').length)
      );
      return { wch: Math.min(maxWidth, Math.max(headerLength, maxDataLength) + 2) };
    });
    worksheet['!cols'] = colWidths;

    return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  }

  /**
   * Download file in browser
   */
  static downloadFile(content: string | ArrayBuffer, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Batch import with progress callback
   */
  static async batchImport<T>(
    data: T[],
    options: {
      batchSize?: number;
      processor: (batch: T[]) => Promise<void>;
      onProgress?: (processed: number, total: number) => void;
    }
  ): Promise<void> {
    const batchSize = options.batchSize || 100;
    const totalBatches = Math.ceil(data.length / batchSize);
    let processedCount = 0;

    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, data.length);
      const batch = data.slice(start, end);

      await options.processor(batch);
      processedCount += batch.length;

      if (options.onProgress) {
        options.onProgress(processedCount, data.length);
      }
    }
  }
}

// Validation helpers
export const validators = {
  required: (fieldName: string) => (value: any) => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return `${fieldName} is required`;
    }
    return null;
  },

  email: (value: any) => {
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'Invalid email format';
    }
    return null;
  },

  phone: (value: any) => {
    if (value && !/^\+?[\d\s-()]+$/.test(value)) {
      return 'Invalid phone format';
    }
    return null;
  },

  date: (value: any) => {
    if (value && isNaN(Date.parse(value))) {
      return 'Invalid date format';
    }
    return null;
  },

  enum: (allowedValues: string[]) => (value: any) => {
    if (value && !allowedValues.includes(value)) {
      return `Must be one of: ${allowedValues.join(', ')}`;
    }
    return null;
  },
};

// Field mapper for common transformations
export const fieldMappers = {
  date: (value: any) => {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date.toISOString();
  },

  boolean: (value: any) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      return lower === 'true' || lower === 'yes' || lower === '1';
    }
    return !!value;
  },

  number: (value: any) => {
    if (value === '' || value === null || value === undefined) return null;
    const num = Number(value);
    return isNaN(num) ? null : num;
  },

  trim: (value: any) => {
    return typeof value === 'string' ? value.trim() : value;
  },
};