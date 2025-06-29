import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { CompensationDisplay } from '@/components/teacher/CompensationDisplay';

export default async function TeacherCompensationPage() {
  const supabase = createServerComponentClient({ cookies });
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return <div>Please log in to view your compensation.</div>;
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

  // Get completed bookings for compensation calculation
  const { data: completedBookings } = await supabase
    .from('bookings')
    .select(`
      *,
      class:classes(
        class_name,
        course:courses(title, course_type, duration_minutes)
      ),
      attendance:attendance!inner(status, attendance_time)
    `)
    .eq('class.teacher_id', teacherData.id)
    .eq('attendance.status', 'present')
    .order('start_time', { ascending: false })
    .limit(100);

  // Get compensation records
  const { data: compensationRecords } = await supabase
    .from('teacher_compensation')
    .select('*')
    .eq('teacher_id', teacherData.id)
    .order('period_start', { ascending: false })
    .limit(12);

  // Get bonus records
  const { data: bonusRecords } = await supabase
    .from('teacher_bonuses')
    .select('*')
    .eq('teacher_id', teacherData.id)
    .order('awarded_date', { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Compensation & Earnings</h1>
        <p className="text-muted-foreground mt-2">
          Track your teaching income, bonuses, and payment status
        </p>
      </div>
      
      <CompensationDisplay 
        teacher={teacherData}
        completedBookings={completedBookings || []}
        compensationRecords={compensationRecords || []}
        bonusRecords={bonusRecords || []}
      />
    </div>
  );
}