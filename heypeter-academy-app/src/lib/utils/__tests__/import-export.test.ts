import { 
  validators, 
  mappers, 
  exportToCSV, 
  exportToExcel,
  parseImportFile,
  type ColumnMapping,
  type ImportOptions,
  type ExportOptions
} from '../import-export';

// Mock XLSX module
jest.mock('xlsx', () => ({
  read: jest.fn(),
  utils: {
    sheet_to_json: jest.fn(),
    aoa_to_sheet: jest.fn(),
    book_new: jest.fn(),
    book_append_sheet: jest.fn(),
  },
  write: jest.fn(),
}));

// Mock csv-parse
jest.mock('csv-parse/browser/esm', () => ({
  parse: jest.fn(),
}));

// Mock DOM methods
Object.defineProperty(global, 'URL', {
  value: {
    createObjectURL: jest.fn(() => 'mock-url'),
    revokeObjectURL: jest.fn(),
  },
});

Object.defineProperty(global, 'FileReader', {
  value: class MockFileReader {
    readAsText = jest.fn();
    readAsArrayBuffer = jest.fn();
    onload: ((event: any) => void) | null = null;
    onerror: (() => void) | null = null;
    result: string | ArrayBuffer | null = null;
  },
});

Object.defineProperty(global, 'Blob', {
  value: class MockBlob {
    constructor(public content: any[], public options?: { type?: string }) {}
  },
});

// Mock document methods
Object.defineProperty(global.document, 'createElement', {
  value: jest.fn(() => ({
    href: '',
    download: '',
    click: jest.fn(),
  })),
});

Object.defineProperty(global.document.body, 'appendChild', {
  value: jest.fn(),
});

Object.defineProperty(global.document.body, 'removeChild', {
  value: jest.fn(),
});

