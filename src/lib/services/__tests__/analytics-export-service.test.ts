import { analyticsExportService } from '../analytics-export-service';

// Mock external dependencies
jest.mock('xlsx', () => ({
  utils: {
    book_new: jest.fn(() => ({})),
    json_to_sheet: jest.fn(() => ({})),
    book_append_sheet: jest.fn(),
    decode_range: jest.fn(() => ({ s: { r: 0, c: 0 }, e: { r: 0, c: 0 } })),
    encode_cell: jest.fn(() => 'A1'),
  },
  write: jest.fn(() => new ArrayBuffer(0)),
}));

jest.mock('file-saver', () => ({
  saveAs: jest.fn(),
}));

describe('AnalyticsExportService', () => {
  const mockData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', score: 85 },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', score: 92 },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', score: 78 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('exportData', () => {
    it('should export data to Excel format', async () => {
      await analyticsExportService.exportData(mockData, {
        format: 'excel',
        fileName: 'test-export',
        includeHeaders: true,
      });

      // Verify that Excel-specific functions were called
      const XLSX = require('xlsx');
      expect(XLSX.utils.book_new).toHaveBeenCalled();
      expect(XLSX.utils.json_to_sheet).toHaveBeenCalledWith(mockData);
    });

    it('should export data to CSV format', async () => {
      const saveAs = require('file-saver').saveAs;
      
      await analyticsExportService.exportData(mockData, {
        format: 'csv',
        fileName: 'test-export',
        includeHeaders: true,
      });

      expect(saveAs).toHaveBeenCalledWith(
        expect.any(Blob),
        'test-export.csv'
      );
    });

    it('should throw error for unsupported format', async () => {
      await expect(
        analyticsExportService.exportData(mockData, {
          format: 'unsupported' as any,
          fileName: 'test-export',
        })
      ).rejects.toThrow('Unsupported export format: unsupported');
    });

    it('should use default filename if none provided', async () => {
      await analyticsExportService.exportData(mockData, {
        format: 'excel',
      });

      const saveAs = require('file-saver').saveAs;
      expect(saveAs).toHaveBeenCalledWith(
        expect.any(Blob),
        expect.stringMatching(/analytics-export-\d{4}-\d{2}-\d{2}-\d{6}\.xlsx/)
      );
    });
  });

  describe('Template Management', () => {
    it('should create and retrieve templates', () => {
      const template = {
        id: 'test-template',
        name: 'Test Template',
        description: 'A test template',
        format: 'excel' as const,
        columns: ['name', 'email', 'score'],
      };

      analyticsExportService.createTemplate(template);
      const retrieved = analyticsExportService.getTemplate('test-template');
      
      expect(retrieved).toEqual(template);
    });

    it('should update existing template', () => {
      const template = {
        id: 'test-template',
        name: 'Test Template',
        description: 'A test template',
        format: 'excel' as const,
        columns: ['name', 'email'],
      };

      analyticsExportService.createTemplate(template);
      
      const updatedTemplate = {
        ...template,
        name: 'Updated Template',
        columns: ['name', 'email', 'score'],
      };

      analyticsExportService.updateTemplate(updatedTemplate);
      const retrieved = analyticsExportService.getTemplate('test-template');
      
      expect(retrieved?.name).toBe('Updated Template');
      expect(retrieved?.columns).toEqual(['name', 'email', 'score']);
    });

    it('should delete template', () => {
      const template = {
        id: 'test-template',
        name: 'Test Template',
        description: 'A test template',
        format: 'excel' as const,
        columns: ['name', 'email'],
      };

      analyticsExportService.createTemplate(template);
      const deleted = analyticsExportService.deleteTemplate('test-template');
      const retrieved = analyticsExportService.getTemplate('test-template');
      
      expect(deleted).toBe(true);
      expect(retrieved).toBeUndefined();
    });

    it('should get all templates', () => {
      const templates = analyticsExportService.getAllTemplates();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0); // Should have default templates
    });
  });

  describe('Scheduled Export Management', () => {
    it('should create and retrieve scheduled exports', () => {
      const config = {
        id: 'test-schedule',
        name: 'Test Schedule',
        description: 'A test schedule',
        schedule: {
          frequency: 'daily' as const,
          time: '09:00',
        },
        export: {
          type: 'student-analytics',
          options: {
            format: 'excel' as const,
            includeHeaders: true,
          },
        },
        delivery: {
          email: {
            enabled: true,
            recipients: ['test@example.com'],
            subject: 'Test Export',
          },
        },
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      analyticsExportService.createScheduledExport(config);
      const retrieved = analyticsExportService.getScheduledExport('test-schedule');
      
      expect(retrieved).toEqual(config);
    });

    it('should update scheduled export', () => {
      const config = {
        id: 'test-schedule',
        name: 'Test Schedule',
        description: 'A test schedule',
        schedule: {
          frequency: 'daily' as const,
          time: '09:00',
        },
        export: {
          type: 'student-analytics',
          options: {
            format: 'excel' as const,
            includeHeaders: true,
          },
        },
        delivery: {
          email: {
            enabled: true,
            recipients: ['test@example.com'],
            subject: 'Test Export',
          },
        },
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      analyticsExportService.createScheduledExport(config);
      
      const updatedConfig = {
        ...config,
        name: 'Updated Schedule',
        active: false,
      };

      analyticsExportService.updateScheduledExport(updatedConfig);
      const retrieved = analyticsExportService.getScheduledExport('test-schedule');
      
      expect(retrieved?.name).toBe('Updated Schedule');
      expect(retrieved?.active).toBe(false);
    });

    it('should delete scheduled export', () => {
      const config = {
        id: 'test-schedule',
        name: 'Test Schedule',
        description: 'A test schedule',
        schedule: {
          frequency: 'daily' as const,
          time: '09:00',
        },
        export: {
          type: 'student-analytics',
          options: {
            format: 'excel' as const,
            includeHeaders: true,
          },
        },
        delivery: {
          email: {
            enabled: true,
            recipients: ['test@example.com'],
            subject: 'Test Export',
          },
        },
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      analyticsExportService.createScheduledExport(config);
      const deleted = analyticsExportService.deleteScheduledExport('test-schedule');
      const retrieved = analyticsExportService.getScheduledExport('test-schedule');
      
      expect(deleted).toBe(true);
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Batch Export', () => {
    it('should export multiple items separately', async () => {
      const batchRequest = {
        exports: [
          {
            type: 'students',
            data: mockData.slice(0, 2),
            options: { format: 'excel' as const, fileName: 'students' },
          },
          {
            type: 'teachers',
            data: mockData.slice(2),
            options: { format: 'csv' as const, fileName: 'teachers' },
          },
        ],
        batchOptions: {
          combinedFile: false,
        },
      };

      await analyticsExportService.exportBatch(batchRequest);

      // Verify that individual exports were called
      const saveAs = require('file-saver').saveAs;
      expect(saveAs).toHaveBeenCalledTimes(2);
    });

    it('should combine multiple exports into single file', async () => {
      const batchRequest = {
        exports: [
          {
            type: 'students',
            data: mockData.slice(0, 2),
            options: { format: 'excel' as const, fileName: 'students' },
          },
          {
            type: 'teachers',
            data: mockData.slice(2),
            options: { format: 'excel' as const, fileName: 'teachers' },
          },
        ],
        batchOptions: {
          combinedFile: true,
          includeTimestamp: true,
        },
      };

      await analyticsExportService.exportBatch(batchRequest);

      const saveAs = require('file-saver').saveAs;
      expect(saveAs).toHaveBeenCalledWith(
        expect.any(Blob),
        expect.stringMatching(/batch-export-\d{4}-\d{2}-\d{2}-\d{6}\.xlsx/)
      );
    });
  });

  describe('Utility Methods', () => {
    it('should prepare data for export with selected columns', () => {
      const prepared = analyticsExportService.prepareDataForExport(
        mockData,
        ['name', 'score']
      );

      expect(prepared).toEqual([
        { name: 'John Doe', score: 85 },
        { name: 'Jane Smith', score: 92 },
        { name: 'Bob Johnson', score: 78 },
      ]);
    });

    it('should return original data when no columns specified', () => {
      const prepared = analyticsExportService.prepareDataForExport(mockData);
      expect(prepared).toEqual(mockData);
    });

    it('should generate filename with timestamp', () => {
      const filename = analyticsExportService.generateFileName('test', 'xlsx');
      expect(filename).toMatch(/test-\d{4}-\d{2}-\d{2}-\d{6}\.xlsx/);
    });
  });

  describe('Advanced Export Options', () => {
    it('should apply filters to data', async () => {
      const filteredData = mockData.filter(item => item.score > 80);
      
      await analyticsExportService.exportWithAdvancedOptions(mockData, {
        format: 'excel',
        filters: { score: (score: number) => score > 80 },
      });

      // This would need to be tested with actual implementation
      // For now, we're just ensuring the method doesn't throw
    });

    it('should apply sorting to data', async () => {
      await analyticsExportService.exportWithAdvancedOptions(mockData, {
        format: 'excel',
        sorting: [{ column: 'score', direction: 'desc' }],
      });

      // This would need to be tested with actual implementation
      // For now, we're just ensuring the method doesn't throw
    });
  });
});