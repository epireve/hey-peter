import { LazyStudentDashboardLayout, preloadStudentDashboard } from '@/components/student/LazyStudentComponents';
import { useEffect } from 'react';

export default function StudentPage() {
  useEffect(() => {
    // Preload commonly used student components
    preloadStudentDashboard();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <LazyStudentDashboardLayout />
    </div>
  );
}