describe('Import/Export Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Validators', () => {
    describe('required validator', () => {
      it('should return error message for empty values', () => {
        expect(validators.required('')).toBe('This field is required');
        expect(validators.required(null)).toBe('This field is required');
        expect(validators.required(undefined)).toBe('This field is required');
      });

      it('should return true for valid values', () => {
        expect(validators.required('test')).toBe(true);
        expect(validators.required(0)).toBe(true);
        expect(validators.required(false)).toBe(true);
      });
    });

    describe('email validator', () => {
      it('should return true for valid emails', () => {
        expect(validators.email('test@example.com')).toBe(true);
        expect(validators.email('user.name+tag@domain.co.uk')).toBe(true);
        expect(validators.email('')).toBe(true); // Empty is allowed
      });

      it('should return error message for invalid emails', () => {
        expect(validators.email('invalid-email')).toBe('Invalid email format');
        expect(validators.email('test@')).toBe('Invalid email format');
        expect(validators.email('@domain.com')).toBe('Invalid email format');
      });
    });

    describe('phone validator', () => {
      it('should return true for valid phone numbers', () => {
        expect(validators.phone('+1-234-567-8900')).toBe(true);
        expect(validators.phone('(123) 456-7890')).toBe(true);
        expect(validators.phone('1234567890')).toBe(true);
        expect(validators.phone('')).toBe(true); // Empty is allowed
      });

      it('should return error message for invalid phone numbers', () => {
        expect(validators.phone('invalid-phone')).toBe('Invalid phone format');
        expect(validators.phone('123-abc-7890')).toBe('Invalid phone format');
      });
    });

    describe('date validator', () => {
      it('should return true for valid dates', () => {
        expect(validators.date('2024-01-01')).toBe(true);
        expect(validators.date('Jan 1, 2024')).toBe(true);
        expect(validators.date('')).toBe(true); // Empty is allowed
      });

      it('should return error message for invalid dates', () => {
        expect(validators.date('invalid-date')).toBe('Invalid date format');
        expect(validators.date('2024-13-01')).toBe('Invalid date format');
      });
    });

    describe('enum validator', () => {
      const enumValidator = validators.enum(['admin', 'user', 'guest']);

      it('should return true for valid enum values', () => {
        expect(enumValidator('admin')).toBe(true);
        expect(enumValidator('user')).toBe(true);
        expect(enumValidator('')).toBe(true); // Empty is allowed
      });

      it('should return error message for invalid enum values', () => {
        expect(enumValidator('invalid')).toBe('Value must be one of: admin, user, guest');
      });
    });
  });

  describe('Mappers', () => {
    describe('date mapper', () => {
      it('should convert valid dates to ISO string', () => {
        const result = mappers.date('2024-01-01');
        expect(result).toBe(new Date('2024-01-01').toISOString());
      });

      it('should return null for invalid dates', () => {
        expect(mappers.date('invalid-date')).toBe(null);
        expect(mappers.date('')).toBe(null);
        expect(mappers.date(null)).toBe(null);
      });
    });

    describe('boolean mapper', () => {
      it('should convert truthy strings to true', () => {
        expect(mappers.boolean('true')).toBe(true);
        expect(mappers.boolean('TRUE')).toBe(true);
        expect(mappers.boolean('1')).toBe(true);
        expect(mappers.boolean('yes')).toBe(true);
        expect(mappers.boolean('Y')).toBe(true);
      });

      it('should convert falsy strings to false', () => {
        expect(mappers.boolean('false')).toBe(false);
        expect(mappers.boolean('0')).toBe(false);
        expect(mappers.boolean('no')).toBe(false);
        expect(mappers.boolean('')).toBe(false);
      });

      it('should handle boolean values directly', () => {
        expect(mappers.boolean(true)).toBe(true);
        expect(mappers.boolean(false)).toBe(false);
      });
    });

    describe('number mapper', () => {
      it('should convert valid numbers', () => {
        expect(mappers.number('123')).toBe(123);
        expect(mappers.number('123.45')).toBe(123.45);
        expect(mappers.number('-456')).toBe(-456);
      });

      it('should return null for invalid numbers', () => {
        expect(mappers.number('invalid')).toBe(null);
        expect(mappers.number('')).toBe(null);
      });
    });
  });

  describe('Export Functions', () => {
    const testData = [
      { name: 'John Doe', email: 'john@example.com', age: 30 },
      { name: 'Jane Smith', email: 'jane@example.com', age: 25 },
    ];

    const testColumns: ColumnMapping[] = [
      { field: 'name', label: 'Full Name' },
      { field: 'email', label: 'Email Address' },
      { field: 'age', label: 'Age' },
    ];

    describe('exportToCSV', () => {
      it('should generate CSV content correctly', () => {
        const options: ExportOptions = {
          filename: 'test.csv',
          columns: testColumns,
          format: 'csv',
        };

        exportToCSV(testData, options);

        expect(global.document.createElement).toHaveBeenCalledWith('a');
        expect(global.URL.createObjectURL).toHaveBeenCalled();
      });

      it('should handle values with commas and quotes', () => {
        const dataWithSpecialChars = [
          { name: 'John, Jr.', email: 'john@example.com', description: 'Says "Hello"' },
        ];

        const columnsWithDescription: ColumnMapping[] = [
          { field: 'name', label: 'Name' },
          { field: 'email', label: 'Email' },
          { field: 'description', label: 'Description' },
        ];

        const options: ExportOptions = {
          filename: 'test.csv',
          columns: columnsWithDescription,
          format: 'csv',
        };

        exportToCSV(dataWithSpecialChars, options);

        expect(global.URL.createObjectURL).toHaveBeenCalled();
      });
    });

    describe('exportToExcel', () => {
      it('should generate Excel content correctly', () => {
        const mockWorksheet = {};
        const mockWorkbook = {};

        const XLSX = require('xlsx');
        XLSX.utils.aoa_to_sheet.mockReturnValue(mockWorksheet);
        XLSX.utils.book_new.mockReturnValue(mockWorkbook);
        XLSX.write.mockReturnValue(new ArrayBuffer(8));

        const options: ExportOptions = {
          filename: 'test.xlsx',
          columns: testColumns,
          format: 'excel',
        };

        exportToExcel(testData, options);

        expect(XLSX.utils.aoa_to_sheet).toHaveBeenCalled();
        expect(XLSX.utils.book_new).toHaveBeenCalled();
        expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(mockWorkbook, mockWorksheet, 'Data');
        expect(XLSX.write).toHaveBeenCalledWith(mockWorkbook, { bookType: 'xlsx', type: 'array' });
      });
    });
  });

  describe('File Parsing', () => {
    describe('parseImportFile', () => {
      it('should detect CSV files correctly', async () => {
        const csvFile = new File(['name,email\nJohn,john@test.com'], 'test.csv', { type: 'text/csv' });
        const options: ImportOptions = {
          columnMappings: [
            { field: 'name', label: 'name' },
            { field: 'email', label: 'email' },
          ],
        };

        // Mock FileReader for CSV
        const mockFileReader = new (global as any).FileReader();
        jest.spyOn(global as any, 'FileReader').mockImplementation(() => mockFileReader);

        // Mock csv-parse
        const { parse } = require('csv-parse/browser/esm');
        parse.mockImplementation((text: string, config: any, callback: Function) => {
          callback(null, [{ name: 'John', email: 'john@test.com' }]);
        });

        const promise = parseImportFile(csvFile, options);

        // Simulate successful file read
        mockFileReader.result = 'name,email\nJohn,john@test.com';
        if (mockFileReader.onload) {
          mockFileReader.onload({ target: { result: mockFileReader.result } } as any);
        }

        const result = await promise;
        expect(result.success).toBe(true);
        expect(result.data).toHaveLength(1);
      });

      it('should reject unsupported file formats', async () => {
        const unsupportedFile = new File(['content'], 'test.txt', { type: 'text/plain' });
        const options: ImportOptions = {
          columnMappings: [{ field: 'test', label: 'Test' }],
        };

        const result = await parseImportFile(unsupportedFile, options);
        expect(result.success).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors![0].message).toBe('Unsupported file format. Please use CSV or Excel files.');
      });

      it('should handle file read errors', async () => {
        const csvFile = new File(['name,email\nJohn,john@test.com'], 'test.csv', { type: 'text/csv' });
        const options: ImportOptions = {
          columnMappings: [{ field: 'name', label: 'name' }],
        };

        const mockFileReader = new (global as any).FileReader();
        jest.spyOn(global as any, 'FileReader').mockImplementation(() => mockFileReader);

        const promise = parseImportFile(csvFile, options);

        // Simulate file read error
        if (mockFileReader.onerror) {
          mockFileReader.onerror();
        }

        const result = await promise;
        expect(result.success).toBe(false);
        expect(result.errors![0].message).toBe('Failed to read file');
      });
    });
  });

  describe('Data Processing', () => {
    it('should validate required fields', async () => {
      const csvFile = new File(['name,email\n,john@test.com'], 'test.csv', { type: 'text/csv' });
      const options: ImportOptions = {
        columnMappings: [
          { field: 'name', label: 'name', required: true },
          { field: 'email', label: 'email' },
        ],
      };

      const mockFileReader = new (global as any).FileReader();
      jest.spyOn(global as any, 'FileReader').mockImplementation(() => mockFileReader);

      const { parse } = require('csv-parse/browser/esm');
      parse.mockImplementation((text: string, config: any, callback: Function) => {
        callback(null, [{ name: '', email: 'john@test.com' }]);
      });

      const promise = parseImportFile(csvFile, options);

      mockFileReader.result = 'name,email\n,john@test.com';
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: mockFileReader.result } } as any);
      }

      const result = await promise;
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0].message).toBe('name is required');
    });

    it('should apply validators correctly', async () => {
      const csvFile = new File(['name,email\nJohn,invalid-email'], 'test.csv', { type: 'text/csv' });
      const options: ImportOptions = {
        columnMappings: [
          { field: 'name', label: 'name' },
          { field: 'email', label: 'email', validator: validators.email },
        ],
      };

      const mockFileReader = new (global as any).FileReader();
      jest.spyOn(global as any, 'FileReader').mockImplementation(() => mockFileReader);

      const { parse } = require('csv-parse/browser/esm');
      parse.mockImplementation((text: string, config: any, callback: Function) => {
        callback(null, [{ name: 'John', email: 'invalid-email' }]);
      });

      const promise = parseImportFile(csvFile, options);

      mockFileReader.result = 'name,email\nJohn,invalid-email';
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: mockFileReader.result } } as any);
      }

      const result = await promise;
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0].message).toBe('Invalid email format');
    });

    it('should apply mappers correctly', async () => {
      const csvFile = new File(['name,active\nJohn,true'], 'test.csv', { type: 'text/csv' });
      const options: ImportOptions = {
        columnMappings: [
          { field: 'name', label: 'name' },
          { field: 'active', label: 'active', mapper: mappers.boolean },
        ],
      };

      const mockFileReader = new (global as any).FileReader();
      jest.spyOn(global as any, 'FileReader').mockImplementation(() => mockFileReader);

      const { parse } = require('csv-parse/browser/esm');
      parse.mockImplementation((text: string, config: any, callback: Function) => {
        callback(null, [{ name: 'John', active: 'true' }]);
      });

      const promise = parseImportFile(csvFile, options);

      mockFileReader.result = 'name,active\nJohn,true';
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: mockFileReader.result } } as any);
      }

      const result = await promise;
      expect(result.success).toBe(true);
      expect(result.data![0].active).toBe(true);
    });

    it('should report progress correctly', async () => {
      const progressCallback = jest.fn();
      const csvFile = new File(['name\nJohn\nJane\nBob'], 'test.csv', { type: 'text/csv' });
      const options: ImportOptions = {
        columnMappings: [{ field: 'name', label: 'name' }],
        onProgress: progressCallback,
        batchSize: 1,
      };

      const mockFileReader = new (global as any).FileReader();
      jest.spyOn(global as any, 'FileReader').mockImplementation(() => mockFileReader);

      const { parse } = require('csv-parse/browser/esm');
      parse.mockImplementation((text: string, config: any, callback: Function) => {
        callback(null, [
          { name: 'John' },
          { name: 'Jane' },
          { name: 'Bob' },
        ]);
      });

      const promise = parseImportFile(csvFile, options);

      mockFileReader.result = 'name\nJohn\nJane\nBob';
      if (mockFileReader.onload) {
        mockFileReader.onload({ target: { result: mockFileReader.result } } as any);
      }

      await promise;
      expect(progressCallback).toHaveBeenCalled();
      expect(progressCallback).toHaveBeenLastCalledWith(100);
    });
  });
});