import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { ClassHourTracker } from '@/components/teacher/ClassHourTracker';

export default async function TeacherHoursPage() {
  const supabase = createServerComponentClient({ cookies });
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return <div>Please log in to view your class hours.</div>;
  }

  // Get teacher data
  const { data: teacherData } = await supabase
    .from('teachers')
    .select('*')
    .eq('user_id', session.user.id)
    .single();

  if (!teacherData) {
    return <div>Teacher profile not found. Please contact admin.</div>;
  }

  // Get class hours data with filtering capabilities
  const { data: classHours } = await supabase
    .from('bookings')
    .select(`
      *,
      student:students(full_name, email),
      class:classes(
        class_name,
        course:courses(title, course_type, duration_minutes)
      ),
      attendance:attendance(status, attendance_time)
    `)
    .eq('class.teacher_id', teacherData.id)
    .order('start_time', { ascending: false })
    .limit(100);

  // Get teacher availability data
  const { data: availability } = await supabase
    .from('teacher_availability')
    .select('*')
    .eq('teacher_id', teacherData.id)
    .order('day_of_week', { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Class Hours & Tracking</h1>
        <p className="text-muted-foreground mt-2">
          Track your teaching hours, view schedules, and monitor attendance
        </p>
      </div>
      
      <ClassHourTracker 
        teacher={teacherData}
        classHours={classHours || []}
        availability={availability || []}
      />
    </div>
  );
}