import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { WeeklyTimetable } from '@/components/teacher/WeeklyTimetable';

export default async function TeacherSchedulePage() {
  const supabase = createServerComponentClient({ cookies });
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return <div>Please log in to view your schedule.</div>;
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

  // Get current week's bookings
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const { data: weeklyBookings } = await supabase
    .from('bookings')
    .select(`
      *,
      student:students(id, full_name, email, phone_number),
      class:classes(
        id,
        class_name,
        capacity,
        current_enrollment,
        course:courses(title, course_type, duration_minutes)
      ),
      attendance:attendance(status, attendance_time, notes)
    `)
    .eq('class.teacher_id', teacherData.id)
    .gte('start_time', startOfWeek.toISOString())
    .lte('start_time', endOfWeek.toISOString())
    .order('start_time', { ascending: true });

  // Get teacher availability for the week
  const { data: availability } = await supabase
    .from('teacher_availability')
    .select('*')
    .eq('teacher_id', teacherData.id)
    .order('day_of_week', { ascending: true });

  // Get available time slots for rescheduling
  const { data: availableSlots } = await supabase
    .from('teacher_availability')
    .select('*')
    .eq('teacher_id', teacherData.id)
    .eq('is_available', true);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Weekly Schedule</h1>
        <p className="text-muted-foreground mt-2">
          Manage your weekly timetable with drag-and-drop editing
        </p>
      </div>
      
      <WeeklyTimetable 
        teacher={teacherData}
        weeklyBookings={weeklyBookings || []}
        availability={availability || []}
        availableSlots={availableSlots || []}
      />
    </div>
  );
}