import { format } from 'date-fns';
import { escapeHtml, sanitizeFilename } from './utils/security';

interface ExportOptions {
  format: string;
  columns?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export async function exportToCSV(
  data: any,
  filename: string,
  options?: ExportOptions
): Promise<void> {
  // Simple CSV export implementation
  let csvContent = '';
  
  if (Array.isArray(data) && data.length > 0) {
    // Get headers from first object or use provided columns
    const headers = options?.columns || Object.keys(data[0]);
    csvContent = headers.join(',') + '\n';
    
    // Add data rows
    data.forEach((row) => {
      const values = headers.map((header) => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      });
      csvContent += values.join(',') + '\n';
    });
  } else {
    // Handle object data
    const entries = Object.entries(data);
    csvContent = 'Key,Value\n';
    entries.forEach(([key, value]) => {
      csvContent += `${key},${value}\n`;
    });
  }
  
  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${sanitizeFilename(filename)}-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function exportToExcel(
  data: any,
  filename: string,
  options?: ExportOptions
): Promise<void> {
  // For a real implementation, you would use a library like xlsx
  // For now, we'll just export as CSV with .xls extension
  let csvContent = '';
  
  if (Array.isArray(data) && data.length > 0) {
    const headers = options?.columns || Object.keys(data[0]);
    csvContent = headers.join('\t') + '\n';
    
    data.forEach((row) => {
      const values = headers.map((header) => row[header] || '');
      csvContent += values.join('\t') + '\n';
    });
  }
  
  const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${sanitizeFilename(filename)}-${format(new Date(), 'yyyy-MM-dd')}.xls`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function exportToPDF(
  data: any,
  filename: string,
  options?: ExportOptions
): Promise<void> {
  // For a real implementation, you would use a library like jsPDF
  // For now, we'll create a simple HTML table and use window.print()
  
  let htmlContent = `
    <html>
      <head>
        <title>${escapeHtml(filename)}</title>
        <style>
          body { font-family: Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(filename)}</h1>
        <p>Generated on: ${format(new Date(), 'PPP')}</p>
  `;
  
  if (options?.dateRange) {
    htmlContent += `<p>Date Range: ${format(options.dateRange.from, 'PP')} - ${format(options.dateRange.to, 'PP')}</p>`;
  }
  
  if (Array.isArray(data) && data.length > 0) {
    const headers = options?.columns || Object.keys(data[0]);
    
    htmlContent += '<table>';
    htmlContent += '<thead><tr>';
    headers.forEach((header) => {
      htmlContent += `<th>${escapeHtml(header)}</th>`;
    });
    htmlContent += '</tr></thead>';
    
    htmlContent += '<tbody>';
    data.forEach((row) => {
      htmlContent += '<tr>';
      headers.forEach((header) => {
        htmlContent += `<td>${escapeHtml(String(row[header] || ''))}</td>`;
      });
      htmlContent += '</tr>';
    });
    htmlContent += '</tbody></table>';
  }
  
  htmlContent += '</body></html>';
  
  // Open in new window for printing
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load then trigger print
    printWindow.onload = () => {
      printWindow.print();
      // Note: In a real app, you might want to close the window after printing
    };
  }
}