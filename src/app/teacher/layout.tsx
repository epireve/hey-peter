import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { TeacherLayoutClient } from './TeacherLayoutClient';

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerComponentClient({ cookies });
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/auth/login');
  }

  // Check if user has teacher role and get full user data
  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (userData?.role !== 'teacher') {
    redirect('/dashboard'); // Redirect to general dashboard if not a teacher
  }

  // Get notifications count (pending classes, unread messages, etc.)
  const { data: pendingClasses } = await supabase
    .from('classes')
    .select('id', { count: 'exact' })
    .eq('teacher_id', session.user.id)
    .eq('status', 'pending');

  const notifications = {
    pendingClasses: pendingClasses?.length || 0,
    total: pendingClasses?.length || 0,
  };

  const user = {
    id: userData.id,
    email: userData.email,
    full_name: userData.full_name || session.user.email?.split('@')[0] || 'Teacher',
    role: userData.role,
  };

  return (
    <TeacherLayoutClient user={user} notifications={notifications}>
      {children}
    </TeacherLayoutClient>
  );
}