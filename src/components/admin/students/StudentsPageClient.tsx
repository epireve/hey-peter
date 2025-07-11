'use client';

import React from 'react';
import { StudentsPagePresentation } from './StudentsPagePresentation';
import { StudentsPageContainer } from './StudentsPageContainer';

interface StudentsPageClientProps {
  initialStudents: any[];
  columns: any[];
}

/**
 * Legacy component wrapper for backwards compatibility
 * @deprecated Use StudentsPageContainer for new implementations
 */
export const StudentsPageClient = React.memo(({ initialStudents, columns }: StudentsPageClientProps) => {
  // For backwards compatibility, we'll use the container component
  return <StudentsPageContainer initialStudents={initialStudents} />;
});

StudentsPageClient.displayName = 'StudentsPageClient';

// Export the new components
export { StudentsPageContainer } from './StudentsPageContainer';
export { StudentsPagePresentation } from './StudentsPagePresentation';
export type { StudentsPagePresentationProps } from './StudentsPagePresentation';