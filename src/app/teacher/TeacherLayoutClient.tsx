'use client';

import { TeacherDashboardLayout } from '@/components/teacher/TeacherDashboardLayout';

interface TeacherLayoutClientProps {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
  };
  notifications?: {
    pendingClasses?: number;
    total?: number;
  };
  children: React.ReactNode;
}

export function TeacherLayoutClient({ user, notifications, children }: TeacherLayoutClientProps) {
  return (
    <TeacherDashboardLayout user={user} notifications={notifications}>
      {children}
    </TeacherDashboardLayout>
  );
}