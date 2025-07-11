import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { escapeHtml, sanitizeFilename } from '../utils/security';

export type ExportFormat = 'csv' | 'excel' | 'json' | 'pdf';

export interface ExportOptions {
  format: ExportFormat;
  fileName?: string;
  includeHeaders?: boolean;
  dateFormat?: string;
  includeMetadata?: boolean;
  customTemplate?: string;
  emailDelivery?: {
    enabled: boolean;
    recipients: string[];
    subject?: string;
    message?: string;
  };
}

export interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  format: ExportFormat;
  columns: string[];
  styling?: {
    headerStyle?: any;
    cellStyle?: any;
    brandingColors?: string[];
  };
  filters?: any;
  sorting?: any;
}

export interface BatchExportRequest {
  exports: {
    type: string;
    data: any;
    options: ExportOptions;
  }[];
  batchOptions?: {
    combinedFile?: boolean;
    includeTimestamp?: boolean;
    compression?: boolean;
  };
}

export interface ScheduledExportConfig {
  id: string;
  name: string;
  description: string;
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
  };
  export: {
    type: string;
    options: ExportOptions;
    filters?: any;
  };
  delivery: {
    email: {
      enabled: boolean;
      recipients: string[];
      subject: string;
      template?: string;
    };
    storage?: {
      enabled: boolean;
      path: string;
      retention: number; // days
    };
  };
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChartExportData {
  title: string;
  type: 'line' | 'bar' | 'pie' | 'area';
  data: any[];
  xAxis?: string;
  yAxis?: string;
}

