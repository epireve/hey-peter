'use client';

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
      console.log('🚀 Code Splitting & Performance Optimization Enabled');
      console.log('📦 Bundle chunks will be loaded on-demand');
      console.log('⚡ Critical libraries will be preloaded');
    }
  }, []);

  return <>{children}</>;
}

export default PerformanceProvider;