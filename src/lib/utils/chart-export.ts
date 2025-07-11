import { ChartDataPoint, ChartExportOptions } from '@/types/charts';

import { logger } from '@/lib/services';
/**
 * Enhanced chart export utilities with multiple format support
 */
export class ChartExportService {
  /**
   * Export chart as image using html2canvas
   */
  static async exportAsImage(
    chartElement: HTMLElement,
    options: ChartExportOptions & { title?: string }
  ): Promise<void> {
    try {
      // Import html2canvas dynamically to avoid SSR issues
      const html2canvas = await import('html2canvas');
      
      const canvas = await html2canvas.default(chartElement, {
        backgroundColor: options.backgroundColor || '#ffffff',
        width: options.width || chartElement.offsetWidth,
        height: options.height || chartElement.offsetHeight,
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: true
      });

      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${options.filename || 'chart'}.${options.format}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }, `image/${options.format}`, options.quality || 1);
    } catch (error) {
      logger.error('Failed to export chart as image:', error);
      throw new Error('Image export failed');
    }
  }

  /**
   * Export chart as PDF
   */
  static async exportAsPDF(
    chartElement: HTMLElement,
    options: ChartExportOptions & { 
      title?: string;
      orientation?: 'portrait' | 'landscape';
      pageSize?: 'A4' | 'A3' | 'letter';
    }
  ): Promise<void> {
    try {
      // Import libraries dynamically
      const [html2canvas, jsPDF] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);

      const canvas = await html2canvas.default(chartElement, {
        backgroundColor: options.backgroundColor || '#ffffff',
        scale: 2,
        useCORS: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF.jsPDF({
        orientation: options.orientation || 'landscape',
        unit: 'mm',
        format: options.pageSize || 'A4'
      });

      // Calculate dimensions
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgWidth = pageWidth - 2 * margin;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Add title if provided
      if (options.title) {
        pdf.setFontSize(16);
        pdf.text(options.title, margin, margin + 5);
      }

      // Add chart
      const yPosition = options.title ? margin + 15 : margin;
      pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, Math.min(imgHeight, pageHeight - yPosition - margin));

      // Save PDF
      pdf.save(`${options.filename || 'chart'}.pdf`);
    } catch (error) {
      logger.error('Failed to export chart as PDF:', error);
      throw new Error('PDF export failed');
    }
  }

  /**
   * Export chart as SVG
   */
  static async exportAsSVG(
    chartElement: HTMLElement,
    options: ChartExportOptions
  ): Promise<void> {
    try {
      // Find SVG element within chart
      const svgElement = chartElement.querySelector('svg');
      if (!svgElement) {
        throw new Error('No SVG element found in chart');
      }

      // Clone SVG to avoid modifying original
      const clonedSvg = svgElement.cloneNode(true) as SVGElement;
      
      // Set dimensions
      if (options.width) clonedSvg.setAttribute('width', options.width.toString());
      if (options.height) clonedSvg.setAttribute('height', options.height.toString());
      
      // Set background color
      if (options.backgroundColor) {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('width', '100%');
        rect.setAttribute('height', '100%');
        rect.setAttribute('fill', options.backgroundColor);
        clonedSvg.insertBefore(rect, clonedSvg.firstChild);
      }

      // Convert to string and create blob
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(clonedSvg);
      const blob = new Blob([svgString], { type: 'image/svg+xml' });

      // Download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${options.filename || 'chart'}.svg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('Failed to export chart as SVG:', error);
      throw new Error('SVG export failed');
    }
  }

  /**
   * Export chart data as CSV
   */
  static exportAsCSV(
    data: ChartDataPoint[],
    options: { filename?: string; delimiter?: string; includeHeaders?: boolean } = {}
  ): void {
    try {
      const { filename = 'chart-data', delimiter = ',', includeHeaders = true } = options;
      
      if (!data || data.length === 0) {
        throw new Error('No data to export');
      }

      // Get headers
      const headers = Object.keys(data[0]);
      
      // Build CSV content
      const csvContent = [
        includeHeaders ? headers.join(delimiter) : null,
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            // Handle values that contain delimiter or quotes
            if (typeof value === 'string' && (value.includes(delimiter) || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(delimiter)
        )
      ].filter(Boolean).join('\n');

      // Create and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('Failed to export as CSV:', error);
      throw new Error('CSV export failed');
    }
  }

  /**
   * Export chart data as Excel
   */
  static async exportAsExcel(
    data: ChartDataPoint[],
    options: { 
      filename?: string; 
      sheetName?: string; 
      includeChartImage?: boolean;
      chartElement?: HTMLElement;
    } = {}
  ): Promise<void> {
    try {
      const XLSX = await import('xlsx');
      const { filename = 'chart-data', sheetName = 'Chart Data' } = options;

      if (!data || data.length === 0) {
        throw new Error('No data to export');
      }

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, sheetName);

      // If chart image is requested, add it to a separate sheet
      if (options.includeChartImage && options.chartElement) {
        try {
          const html2canvas = await import('html2canvas');
          const canvas = await html2canvas.default(options.chartElement, {
            backgroundColor: '#ffffff',
            scale: 1
          });
          
          const imgData = canvas.toDataURL('image/png');
          // Note: Adding images to Excel requires additional libraries
          // This is a placeholder for the image functionality
          logger.info('Chart image generated but not added to Excel (requires additional libraries)');
        } catch (error) {
          logger.warn('Failed to add chart image to Excel:', error);
        }
      }

      // Save file
      XLSX.writeFile(wb, `${filename}.xlsx`);
    } catch (error) {
      logger.error('Failed to export as Excel:', error);
      throw new Error('Excel export failed');
    }
  }

  /**
   * Export chart data as JSON
   */
  static exportAsJSON(
    data: ChartDataPoint[],
    options: { filename?: string; pretty?: boolean } = {}
  ): void {
    try {
      const { filename = 'chart-data', pretty = true } = options;
      
      if (!data || data.length === 0) {
        throw new Error('No data to export');
      }

      const jsonContent = pretty 
        ? JSON.stringify(data, null, 2)
        : JSON.stringify(data);

      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('Failed to export as JSON:', error);
      throw new Error('JSON export failed');
    }
  }

  /**
   * Export comprehensive dashboard report
   */
  static async exportDashboardReport(
    dashboardData: {
      title: string;
      summary: Record<string, any>;
      charts: Array<{
        title: string;
        element: HTMLElement;
        data: ChartDataPoint[];
        type: string;
      }>;
      tables: Array<{
        name: string;
        data: any[];
      }>;
    },
    options: {
      format: 'pdf' | 'excel';
      filename?: string;
    }
  ): Promise<void> {
    try {
      const { format, filename = 'dashboard-report' } = options;

      if (format === 'pdf') {
        await this.exportDashboardAsPDF(dashboardData, { filename });
      } else if (format === 'excel') {
        await this.exportDashboardAsExcel(dashboardData, { filename });
      } else {
        throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      logger.error('Failed to export dashboard report:', error);
      throw new Error('Dashboard report export failed');
    }
  }

  /**
   * Export dashboard as PDF
   */
  private static async exportDashboardAsPDF(
    dashboardData: any,
    options: { filename: string }
  ): Promise<void> {
    try {
      const [html2canvas, jsPDF] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);

      const pdf = new jsPDF.jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'A4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = margin;

      // Add title
      pdf.setFontSize(20);
      pdf.text(dashboardData.title, margin, yPosition);
      yPosition += 15;

      // Add summary
      pdf.setFontSize(14);
      pdf.text('Summary', margin, yPosition);
      yPosition += 10;
      
      pdf.setFontSize(10);
      Object.entries(dashboardData.summary).forEach(([key, value]) => {
        pdf.text(`${key}: ${value}`, margin, yPosition);
        yPosition += 5;
      });
      yPosition += 10;

      // Add charts
      for (const chart of dashboardData.charts) {
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = margin;
        }

        // Add chart title
        pdf.setFontSize(12);
        pdf.text(chart.title, margin, yPosition);
        yPosition += 10;

        // Add chart image
        try {
          const canvas = await html2canvas.default(chart.element, {
            backgroundColor: '#ffffff',
            scale: 1,
            width: 400,
            height: 300
          });

          const imgData = canvas.toDataURL('image/png');
          const imgWidth = pageWidth - 2 * margin;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, Math.min(imgHeight, 80));
          yPosition += Math.min(imgHeight, 80) + 10;
        } catch (error) {
          logger.warn(`Failed to add chart ${chart.title} to PDF:`, error);
          yPosition += 10;
        }
      }

      // Save PDF
      pdf.save(`${options.filename}.pdf`);
    } catch (error) {
      logger.error('Failed to export dashboard as PDF:', error);
      throw error;
    }
  }

  /**
   * Export dashboard as Excel
   */
  private static async exportDashboardAsExcel(
    dashboardData: any,
    options: { filename: string }
  ): Promise<void> {
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();

      // Add summary sheet
      const summaryData = Object.entries(dashboardData.summary).map(([key, value]) => ({
        Metric: key,
        Value: value
      }));
      const summaryWs = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

      // Add chart data sheets
      dashboardData.charts.forEach((chart: any, index: number) => {
        if (chart.data && chart.data.length > 0) {
          const ws = XLSX.utils.json_to_sheet(chart.data);
          XLSX.utils.book_append_sheet(wb, ws, `Chart ${index + 1} - ${chart.title.substring(0, 20)}`);
        }
      });

      // Add table sheets
      dashboardData.tables.forEach((table: any) => {
        if (table.data && table.data.length > 0) {
          const ws = XLSX.utils.json_to_sheet(table.data);
          XLSX.utils.book_append_sheet(wb, ws, table.name.substring(0, 31));
        }
      });

      // Save file
      XLSX.writeFile(wb, `${options.filename}.xlsx`);
    } catch (error) {
      logger.error('Failed to export dashboard as Excel:', error);
      throw error;
    }
  }

  /**
   * Get export capabilities based on browser support
   */
  static getExportCapabilities(): {
    image: boolean;
    pdf: boolean;
    svg: boolean;
    csv: boolean;
    excel: boolean;
    json: boolean;
  } {
    const hasCanvas = typeof HTMLCanvasElement !== 'undefined';
    const hasBlob = typeof Blob !== 'undefined';
    const hasURL = typeof URL !== 'undefined' && typeof URL.createObjectURL !== 'undefined';
    const hasSVG = typeof SVGElement !== 'undefined';

    return {
      image: hasCanvas && hasBlob && hasURL,
      pdf: hasCanvas && hasBlob && hasURL,
      svg: hasSVG && hasBlob && hasURL,
      csv: hasBlob && hasURL,
      excel: hasBlob && hasURL,
      json: hasBlob && hasURL
    };
  }

  /**
   * Export chart with automatic format detection
   */
  static async exportChart(
    chartElement: HTMLElement,
    data: ChartDataPoint[],
    options: ChartExportOptions & { 
      title?: string;
      autoDetectFormat?: boolean;
    }
  ): Promise<void> {
    try {
      const capabilities = this.getExportCapabilities();
      let format = options.format;

      // Auto-detect format if not specified
      if (options.autoDetectFormat && !format) {
        if (capabilities.pdf) format = 'pdf';
        else if (capabilities.image) format = 'png';
        else if (capabilities.svg) format = 'svg';
        else if (capabilities.csv) format = 'csv';
        else throw new Error('No export formats available');
      }

      // Export based on format
      switch (format) {
        case 'png':
        case 'jpg':
          if (!capabilities.image) throw new Error('Image export not supported');
          await this.exportAsImage(chartElement, options);
          break;
        
        case 'pdf':
          if (!capabilities.pdf) throw new Error('PDF export not supported');
          await this.exportAsPDF(chartElement, options);
          break;
        
        case 'svg':
          if (!capabilities.svg) throw new Error('SVG export not supported');
          await this.exportAsSVG(chartElement, options);
          break;
        
        case 'csv':
          if (!capabilities.csv) throw new Error('CSV export not supported');
          this.exportAsCSV(data, { filename: options.filename });
          break;
        
        case 'excel':
          if (!capabilities.excel) throw new Error('Excel export not supported');
          await this.exportAsExcel(data, { 
            filename: options.filename,
            includeChartImage: true,
            chartElement
          });
          break;
        
        case 'json':
          if (!capabilities.json) throw new Error('JSON export not supported');
          this.exportAsJSON(data, { filename: options.filename });
          break;
        
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      logger.error('Failed to export chart:', error);
      throw error;
    }
  }
}

export default ChartExportService;