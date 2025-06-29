import { parse } from 'csv-parse/browser/esm';
import * as XLSX from 'xlsx';

export interface ImportResult {
  success: boolean;
  data?: any[];
  errors?: ImportError[];
  totalRows?: number;
  successCount?: number;
  errorCount?: number;
}

export interface ImportError {
  row: number;
  field?: string;
  message: string;
}

export interface ColumnMapping {
  field: string;
  label: string;
  required?: boolean;
  validator?: (value: any) => boolean | string;
  mapper?: (value: any) => any;
}

export interface ImportOptions {
  columnMappings: ColumnMapping[];
  onProgress?: (progress: number) => void;
  batchSize?: number;
}

export interface ExportOptions {
  filename: string;
  columns: ColumnMapping[];
  format: 'csv' | 'excel';
}

// Validators
export const validators = {
  required: (value: any) => {
    if (value === null || value === undefined || value === '') {
      return 'This field is required';
    }
    return true;
  },
  email: (value: any) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (value && !emailRegex.test(value)) {
      return 'Invalid email format';
    }
    return true;
  },
  phone: (value: any) => {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    if (value && !phoneRegex.test(value)) {
      return 'Invalid phone format';
    }
    return true;
  },
  date: (value: any) => {
    if (value && isNaN(Date.parse(value))) {
      return 'Invalid date format';
    }
    return true;
  },
  enum: (allowedValues: string[]) => (value: any) => {
    if (value && !allowedValues.includes(value)) {
      return `Value must be one of: ${allowedValues.join(', ')}`;
    }
    return true;
  }
};

// Mappers
export const mappers = {
  date: (value: any) => {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date.toISOString();
  },
  boolean: (value: any) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return ['true', '1', 'yes', 'y'].includes(value.toLowerCase());
    }
    return false;
  },
  number: (value: any) => {
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  }
};

// Parse CSV file
export async function parseCSVFile(file: File, options: ImportOptions): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const records = await parseCSV(text);
        const result = await processImportData(records, options);
        resolve(result);
      } catch (error) {
        resolve({
          success: false,
          errors: [{ row: 0, message: `Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}` }]
        });
      }
    };
    
    reader.onerror = () => {
      resolve({
        success: false,
        errors: [{ row: 0, message: 'Failed to read file' }]
      });
    };
    
    reader.readAsText(file);
  });
}

// Parse Excel file
export async function parseExcelFile(file: File, options: ImportOptions): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const records = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Convert to object format
        const headers = records[0] as string[];
        const dataRows = (records.slice(1) as any[][]).map((row: any[]) => {
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[header] = row[index];
          });
          return obj;
        });
        
        const result = await processImportData(dataRows, options);
        resolve(result);
      } catch (error) {
        resolve({
          success: false,
          errors: [{ row: 0, message: `Failed to parse Excel: ${error instanceof Error ? error.message : 'Unknown error'}` }]
        });
      }
    };
    
    reader.onerror = () => {
      resolve({
        success: false,
        errors: [{ row: 0, message: 'Failed to read file' }]
      });
    };
    
    reader.readAsArrayBuffer(file);
  });
}

// Parse CSV text
async function parseCSV(text: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }, (err, records) => {
      if (err) {
        reject(err);
      } else {
        resolve(records);
      }
    });
  });
}

// Process import data
async function processImportData(
  records: any[],
  options: ImportOptions
): Promise<ImportResult> {
  const errors: ImportError[] = [];
  const processedData: any[] = [];
  const batchSize = options.batchSize || 50;
  
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const processedRecord: any = {};
    let hasError = false;
    
    // Validate and map each field
    for (const mapping of options.columnMappings) {
      const value = record[mapping.label] || record[mapping.field];
      
      // Validate
      if (mapping.required && !value) {
        errors.push({
          row: i + 2, // +2 because Excel/CSV starts at 1 and has header
          field: mapping.field,
          message: `${mapping.label} is required`
        });
        hasError = true;
        continue;
      }
      
      if (mapping.validator && value) {
        const validationResult = mapping.validator(value);
        if (validationResult !== true) {
          errors.push({
            row: i + 2,
            field: mapping.field,
            message: typeof validationResult === 'string' ? validationResult : `Invalid ${mapping.label}`
          });
          hasError = true;
          continue;
        }
      }
      
      // Map value
      processedRecord[mapping.field] = mapping.mapper ? mapping.mapper(value) : value;
    }
    
    if (!hasError) {
      processedData.push(processedRecord);
    }
    
    // Report progress
    if (options.onProgress && i % batchSize === 0) {
      options.onProgress((i / records.length) * 100);
    }
  }
  
  // Final progress
  if (options.onProgress) {
    options.onProgress(100);
  }
  
  return {
    success: errors.length === 0,
    data: processedData,
    errors: errors.length > 0 ? errors : undefined,
    totalRows: records.length,
    successCount: processedData.length,
    errorCount: errors.length
  };
}

// Export data to CSV
export function exportToCSV(data: any[], options: ExportOptions): void {
  const headers = options.columns.map(col => col.label);
  const rows = data.map(item => 
    options.columns.map(col => {
      const value = item[col.field];
      // Escape quotes and wrap in quotes if contains comma
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value ?? '';
    })
  );
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  downloadFile(csvContent, options.filename, 'text/csv');
}

// Export data to Excel
export function exportToExcel(data: any[], options: ExportOptions): void {
  const ws_data = [
    options.columns.map(col => col.label),
    ...data.map(item => options.columns.map(col => item[col.field] ?? ''))
  ];
  
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  
  // Auto-size columns
  const colWidths = options.columns.map((col) => {
    const maxLength = Math.max(
      col.label.length,
      ...data.map(item => String(item[col.field] ?? '').length)
    );
    return { wch: Math.min(maxLength + 2, 50) };
  });
  ws['!cols'] = colWidths;
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  
  downloadFile(blob, options.filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

// Download file helper
function downloadFile(content: string | Blob, filename: string, mimeType: string): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Parse import file (auto-detect format)
export async function parseImportFile(file: File, options: ImportOptions): Promise<ImportResult> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (extension === 'csv') {
    return parseCSVFile(file, options);
  } else if (extension === 'xlsx' || extension === 'xls') {
    return parseExcelFile(file, options);
  } else {
    return {
      success: false,
      errors: [{ row: 0, message: 'Unsupported file format. Please use CSV or Excel files.' }]
    };
  }
}