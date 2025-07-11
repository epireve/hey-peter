'use client';

import { logger } from '@/lib/services';

import React from 'react';
import { initializePerformanceMonitoring, preloadCriticalLibraries } from '@/lib/utils/performance-monitor';
import { preloadCriticalLibraries as preloadDynamicLibraries } from '@/lib/utils/dynamic-imports';

interface PerformanceProviderProps {
  children: React.ReactNode;
}

export function PerformanceProvider({ children }: PerformanceProviderProps) {
  React.useEffect(() => {
    // Initialize performance monitoring
    initializePerformanceMonitoring();
    
    // Preload critical libraries
    preloadDynamicLibraries();
    
    // Log bundle optimization info in development
    if (process.env.NODE_ENV === 'development') {
      logger.info('🚀 Code Splitting & Performance Optimization Enabled');
      logger.info('📦 Bundle chunks will be loaded on-demand');
      logger.info('⚡ Critical libraries will be preloaded');
    }
  }, []);

  return <>{children}</>;
}

export default PerformanceProvider;