import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { TeacherDashboard } from '@/components/teacher/TeacherDashboard';

export default async function TeacherPage() {
  const supabase = createServerComponentClient({ cookies });
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return <div>Please log in to view your teacher dashboard.</div>;
  }

  // Get teacher data
  const { data: teacherData } = await supabase
    .from('teachers')
    .select(`
      *,
      classes:classes(
        id,
        class_name,
        capacity,
        current_enrollment,
        course:courses(
          title,
          course_type,
          duration_minutes
        )
      )
    `)
    .eq('user_id', session.user.id)
    .single();

  if (!teacherData) {
    return <div>Teacher profile not found. Please contact admin.</div>;
  }

  // Get upcoming classes and bookings
  const { data: upcomingBookings } = await supabase
    .from('bookings')
    .select(`
      *,
      student:students(full_name, email),
      class:classes(
        class_name,
        course:courses(title, course_type)
      )
    `)
    .eq('class.teacher_id', teacherData.id)
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(5);

  // Get recent attendance records
  const { data: recentAttendance } = await supabase
    .from('attendance')
    .select(`
      *,
      booking:bookings(
        student:students(full_name),
        class:classes(
          class_name,
          course:courses(title)
        )
      )
    `)
    .eq('booking.class.teacher_id', teacherData.id)
    .order('attendance_time', { ascending: false })
    .limit(10);

  return (
    <TeacherDashboard 
      teacher={teacherData}
      upcomingBookings={upcomingBookings || []}
      recentAttendance={recentAttendance || []}
    />
  );
}
