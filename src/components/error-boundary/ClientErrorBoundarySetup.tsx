'use client';

import { useEffect } from 'react';
import { setupGlobalErrorBoundary } from './index';

export function ClientErrorBoundarySetup() {
  useEffect(() => {
    setupGlobalErrorBoundary();
  }, []);

  return null;
}