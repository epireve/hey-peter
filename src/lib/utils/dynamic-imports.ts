/**
 * Dynamic imports for heavy libraries to optimize bundle size
 * This module provides lazy-loaded access to heavy dependencies
 */

import { createLazyLibraryImport } from './lazy-factory';

// Recharts - Heavy charting library (reduce main bundle by ~200KB)
export const dynamicRecharts = {
  LineChart: createLazyLibraryImport(() => 
    import('recharts').then(mod => mod.LineChart)
  ),
  BarChart: createLazyLibraryImport(() => 
    import('recharts').then(mod => mod.BarChart)
  ),
  PieChart: createLazyLibraryImport(() => 
    import('recharts').then(mod => mod.PieChart)
  ),
  AreaChart: createLazyLibraryImport(() => 
    import('recharts').then(mod => mod.AreaChart)
  ),
  XAxis: createLazyLibraryImport(() => 
    import('recharts').then(mod => mod.XAxis)
  ),
  YAxis: createLazyLibraryImport(() => 
    import('recharts').then(mod => mod.YAxis)
  ),
  CartesianGrid: createLazyLibraryImport(() => 
    import('recharts').then(mod => mod.CartesianGrid)
  ),
  Tooltip: createLazyLibraryImport(() => 
    import('recharts').then(mod => mod.Tooltip)
  ),
  Legend: createLazyLibraryImport(() => 
    import('recharts').then(mod => mod.Legend)
  ),
  Line: createLazyLibraryImport(() => 
    import('recharts').then(mod => mod.Line)
  ),
  Bar: createLazyLibraryImport(() => 
    import('recharts').then(mod => mod.Bar)
  ),
  Area: createLazyLibraryImport(() => 
    import('recharts').then(mod => mod.Area)
  ),
  Cell: createLazyLibraryImport(() => 
    import('recharts').then(mod => mod.Cell)
  ),
  ResponsiveContainer: createLazyLibraryImport(() => 
    import('recharts').then(mod => mod.ResponsiveContainer)
  ),
};

// XLSX - Excel manipulation library (reduce main bundle by ~100KB)
export const dynamicXLSX = {
  utils: createLazyLibraryImport(() => 
    import('xlsx').then(mod => mod.utils)
  ),
  read: createLazyLibraryImport(() => 
    import('xlsx').then(mod => mod.read)
  ),
  write: createLazyLibraryImport(() => 
    import('xlsx').then(mod => mod.write)
  ),
  writeFile: createLazyLibraryImport(() => 
    import('xlsx').then(mod => mod.writeFile)
  ),
  XLSX: createLazyLibraryImport(() => 
    import('xlsx')
  ),
};

// File-saver - File download utility
export const dynamicFileSaver = {
  saveAs: createLazyLibraryImport(() => 
    import('file-saver').then(mod => mod.saveAs)
  ),
};

// Date-fns - Date manipulation library (reduce bundle size by selective imports)
export const dynamicDateFns = {
  format: createLazyLibraryImport(() => 
    import('date-fns/format').then(mod => mod.default)
  ),
  parseISO: createLazyLibraryImport(() => 
    import('date-fns/parseISO').then(mod => mod.default)
  ),
  startOfWeek: createLazyLibraryImport(() => 
    import('date-fns/startOfWeek').then(mod => mod.default)
  ),
  endOfWeek: createLazyLibraryImport(() => 
    import('date-fns/endOfWeek').then(mod => mod.default)
  ),
  startOfMonth: createLazyLibraryImport(() => 
    import('date-fns/startOfMonth').then(mod => mod.default)
  ),
  endOfMonth: createLazyLibraryImport(() => 
    import('date-fns/endOfMonth').then(mod => mod.default)
  ),
  addDays: createLazyLibraryImport(() => 
    import('date-fns/addDays').then(mod => mod.default)
  ),
  subDays: createLazyLibraryImport(() => 
    import('date-fns/subDays').then(mod => mod.default)
  ),
  isAfter: createLazyLibraryImport(() => 
    import('date-fns/isAfter').then(mod => mod.default)
  ),
  isBefore: createLazyLibraryImport(() => 
    import('date-fns/isBefore').then(mod => mod.default)
  ),
  differenceInDays: createLazyLibraryImport(() => 
    import('date-fns/differenceInDays').then(mod => mod.default)
  ),
};

// React Table - Heavy table library
export const dynamicReactTable = {
  useReactTable: createLazyLibraryImport(() => 
    import('@tanstack/react-table').then(mod => mod.useReactTable)
  ),
  getCoreRowModel: createLazyLibraryImport(() => 
    import('@tanstack/react-table').then(mod => mod.getCoreRowModel)
  ),
  getPaginationRowModel: createLazyLibraryImport(() => 
    import('@tanstack/react-table').then(mod => mod.getPaginationRowModel)
  ),
  getSortedRowModel: createLazyLibraryImport(() => 
    import('@tanstack/react-table').then(mod => mod.getSortedRowModel)
  ),
  getFilteredRowModel: createLazyLibraryImport(() => 
    import('@tanstack/react-table').then(mod => mod.getFilteredRowModel)
  ),
  createColumnHelper: createLazyLibraryImport(() => 
    import('@tanstack/react-table').then(mod => mod.createColumnHelper)
  ),
  flexRender: createLazyLibraryImport(() => 
    import('@tanstack/react-table').then(mod => mod.flexRender)
  ),
};

