import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { TeacherAnalytics } from '@/components/teacher/TeacherAnalytics';

export default async function TeacherAnalyticsPage() {
  const supabase = createServerComponentClient({ cookies });
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return <div>Please log in to view your analytics.</div>;
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

  // Get analytics data for the last 6 months
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data: analyticsData } = await supabase
    .from('bookings')
    .select(`
      *,
      student:students(id, full_name, email),
      class:classes(
        id,
        class_name,
        course:courses(title, course_type, duration_minutes)
      ),
      attendance:attendance(status, attendance_time, notes),
      feedback:student_feedback(rating, feedback_text, created_at)
    `)
    .eq('class.teacher_id', teacherData.id)
    .gte('start_time', sixMonthsAgo.toISOString())
    .order('start_time', { ascending: false });

  // Get student retention data
  const { data: studentRetention } = await supabase
    .from('student_enrollments')
    .select(`
      *,
      student:students(full_name, email),
      class:classes!inner(teacher_id, course:courses(title, course_type))
    `)
    .eq('class.teacher_id', teacherData.id)
    .order('enrollment_date', { ascending: false });

  // Get performance metrics
  const { data: performanceMetrics } = await supabase
    .from('teacher_performance_metrics')
    .select('*')
    .eq('teacher_id', teacherData.id)
    .order('period_start', { ascending: false })
    .limit(12);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Teaching Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Insights into your teaching performance, student feedback, and attendance patterns
        </p>
      </div>
      
      <TeacherAnalytics 
        teacher={teacherData}
        analyticsData={analyticsData || []}
        studentRetention={studentRetention || []}
        performanceMetrics={performanceMetrics || []}
      />
    </div>
  );
}