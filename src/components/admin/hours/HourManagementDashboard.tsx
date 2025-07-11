'use client';

import React from 'react';
import { HourManagementContainer } from './HourManagementContainer';

/**
 * Legacy component wrapper for backwards compatibility
 * @deprecated Use HourManagementContainer for new implementations
 */
export function HourManagementDashboard() {
  return <HourManagementContainer />;
}

// Export the new components
export { HourManagementContainer } from './HourManagementContainer';
export { HourManagementPresentation } from './HourManagementPresentation';
export type { HourManagementPresentationProps } from './HourManagementPresentation';