class AnalyticsExportService {
  private templates: Map<string, ExportTemplate> = new Map();
  private scheduledExports: Map<string, ScheduledExportConfig> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates() {
    const defaultTemplates: ExportTemplate[] = [
      {
        id: 'student-performance',
        name: 'Student Performance Report',
        description: 'Comprehensive student performance analytics',
        format: 'excel',
        columns: ['name', 'progress', 'attendance', 'testScore', 'course', 'enrollment_date'],
        styling: {
          headerStyle: { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '4A90E2' } } },
          brandingColors: ['#4A90E2', '#50C878', '#FFD700', '#FF6B6B']
        }
      },
      {
        id: 'teacher-analytics',
        name: 'Teacher Analytics Report',
        description: 'Teacher performance and engagement metrics',
        format: 'excel',
        columns: ['name', 'classes_taught', 'student_satisfaction', 'attendance_rate', 'performance_score'],
        styling: {
          headerStyle: { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '10B981' } } },
          brandingColors: ['#10B981', '#3B82F6', '#F59E0B', '#EF4444']
        }
      },
      {
        id: 'financial-summary',
        name: 'Financial Summary Report',
        description: 'Revenue, expenses, and financial analytics',
        format: 'excel',
        columns: ['period', 'revenue', 'expenses', 'profit', 'student_count', 'avg_revenue_per_student'],
        styling: {
          headerStyle: { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '059669' } } },
          brandingColors: ['#059669', '#DC2626', '#D97706', '#7C3AED']
        }
      }
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  async exportData(
    data: any[],
    options: ExportOptions,
    metadata?: {
      title?: string;
      description?: string;
      generatedBy?: string;
      dateRange?: { start: Date; end: Date };
    }
  ): Promise<void> {
    try {
      const fileName = sanitizeFilename(options.fileName || `analytics-export-${format(new Date(), 'yyyy-MM-dd-HHmmss')}`);

      switch (options.format) {
        case 'csv':
          await this.exportToCSV(data, fileName, options);
          break;
        case 'excel':
          await this.exportToExcel(data, fileName, options, metadata);
          break;
        case 'json':
          await this.exportToJSON(data, fileName, metadata);
          break;
        case 'pdf':
          await this.exportToPDF(data, fileName, metadata);
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }

  async exportChart(
    chartData: ChartExportData,
    options: ExportOptions
  ): Promise<void> {
    try {
      const fileName = options.fileName || `chart-export-${format(new Date(), 'yyyy-MM-dd-HHmmss')}`;

      if (options.format === 'excel') {
        await this.exportChartToExcel(chartData, fileName);
      } else if (options.format === 'csv') {
        await this.exportToCSV(chartData.data, fileName, options);
      } else {
        // For other formats, export the raw data
        await this.exportData(chartData.data, options);
      }
    } catch (error) {
      console.error('Chart export failed:', error);
      throw error;
    }
  }

  async exportDashboard(
    dashboardData: {
      summary: any;
      charts: ChartExportData[];
      tables: { name: string; data: any[] }[];
    },
    options: ExportOptions
  ): Promise<void> {
    try {
      const fileName = options.fileName || `dashboard-export-${format(new Date(), 'yyyy-MM-dd-HHmmss')}`;

      if (options.format === 'excel') {
        await this.exportDashboardToExcel(dashboardData, fileName);
      } else if (options.format === 'pdf') {
        await this.exportDashboardToPDF(dashboardData, fileName);
      } else {
        // For other formats, combine all data
        const combinedData = {
          summary: dashboardData.summary,
          charts: dashboardData.charts.map(chart => ({
            title: chart.title,
            data: chart.data
          })),
          tables: dashboardData.tables
        };
        await this.exportToJSON(combinedData, fileName);
      }
    } catch (error) {
      console.error('Dashboard export failed:', error);
      throw error;
    }
  }

  private async exportToCSV(
    data: any[],
    fileName: string,
    options: ExportOptions
  ): Promise<void> {
    if (!data || data.length === 0) {
      throw new Error('No data to export');
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      options.includeHeaders !== false ? headers.join(',') : '',
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Handle dates
          if (value instanceof Date) {
            return format(value, options.dateFormat || 'yyyy-MM-dd HH:mm:ss');
          }
          // Handle strings with commas
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? '';
        }).join(',')
      )
    ].filter(line => line).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${fileName}.csv`);
  }

  private async exportToExcel(
    data: any[],
    fileName: string,
    options: ExportOptions,
    metadata?: any
  ): Promise<void> {
    const workbook = XLSX.utils.book_new();

    // Add metadata sheet if provided
    if (metadata) {
      const metadataSheet = XLSX.utils.json_to_sheet([
        { Property: 'Title', Value: metadata.title || 'Analytics Export' },
        { Property: 'Description', Value: metadata.description || '' },
        { Property: 'Generated By', Value: metadata.generatedBy || 'Hey Peter Analytics' },
        { Property: 'Generated On', Value: format(new Date(), 'yyyy-MM-dd HH:mm:ss') },
        { Property: 'Date Range', Value: metadata.dateRange 
          ? `${format(metadata.dateRange.start, 'yyyy-MM-dd')} to ${format(metadata.dateRange.end, 'yyyy-MM-dd')}`
          : 'All time' 
        }
      ]);
      XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Metadata');
    }

    // Add data sheet
    const dataSheet = XLSX.utils.json_to_sheet(data);
    
    // Apply formatting
    const range = XLSX.utils.decode_range(dataSheet['!ref'] || 'A1');
    
    // Format headers
    for (let col = range.s.c; col <= range.e.c; col++) {
      const headerCell = XLSX.utils.encode_cell({ r: 0, c: col });
      if (dataSheet[headerCell]) {
        dataSheet[headerCell].s = {
          font: { bold: true },
          fill: { fgColor: { rgb: 'E0E0E0' } },
          alignment: { horizontal: 'center' }
        };
      }
    }

    // Format date columns
    for (let row = range.s.r + 1; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = dataSheet[cellAddress];
        
        if (cell && cell.v instanceof Date) {
          cell.t = 'd';
          cell.z = options.dateFormat || 'yyyy-mm-dd hh:mm:ss';
        }
      }
    }

    XLSX.utils.book_append_sheet(workbook, dataSheet, 'Data');

    // Write file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${fileName}.xlsx`);
  }

  private async exportToJSON(
    data: any,
    fileName: string,
    metadata?: any
  ): Promise<void> {
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        ...metadata
      },
      data
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    saveAs(blob, `${fileName}.json`);
  }

  private async exportToPDF(
    data: any[],
    fileName: string,
    metadata?: any
  ): Promise<void> {
    // For PDF export, we'll create an HTML representation and trigger print
    const html = this.generateHTMLReport(data, metadata);
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  }

  private async exportChartToExcel(
    chartData: ChartExportData,
    fileName: string
  ): Promise<void> {
    const workbook = XLSX.utils.book_new();

    // Add chart metadata
    const metadataSheet = XLSX.utils.json_to_sheet([
      { Property: 'Chart Title', Value: chartData.title },
      { Property: 'Chart Type', Value: chartData.type },
      { Property: 'X-Axis', Value: chartData.xAxis || 'Category' },
      { Property: 'Y-Axis', Value: chartData.yAxis || 'Value' },
      { Property: 'Data Points', Value: chartData.data.length }
    ]);
    XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Chart Info');

    // Add chart data
    const dataSheet = XLSX.utils.json_to_sheet(chartData.data);
    XLSX.utils.book_append_sheet(workbook, dataSheet, 'Chart Data');

    // Write file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${fileName}.xlsx`);
  }

  private async exportDashboardToExcel(
    dashboardData: any,
    fileName: string
  ): Promise<void> {
    const workbook = XLSX.utils.book_new();

    // Add summary sheet
    const summarySheet = XLSX.utils.json_to_sheet([dashboardData.summary]);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Add charts
    dashboardData.charts.forEach((chart: ChartExportData, index: number) => {
      const chartSheet = XLSX.utils.json_to_sheet(chart.data);
      XLSX.utils.book_append_sheet(workbook, chartSheet, `Chart ${index + 1} - ${chart.title.slice(0, 20)}`);
    });

    // Add tables
    dashboardData.tables.forEach((table: any) => {
      const tableSheet = XLSX.utils.json_to_sheet(table.data);
      XLSX.utils.book_append_sheet(workbook, tableSheet, table.name.slice(0, 30));
    });

    // Write file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${fileName}.xlsx`);
  }

  private async exportDashboardToPDF(
    dashboardData: any,
    fileName: string
  ): Promise<void> {
    const html = this.generateDashboardHTML(dashboardData);
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  }

  private generateHTMLReport(data: any[], metadata?: any): string {
    const styles = `
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        .metadata { background: #f5f5f5; padding: 10px; margin-bottom: 20px; }
        table { border-collapse: collapse; width: 100%; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4a90e2; color: white; }
        tr:nth-child(even) { background-color: #f2f2f2; }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
        }
      </style>
    `;

    const metadataHTML = metadata ? `
      <div class="metadata">
        <h2>Report Information</h2>
        <p><strong>Title:</strong> ${escapeHtml(metadata.title || 'Analytics Report')}</p>
        <p><strong>Generated:</strong> ${escapeHtml(format(new Date(), 'yyyy-MM-dd HH:mm:ss'))}</p>
        ${metadata.dateRange ? `<p><strong>Date Range:</strong> ${escapeHtml(format(metadata.dateRange.start, 'yyyy-MM-dd'))} to ${escapeHtml(format(metadata.dateRange.end, 'yyyy-MM-dd'))}</p>` : ''}
      </div>
    ` : '';

    const tableHTML = data.length > 0 ? `
      <table>
        <thead>
          <tr>
            ${Object.keys(data[0]).map(key => `<th>${escapeHtml(key)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              ${Object.values(row).map(value => `<td>${escapeHtml(String(value || ''))}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '<p>No data available</p>';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${escapeHtml(metadata?.title || 'Analytics Report')}</title>
          ${styles}
        </head>
        <body>
          <h1>${escapeHtml(metadata?.title || 'Analytics Report')}</h1>
          ${metadataHTML}
          ${tableHTML}
        </body>
      </html>
    `;
  }

  private generateDashboardHTML(dashboardData: any): string {
    const styles = `
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1, h2, h3 { color: #333; }
        .summary { background: #f5f5f5; padding: 15px; margin-bottom: 20px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
        .summary-item { background: white; padding: 10px; border-radius: 5px; }
        .chart-section { margin: 20px 0; page-break-inside: avoid; }
        table { border-collapse: collapse; width: 100%; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4a90e2; color: white; }
        tr:nth-child(even) { background-color: #f2f2f2; }
        @media print {
          body { margin: 0; }
          .no-print { display: none; }
          .chart-section { page-break-inside: avoid; }
        }
      </style>
    `;

    const summaryHTML = `
      <div class="summary">
        <h2>Dashboard Summary</h2>
        <div class="summary-grid">
          ${Object.entries(dashboardData.summary).map(([key, value]) => `
            <div class="summary-item">
              <strong>${key}:</strong> ${value}
            </div>
          `).join('')}
        </div>
      </div>
    `;

    const chartsHTML = dashboardData.charts.map((chart: ChartExportData) => `
      <div class="chart-section">
        <h3>${chart.title}</h3>
        <table>
          <thead>
            <tr>
              ${Object.keys(chart.data[0] || {}).map(key => `<th>${key}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${chart.data.map(row => `
              <tr>
                ${Object.values(row).map(value => `<td>${escapeHtml(String(value || ''))}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `).join('');

    const tablesHTML = dashboardData.tables.map((table: any) => `
      <div class="chart-section">
        <h3>${table.name}</h3>
        <table>
          <thead>
            <tr>
              ${Object.keys(table.data[0] || {}).map(key => `<th>${key}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${table.data.map((row: any) => `
              <tr>
                ${Object.values(row).map((value: any) => `<td>${value}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Dashboard Export</title>
          ${styles}
        </head>
        <body>
          <h1>Analytics Dashboard Export</h1>
          <p>Generated on ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}</p>
          ${summaryHTML}
          <h2>Charts</h2>
          ${chartsHTML}
          <h2>Detailed Tables</h2>
          ${tablesHTML}
        </body>
      </html>
    `;
  }

  // Utility method to prepare data for export
  prepareDataForExport(data: any[], columns?: string[]): any[] {
    if (!columns || columns.length === 0) {
      return data;
    }

    return data.map(row => {
      const exportRow: any = {};
      columns.forEach(col => {
        exportRow[col] = row[col];
      });
      return exportRow;
    });
  }

  // Method to generate filename with timestamp
  generateFileName(prefix: string, extension: string): string {
    const timestamp = format(new Date(), 'yyyy-MM-dd-HHmmss');
    return `${prefix}-${timestamp}.${extension}`;
  }

  // Template Management
  getTemplate(id: string): ExportTemplate | undefined {
    return this.templates.get(id);
  }

  getAllTemplates(): ExportTemplate[] {
    return Array.from(this.templates.values());
  }

  createTemplate(template: ExportTemplate): void {
    this.templates.set(template.id, template);
  }

  updateTemplate(template: ExportTemplate): void {
    this.templates.set(template.id, template);
  }

  deleteTemplate(id: string): boolean {
    return this.templates.delete(id);
  }

  // Batch Export Functionality
  async exportBatch(request: BatchExportRequest): Promise<void> {
    try {
      const exports = request.exports;
      const batchOptions = request.batchOptions || {};

      if (batchOptions.combinedFile) {
        await this.exportCombinedBatch(exports, batchOptions);
      } else {
        // Export each item separately
        for (const exportItem of exports) {
          await this.exportData(exportItem.data, exportItem.options);
        }
      }
    } catch (error) {
      console.error('Batch export failed:', error);
      throw error;
    }
  }

  private async exportCombinedBatch(
    exports: { type: string; data: any; options: ExportOptions }[],
    batchOptions: any
  ): Promise<void> {
    const workbook = XLSX.utils.book_new();
    const timestamp = batchOptions.includeTimestamp ? format(new Date(), 'yyyy-MM-dd-HHmmss') : '';

    // Create summary sheet
    const summaryData = exports.map((exp, index) => ({
      'Sheet Name': exp.type,
      'Record Count': Array.isArray(exp.data) ? exp.data.length : 1,
      'Export Format': exp.options.format,
      'Generated At': format(new Date(), 'yyyy-MM-dd HH:mm:ss')
    }));

    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Export Summary');

    // Add each export as a separate sheet
    exports.forEach((exp, index) => {
      const sheetName = exp.type.slice(0, 30); // Excel sheet name limit
      const data = Array.isArray(exp.data) ? exp.data : [exp.data];
      const sheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
    });

    // Write file
    const fileName = `batch-export${timestamp ? `-${timestamp}` : ''}.xlsx`;
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, fileName);
  }

  // Scheduled Export Management
  createScheduledExport(config: ScheduledExportConfig): void {
    this.scheduledExports.set(config.id, config);
  }

  getScheduledExport(id: string): ScheduledExportConfig | undefined {
    return this.scheduledExports.get(id);
  }

  getAllScheduledExports(): ScheduledExportConfig[] {
    return Array.from(this.scheduledExports.values());
  }

  updateScheduledExport(config: ScheduledExportConfig): void {
    this.scheduledExports.set(config.id, { ...config, updatedAt: new Date() });
  }

  deleteScheduledExport(id: string): boolean {
    return this.scheduledExports.delete(id);
  }

  // Email Delivery Integration
  async sendExportByEmail(
    data: any[],
    options: ExportOptions,
    recipients: string[],
    subject?: string,
    message?: string
  ): Promise<void> {
    try {
      // Generate the export file
      const fileName = this.generateFileName('export', options.format);
      
      // Create file buffer based on format
      let fileBuffer: ArrayBuffer;
      let mimeType: string;
      
      switch (options.format) {
        case 'excel':
          const workbook = XLSX.utils.book_new();
          const sheet = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(workbook, sheet, 'Data');
          fileBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        case 'csv':
          const csvContent = this.generateCSVContent(data, options);
          fileBuffer = new TextEncoder().encode(csvContent);
          mimeType = 'text/csv';
          break;
        case 'json':
          const jsonContent = JSON.stringify(data, null, 2);
          fileBuffer = new TextEncoder().encode(jsonContent);
          mimeType = 'application/json';
          break;
        default:
          throw new Error(`Email delivery not supported for format: ${options.format}`);
      }

      // This would integrate with your email service
      await this.sendEmailWithAttachment({
        to: recipients,
        subject: subject || 'Analytics Export',
        body: message || 'Please find the attached analytics export.',
        attachment: {
          filename: fileName,
          content: fileBuffer,
          mimeType
        }
      });

    } catch (error) {
      console.error('Email delivery failed:', error);
      throw error;
    }
  }

  private async sendEmailWithAttachment(params: {
    to: string[];
    subject: string;
    body: string;
    attachment: {
      filename: string;
      content: ArrayBuffer;
      mimeType: string;
    };
  }): Promise<void> {
    // This would integrate with your email service (e.g., SendGrid, AWS SES, etc.)
    // For now, we'll just log the attempt
    console.log('Email would be sent to:', params.to);
    console.log('Subject:', params.subject);
    console.log('Attachment:', params.attachment.filename);
    
    // In a real implementation, you'd call your email service here
    // Example with a hypothetical email service:
    // await emailService.send({
    //   to: params.to,
    //   subject: params.subject,
    //   html: params.body,
    //   attachments: [{
    //     filename: params.attachment.filename,
    //     content: params.attachment.content,
    //     contentType: params.attachment.mimeType
    //   }]
    // });
  }

  private generateCSVContent(data: any[], options: ExportOptions): string {
    if (!data || data.length === 0) {
      return '';
    }

    const headers = Object.keys(data[0]);
    const csvLines = [];

    if (options.includeHeaders !== false) {
      csvLines.push(headers.join(','));
    }

    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        if (value instanceof Date) {
          return format(value, options.dateFormat || 'yyyy-MM-dd HH:mm:ss');
        }
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      });
      csvLines.push(values.join(','));
    });

    return csvLines.join('\n');
  }

  // Template-based Export
  async exportWithTemplate(
    data: any[],
    templateId: string,
    options?: Partial<ExportOptions>
  ): Promise<void> {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Filter data based on template columns
    const filteredData = data.map(row => {
      const filteredRow: any = {};
      template.columns.forEach(col => {
        if (row.hasOwnProperty(col)) {
          filteredRow[col] = row[col];
        }
      });
      return filteredRow;
    });

    // Merge template options with provided options
    const exportOptions: ExportOptions = {
      format: template.format,
      includeHeaders: true,
      ...options,
      fileName: options?.fileName || `${template.name.toLowerCase().replace(/\s+/g, '-')}-${format(new Date(), 'yyyy-MM-dd')}`
    };

    // Apply template styling for Excel exports
    if (template.format === 'excel' && template.styling) {
      await this.exportToExcelWithStyling(filteredData, exportOptions.fileName!, template.styling);
    } else {
      await this.exportData(filteredData, exportOptions);
    }
  }

  private async exportToExcelWithStyling(
    data: any[],
    fileName: string,
    styling: any
  ): Promise<void> {
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(data);
    
    // Apply styling if provided
    if (styling.headerStyle) {
      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
      for (let col = range.s.c; col <= range.e.c; col++) {
        const headerCell = XLSX.utils.encode_cell({ r: 0, c: col });
        if (sheet[headerCell]) {
          sheet[headerCell].s = styling.headerStyle;
        }
      }
    }

    XLSX.utils.book_append_sheet(workbook, sheet, 'Report');
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `${fileName}.xlsx`);
  }

  // Advanced Export Options
  async exportWithAdvancedOptions(
    data: any[],
    options: ExportOptions & {
      filters?: any;
      sorting?: { column: string; direction: 'asc' | 'desc' }[];
      grouping?: string[];
      aggregations?: { [key: string]: 'sum' | 'avg' | 'count' | 'min' | 'max' };
    }
  ): Promise<void> {
    let processedData = [...data];

    // Apply filters
    if (options.filters) {
      processedData = this.applyFilters(processedData, options.filters);
    }

    // Apply sorting
    if (options.sorting) {
      processedData = this.applySorting(processedData, options.sorting);
    }

    // Apply grouping
    if (options.grouping) {
      processedData = this.applyGrouping(processedData, options.grouping);
    }

    // Apply aggregations
    if (options.aggregations) {
      processedData = this.applyAggregations(processedData, options.aggregations);
    }

    await this.exportData(processedData, options);
  }

  private applyFilters(data: any[], filters: any): any[] {
    return data.filter(row => {
      return Object.entries(filters).every(([key, value]) => {
        return row[key] === value;
      });
    });
  }

  private applySorting(data: any[], sorting: { column: string; direction: 'asc' | 'desc' }[]): any[] {
    return data.sort((a, b) => {
      for (const sort of sorting) {
        const aVal = a[sort.column];
        const bVal = b[sort.column];
        
        if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  private applyGrouping(data: any[], grouping: string[]): any[] {
    const groups = new Map();
    
    data.forEach(row => {
      const key = grouping.map(col => row[col]).join('|');
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(row);
    });

    const result: any[] = [];
    groups.forEach((groupData, key) => {
      const groupKeys = key.split('|');
      const groupRow: any = {};
      
      grouping.forEach((col, index) => {
        groupRow[col] = groupKeys[index];
      });
      
      groupRow['_isGroupHeader'] = true;
      groupRow['_groupCount'] = groupData.length;
      result.push(groupRow);
      result.push(...groupData);
    });

    return result;
  }

  private applyAggregations(data: any[], aggregations: { [key: string]: 'sum' | 'avg' | 'count' | 'min' | 'max' }): any[] {
    const result = [...data];
    
    if (data.length === 0) return result;

    const aggregationRow: any = { '_isAggregation': true };
    
    Object.entries(aggregations).forEach(([column, operation]) => {
      const values = data.map(row => row[column]).filter(val => val != null);
      
      switch (operation) {
        case 'sum':
          aggregationRow[column] = values.reduce((sum, val) => sum + (Number(val) || 0), 0);
          break;
        case 'avg':
          aggregationRow[column] = values.reduce((sum, val) => sum + (Number(val) || 0), 0) / values.length;
          break;
        case 'count':
          aggregationRow[column] = values.length;
          break;
        case 'min':
          aggregationRow[column] = Math.min(...values.map(val => Number(val) || 0));
          break;
        case 'max':
          aggregationRow[column] = Math.max(...values.map(val => Number(val) || 0));
          break;
      }
    });

    result.push(aggregationRow);
    return result;
  }
}

export const analyticsExportService = new AnalyticsExportService();