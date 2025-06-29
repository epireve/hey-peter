import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { AvailabilityScheduler } from '@/components/teacher/AvailabilityScheduler';

export default async function TeacherAvailabilityPage() {
  const supabase = createServerComponentClient({ cookies });
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return <div>Please log in to manage your availability.</div>;
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

  // Get current availability settings
  const { data: availability } = await supabase
    .from('teacher_availability')
    .select('*')
    .eq('teacher_id', teacherData.id)
    .order('day_of_week', { ascending: true });

  // Get existing bookings to show conflicts
  const { data: existingBookings } = await supabase
    .from('bookings')
    .select(`
      *,
      class:classes(
        class_name,
        course:courses(title, course_type)
      )
    `)
    .eq('class.teacher_id', teacherData.id)
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Teaching Availability</h1>
        <p className="text-muted-foreground mt-2">
          Set your weekly teaching schedule and time slots for students to book
        </p>
      </div>
      
      <AvailabilityScheduler 
        teacher={teacherData}
        availability={availability || []}
        existingBookings={existingBookings || []}
      />
    </div>
  );
}