// CSV Parse - CSV manipulation
export const dynamicCSV = {
  parse: createLazyLibraryImport(() => 
    import('csv-parse/browser/esm/sync').then(mod => mod.parse)
  ),
  stringify: createLazyLibraryImport(() => 
    import('csv-stringify/browser/esm/sync').then(mod => mod.stringify)
  ),
};

// Lucide Icons - Selective icon imports to reduce bundle size
export const dynamicIcons = {
  // Analytics icons
  BarChart3: createLazyLibraryImport(() => 
    import('lucide-react').then(mod => mod.BarChart3)
  ),
  TrendingUp: createLazyLibraryImport(() => 
    import('lucide-react').then(mod => mod.TrendingUp)
  ),
  PieChart: createLazyLibraryImport(() => 
    import('lucide-react').then(mod => mod.PieChart)
  ),
  Activity: createLazyLibraryImport(() => 
    import('lucide-react').then(mod => mod.Activity)
  ),
  
  // Export icons
  Download: createLazyLibraryImport(() => 
    import('lucide-react').then(mod => mod.Download)
  ),
  FileText: createLazyLibraryImport(() => 
    import('lucide-react').then(mod => mod.FileText)
  ),
  FileSpreadsheet: createLazyLibraryImport(() => 
    import('lucide-react').then(mod => mod.FileSpreadsheet)
  ),
  
  // User management icons
  Users: createLazyLibraryImport(() => 
    import('lucide-react').then(mod => mod.Users)
  ),
  UserPlus: createLazyLibraryImport(() => 
    import('lucide-react').then(mod => mod.UserPlus)
  ),
  GraduationCap: createLazyLibraryImport(() => 
    import('lucide-react').then(mod => mod.GraduationCap)
  ),
  
  // Scheduling icons
  Calendar: createLazyLibraryImport(() => 
    import('lucide-react').then(mod => mod.Calendar)
  ),
  Clock: createLazyLibraryImport(() => 
    import('lucide-react').then(mod => mod.Clock)
  ),
  CalendarDays: createLazyLibraryImport(() => 
    import('lucide-react').then(mod => mod.CalendarDays)
  ),
};

// Bundle size utility functions
export const getBundleInfo = () => {
  if (process.env.NODE_ENV === 'development') {
    return {
      estimatedSavings: {
        recharts: '~200KB',
        xlsx: '~100KB',
        dateFns: '~50KB',
        reactTable: '~80KB',
        icons: '~30KB',
        total: '~460KB'
      },
      optimization: {
        dynamicImports: 'Enabled',
        codesplitting: 'Route-based + Component-based',
        chunkSplitting: 'By feature and library'
      }
    };
  }
  return null;
};

// Preload critical libraries for faster user experience
export const preloadCriticalLibraries = () => {
  if (typeof window === 'undefined') return;

  // Preload most commonly used libraries after initial render
  setTimeout(() => {
    // Preload date functions (used across the app)
    dynamicDateFns.format().catch(() => {});
    dynamicDateFns.parseISO().catch(() => {});
    
    // Preload basic icons
    dynamicIcons.Calendar().catch(() => {});
    dynamicIcons.Users().catch(() => {});
  }, 1000);
};

// Utility to check if a library is already loaded
export const isLibraryLoaded = (libraryName: string): boolean => {
  const loadedLibraries = new Set(
    Array.from(document.scripts)
      .map(script => script.src)
      .filter(src => src.includes('chunk'))
      .map(src => src.split('/').pop()?.split('.')[0])
      .filter(Boolean)
  );
  
  return loadedLibraries.has(libraryName);
};

// Memory usage monitoring (development only)
export const monitorMemoryUsage = () => {
  if (process.env.NODE_ENV === 'development' && 'memory' in performance) {
    const memory = (performance as any).memory;
    console.log('Memory Usage:', {
      used: `${Math.round(memory.usedJSHeapSize / 1048576)}MB`,
      total: `${Math.round(memory.totalJSHeapSize / 1048576)}MB`,
      limit: `${Math.round(memory.jsHeapSizeLimit / 1048576)}MB`
    });
  }
};

export default {
  dynamicRecharts,
  dynamicXLSX,
  dynamicFileSaver,
  dynamicDateFns,
  dynamicReactTable,
  dynamicCSV,
  dynamicIcons,
  getBundleInfo,
  preloadCriticalLibraries,
  isLibraryLoaded,
  monitorMemoryUsage
};