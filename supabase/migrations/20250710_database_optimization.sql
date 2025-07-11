-- =====================================================================================
-- Database Query Optimization and Indexing Enhancement
-- =====================================================================================
-- This migration adds comprehensive database optimizations including:
-- 1. Advanced composite indexes for complex queries
-- 2. Partial indexes for filtered queries
-- 3. Performance monitoring functions
-- 4. Query optimization materialized views
-- 5. Connection pooling configurations
-- =====================================================================================

-- =====================================================================================
-- ADVANCED COMPOSITE INDEXES
-- =====================================================================================

-- Student analytics composite indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_analytics_composite 
  ON students(test_level, created_at, remaining_hours) 
  WHERE remaining_hours > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_enrollment_date_level 
  ON students(enrollment_date, test_level) 
  WHERE enrollment_date IS NOT NULL;

-- Booking performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_student_date_status 
  ON bookings(student_id, booking_date, status) 
  WHERE status IN ('confirmed', 'completed');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_time_range_performance 
  ON bookings(start_time, end_time, status) 
  WHERE status NOT IN ('cancelled');

-- Class scheduling optimization indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_classes_teacher_capacity 
  ON classes(teacher_id, current_enrollment, capacity) 
  WHERE current_enrollment < capacity;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_classes_date_range_analytics 
  ON classes(start_date, end_date, course_id, teacher_id);

-- Attendance tracking optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_student_time_status 
  ON attendance(booking_id, attendance_time, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendance_analytics_range 
  ON attendance(attendance_time, status, hours_deducted) 
  WHERE status IN ('present', 'late');

-- Hour management optimization indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hour_purchases_student_active 
  ON hour_purchases(student_id, valid_until, hours_remaining) 
  WHERE is_active = true AND is_expired = false AND payment_status = 'completed';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hour_transactions_analytics 
  ON hour_transactions(student_id, created_at, transaction_type, hours_amount);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hour_transactions_class_tracking 
  ON hour_transactions(class_id, booking_id, created_at) 
  WHERE class_id IS NOT NULL;

-- Leave requests optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leave_requests_processing 
  ON leave_requests(status, submitted_at, class_date) 
  WHERE status = 'pending';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leave_requests_student_period 
  ON leave_requests(student_id, class_date, status);

-- Teacher performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_teachers_availability_utilization 
  ON teachers(availability, hourly_rate) 
  WHERE availability IS NOT NULL;

-- Notification system optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_delivery 
  ON notifications(user_id, sent_time, is_read) 
  WHERE is_read = false;

-- System performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_performance 
  ON audit_logs(timestamp, table_name, action) 
  WHERE timestamp >= NOW() - INTERVAL '30 days';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_active 
  ON user_sessions(user_id, login_time, is_active) 
  WHERE is_active = true;

-- =====================================================================================
-- EXPRESSION INDEXES FOR COMPUTED QUERIES
-- =====================================================================================

-- Date-based expression indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_date_trunc_month 
  ON bookings(date_trunc('month', booking_date), status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hour_transactions_date_month 
  ON hour_transactions(date_trunc('month', created_at), transaction_type);

-- Hour calculation expression indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hour_purchases_days_remaining 
  ON hour_purchases(extract(days from valid_until - NOW())) 
  WHERE is_active = true AND is_expired = false;

-- Student progress calculation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_student_courses_progress_bucket 
  ON student_courses(
    CASE 
      WHEN progress_percentage >= 90 THEN 'completed'
      WHEN progress_percentage >= 70 THEN 'advanced'
      WHEN progress_percentage >= 50 THEN 'intermediate'
      ELSE 'beginner'
    END,
    student_id
  );

-- =====================================================================================
-- MATERIALIZED VIEWS FOR ANALYTICS
-- =====================================================================================

-- Student performance summary view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_student_performance_summary AS
SELECT 
  s.id as student_id,
  s.full_name,
  s.test_level,
  s.enrollment_date,
  COALESCE(student_stats.total_bookings, 0) as total_bookings,
  COALESCE(student_stats.completed_classes, 0) as completed_classes,
  COALESCE(student_stats.attendance_rate, 0) as attendance_rate,
  COALESCE(student_stats.total_hours_used, 0) as total_hours_used,
  COALESCE(balance.current_hours, 0) as current_hours_balance,
  COALESCE(progress.avg_progress, 0) as average_progress,
  CASE 
    WHEN student_stats.attendance_rate < 70 OR progress.avg_progress < 50 THEN true
    ELSE false
  END as at_risk,
  NOW() as last_updated
FROM students s
LEFT JOIN (
  SELECT 
    b.student_id,
    COUNT(*) as total_bookings,
    COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_classes,
    ROUND(
      COUNT(CASE WHEN a.status = 'present' THEN 1 END)::numeric / 
      NULLIF(COUNT(a.id), 0) * 100, 2
    ) as attendance_rate,
    COALESCE(SUM(a.hours_deducted), 0) as total_hours_used
  FROM bookings b
  LEFT JOIN attendance a ON b.id = a.booking_id
  WHERE b.created_at >= NOW() - INTERVAL '6 months'
  GROUP BY b.student_id
) student_stats ON s.id = student_stats.student_id
LEFT JOIN (
  SELECT 
    student_id,
    ROUND(AVG(progress_percentage), 2) as avg_progress
  FROM student_courses
  GROUP BY student_id
) progress ON s.id = progress.student_id
LEFT JOIN (
  SELECT 
    student_id,
    COALESCE(SUM(hours_remaining), 0) as current_hours
  FROM hour_purchases
  WHERE is_active = true 
    AND is_expired = false 
    AND payment_status = 'completed'
    AND valid_until > NOW()
  GROUP BY student_id
) balance ON s.id = balance.student_id;

-- Create unique index for materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_student_performance_summary_student_id 
  ON mv_student_performance_summary(student_id);

-- Teacher utilization summary view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_teacher_utilization_summary AS
SELECT 
  t.id as teacher_id,
  t.full_name,
  t.hourly_rate,
  teacher_stats.total_classes,
  teacher_stats.completed_classes,
  teacher_stats.cancelled_classes,
  teacher_stats.total_hours_taught,
  teacher_stats.utilization_rate,
  teacher_stats.avg_rating,
  teacher_stats.unique_students,
  teacher_stats.revenue_generated,
  NOW() as last_updated
FROM teachers t
LEFT JOIN (
  SELECT 
    c.teacher_id,
    COUNT(b.id) as total_classes,
    COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_classes,
    COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_classes,
    ROUND(SUM(CASE WHEN b.status = 'completed' THEN c.duration_minutes ELSE 0 END) / 60.0, 2) as total_hours_taught,
    ROUND(
      COUNT(CASE WHEN b.status = 'completed' THEN 1 END)::numeric / 
      NULLIF(COUNT(b.id), 0) * 100, 2
    ) as utilization_rate,
    COALESCE(AVG(f.rating), 0) as avg_rating,
    COUNT(DISTINCT b.student_id) as unique_students,
    ROUND(SUM(CASE WHEN b.status = 'completed' THEN 
      (c.duration_minutes / 60.0) * t.hourly_rate ELSE 0 END), 2) as revenue_generated
  FROM classes c
  INNER JOIN bookings b ON c.id = b.class_id
  INNER JOIN teachers t ON c.teacher_id = t.id
  LEFT JOIN feedback f ON c.id = f.class_id
  WHERE b.created_at >= NOW() - INTERVAL '3 months'
  GROUP BY c.teacher_id, t.hourly_rate
) teacher_stats ON t.id = teacher_stats.teacher_id;

-- Create unique index for teacher utilization view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_teacher_utilization_summary_teacher_id 
  ON mv_teacher_utilization_summary(teacher_id);

-- Daily analytics summary view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_analytics_summary AS
SELECT 
  date_trunc('day', activity_date)::date as activity_date,
  total_bookings,
  completed_classes,
  cancelled_classes,
  total_students_active,
  new_enrollments,
  total_hours_taught,
  total_revenue,
  avg_class_utilization,
  NOW() as last_updated
FROM (
  SELECT 
    COALESCE(booking_stats.activity_date, enrollment_stats.activity_date) as activity_date,
    COALESCE(booking_stats.total_bookings, 0) as total_bookings,
    COALESCE(booking_stats.completed_classes, 0) as completed_classes,
    COALESCE(booking_stats.cancelled_classes, 0) as cancelled_classes,
    COALESCE(booking_stats.total_students_active, 0) as total_students_active,
    COALESCE(enrollment_stats.new_enrollments, 0) as new_enrollments,
    COALESCE(booking_stats.total_hours_taught, 0) as total_hours_taught,
    COALESCE(revenue_stats.total_revenue, 0) as total_revenue,
    COALESCE(booking_stats.avg_class_utilization, 0) as avg_class_utilization
  FROM (
    SELECT 
      b.booking_date as activity_date,
      COUNT(*) as total_bookings,
      COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_classes,
      COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_classes,
      COUNT(DISTINCT b.student_id) as total_students_active,
      ROUND(SUM(CASE WHEN b.status = 'completed' THEN b.duration_minutes ELSE 0 END) / 60.0, 2) as total_hours_taught,
      ROUND(AVG(CASE WHEN c.capacity > 0 THEN c.current_enrollment::numeric / c.capacity * 100 ELSE 0 END), 2) as avg_class_utilization
    FROM bookings b
    LEFT JOIN classes c ON b.class_id = c.id
    WHERE b.booking_date >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY b.booking_date
  ) booking_stats
  FULL OUTER JOIN (
    SELECT 
      s.enrollment_date as activity_date,
      COUNT(*) as new_enrollments
    FROM students s
    WHERE s.enrollment_date >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY s.enrollment_date
  ) enrollment_stats ON booking_stats.activity_date = enrollment_stats.activity_date
  LEFT JOIN (
    SELECT 
      hp.created_at::date as activity_date,
      SUM(hp.price_paid) as total_revenue
    FROM hour_purchases hp
    WHERE hp.payment_status = 'completed'
      AND hp.created_at >= CURRENT_DATE - INTERVAL '90 days'
    GROUP BY hp.created_at::date
  ) revenue_stats ON COALESCE(booking_stats.activity_date, enrollment_stats.activity_date) = revenue_stats.activity_date
) combined_stats
WHERE activity_date IS NOT NULL;

-- Create unique index for daily analytics view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_daily_analytics_summary_date 
  ON mv_daily_analytics_summary(activity_date);

-- =====================================================================================
-- PERFORMANCE MONITORING FUNCTIONS
-- =====================================================================================

-- Function to get slow query statistics
CREATE OR REPLACE FUNCTION get_slow_queries(
  threshold_ms INTEGER DEFAULT 1000,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE(
  query_text TEXT,
  total_calls BIGINT,
  total_time DOUBLE PRECISION,
  avg_time DOUBLE PRECISION,
  max_time DOUBLE PRECISION
) AS $$
BEGIN
  -- Note: This requires pg_stat_statements extension
  -- Enable it with: CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
  
  RETURN QUERY
  SELECT 
    pss.query,
    pss.calls,
    pss.total_exec_time,
    pss.mean_exec_time,
    pss.max_exec_time
  FROM pg_stat_statements pss
  WHERE pss.mean_exec_time > threshold_ms
  ORDER BY pss.mean_exec_time DESC
  LIMIT limit_count;
EXCEPTION 
  WHEN OTHERS THEN
    -- Fallback if pg_stat_statements is not available
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Function to analyze table statistics
CREATE OR REPLACE FUNCTION analyze_table_performance()
RETURNS TABLE(
  schema_name NAME,
  table_name NAME,
  table_size TEXT,
  index_size TEXT,
  total_size TEXT,
  row_count BIGINT,
  seq_scan_count BIGINT,
  index_scan_count BIGINT,
  scan_ratio NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname::NAME,
    tablename::NAME,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) + pg_indexes_size(schemaname||'.'||tablename)) as total_size,
    n_tup_ins + n_tup_upd + n_tup_del as row_count,
    seq_scan as seq_scan_count,
    idx_scan as index_scan_count,
    CASE 
      WHEN seq_scan + idx_scan > 0 
      THEN ROUND((idx_scan::NUMERIC / (seq_scan + idx_scan)) * 100, 2)
      ELSE 0 
    END as scan_ratio
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get index usage statistics
CREATE OR REPLACE FUNCTION get_index_usage_stats()
RETURNS TABLE(
  schema_name NAME,
  table_name NAME,
  index_name NAME,
  index_size TEXT,
  index_scans BIGINT,
  tuples_read BIGINT,
  tuples_fetched BIGINT,
  usage_ratio NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname::NAME,
    tablename::NAME,
    indexrelname::NAME,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    CASE 
      WHEN idx_scan > 0 
      THEN ROUND((idx_tup_fetch::NUMERIC / idx_tup_read) * 100, 2)
      ELSE 0 
    END as usage_ratio
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
  ORDER BY idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to identify missing indexes
CREATE OR REPLACE FUNCTION suggest_missing_indexes()
RETURNS TABLE(
  suggestion TEXT,
  table_name NAME,
  column_suggestions TEXT
) AS $$
BEGIN
  RETURN QUERY
  -- Suggest indexes for tables with high sequential scan ratios
  SELECT 
    'High sequential scan ratio detected'::TEXT as suggestion,
    tablename::NAME,
    'Consider adding indexes on frequently queried columns'::TEXT as column_suggestions
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
    AND seq_scan > idx_scan * 2
    AND seq_scan > 100
  
  UNION ALL
  
  -- Suggest composite indexes for tables with multiple single-column indexes
  SELECT 
    'Multiple single-column indexes detected'::TEXT as suggestion,
    tablename::NAME,
    'Consider composite indexes for multi-column queries'::TEXT as column_suggestions
  FROM (
    SELECT tablename, COUNT(*) as index_count
    FROM pg_indexes 
    WHERE schemaname = 'public'
    GROUP BY tablename
    HAVING COUNT(*) > 5
  ) t;
END;
$$ LANGUAGE plpgsql;

-- Function to monitor connection statistics
CREATE OR REPLACE FUNCTION get_connection_stats()
RETURNS TABLE(
  total_connections INTEGER,
  active_connections INTEGER,
  idle_connections INTEGER,
  idle_in_transaction INTEGER,
  max_connections INTEGER,
  connection_usage_pct NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_connections,
    COUNT(CASE WHEN state = 'active' THEN 1 END)::INTEGER as active_connections,
    COUNT(CASE WHEN state = 'idle' THEN 1 END)::INTEGER as idle_connections,
    COUNT(CASE WHEN state = 'idle in transaction' THEN 1 END)::INTEGER as idle_in_transaction,
    current_setting('max_connections')::INTEGER as max_connections,
    ROUND((COUNT(*)::NUMERIC / current_setting('max_connections')::NUMERIC) * 100, 2) as connection_usage_pct
  FROM pg_stat_activity
  WHERE backend_type = 'client backend';
END;
$$ LANGUAGE plpgsql;

-- Function to analyze query performance patterns
CREATE OR REPLACE FUNCTION analyze_query_patterns(
  days_back INTEGER DEFAULT 7
)
RETURNS TABLE(
  query_pattern TEXT,
  execution_count BIGINT,
  avg_execution_time NUMERIC,
  total_time NUMERIC,
  optimization_priority INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN query ILIKE '%SELECT%FROM students%' THEN 'Student Queries'
      WHEN query ILIKE '%SELECT%FROM bookings%' THEN 'Booking Queries'
      WHEN query ILIKE '%SELECT%FROM classes%' THEN 'Class Queries'
      WHEN query ILIKE '%SELECT%FROM hour_%' THEN 'Hour Management Queries'
      WHEN query ILIKE '%SELECT%FROM teachers%' THEN 'Teacher Queries'
      WHEN query ILIKE '%INSERT%' THEN 'Insert Operations'
      WHEN query ILIKE '%UPDATE%' THEN 'Update Operations'
      WHEN query ILIKE '%DELETE%' THEN 'Delete Operations'
      ELSE 'Other Queries'
    END as query_pattern,
    SUM(calls) as execution_count,
    ROUND(AVG(mean_exec_time), 2) as avg_execution_time,
    ROUND(SUM(total_exec_time), 2) as total_time,
    CASE 
      WHEN AVG(mean_exec_time) > 1000 THEN 1  -- High priority
      WHEN AVG(mean_exec_time) > 500 THEN 2   -- Medium priority
      ELSE 3                                   -- Low priority
    END as optimization_priority
  FROM pg_stat_statements
  GROUP BY query_pattern
  ORDER BY total_time DESC;
EXCEPTION 
  WHEN OTHERS THEN
    -- Fallback if pg_stat_statements is not available
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- MATERIALIZED VIEW REFRESH FUNCTIONS
-- =====================================================================================

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS VOID AS $$
BEGIN
  -- Refresh materialized views concurrently to minimize locking
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_student_performance_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_teacher_utilization_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_analytics_summary;
  
  -- Log the refresh
  INSERT INTO system_events (event_type, event_category, description, metadata)
  VALUES (
    'materialized_views_refreshed',
    'maintenance',
    'Analytics materialized views refreshed',
    jsonb_build_object('refreshed_at', NOW())
  );
END;
$$ LANGUAGE plpgsql;

-- Function to refresh views selectively based on data changes
CREATE OR REPLACE FUNCTION refresh_views_if_needed()
RETURNS VOID AS $$
DECLARE
  last_student_update TIMESTAMP;
  last_booking_update TIMESTAMP;
  last_view_refresh TIMESTAMP;
BEGIN
  -- Get last update times
  SELECT MAX(updated_at) INTO last_student_update FROM students;
  SELECT MAX(updated_at) INTO last_booking_update FROM bookings;
  
  -- Get last view refresh time
  SELECT MAX(created_at) INTO last_view_refresh 
  FROM system_events 
  WHERE event_type = 'materialized_views_refreshed';
  
  -- Refresh if data has been updated since last refresh
  IF last_student_update > COALESCE(last_view_refresh, '1970-01-01'::timestamp) OR
     last_booking_update > COALESCE(last_view_refresh, '1970-01-01'::timestamp) THEN
    PERFORM refresh_analytics_views();
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- AUTOMATIC MAINTENANCE PROCEDURES
-- =====================================================================================

-- Function to automatically analyze tables
CREATE OR REPLACE FUNCTION auto_analyze_tables()
RETURNS VOID AS $$
DECLARE
  table_record RECORD;
BEGIN
  -- Analyze tables that have had significant changes
  FOR table_record IN 
    SELECT tablename 
    FROM pg_stat_user_tables 
    WHERE schemaname = 'public'
      AND (n_tup_ins + n_tup_upd + n_tup_del) > 1000
  LOOP
    EXECUTE 'ANALYZE ' || table_record.tablename;
  END LOOP;
  
  -- Log the analysis
  INSERT INTO system_events (event_type, event_category, description)
  VALUES ('auto_analyze_completed', 'maintenance', 'Automatic table analysis completed');
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old audit logs
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(
  retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_logs 
  WHERE timestamp < NOW() - (retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log the cleanup
  INSERT INTO system_events (event_type, event_category, description, metadata)
  VALUES (
    'audit_logs_cleaned',
    'maintenance',
    'Old audit logs cleaned up',
    jsonb_build_object('deleted_count', deleted_count, 'retention_days', retention_days)
  );
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- PERFORMANCE OPTIMIZATION SETTINGS
-- =====================================================================================

-- Create a function to apply recommended database settings
CREATE OR REPLACE FUNCTION apply_performance_settings()
RETURNS VOID AS $$
BEGIN
  -- Note: These settings should be applied at the database level by administrators
  -- This function documents recommended settings
  
  INSERT INTO system_events (event_type, event_category, description, metadata)
  VALUES (
    'performance_settings_documented',
    'configuration',
    'Performance optimization settings documented',
    jsonb_build_object(
      'recommended_settings', jsonb_build_object(
        'shared_buffers', '25% of RAM',
        'effective_cache_size', '75% of RAM',
        'maintenance_work_mem', '256MB',
        'checkpoint_completion_target', 0.7,
        'wal_buffers', '16MB',
        'default_statistics_target', 100,
        'random_page_cost', 1.1,
        'effective_io_concurrency', 200
      )
    )
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- SCHEDULED MAINTENANCE SETUP
-- =====================================================================================

-- Create a maintenance schedule log table
CREATE TABLE IF NOT EXISTS maintenance_schedule (
  id SERIAL PRIMARY KEY,
  task_name VARCHAR(100) NOT NULL,
  task_type VARCHAR(50) NOT NULL,
  schedule_cron VARCHAR(100) NOT NULL,
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default maintenance tasks
INSERT INTO maintenance_schedule (task_name, task_type, schedule_cron, next_run)
VALUES 
  ('Refresh Analytics Views', 'analytics', '0 */6 * * *', NOW() + INTERVAL '6 hours'),
  ('Auto Analyze Tables', 'maintenance', '0 2 * * *', DATE_TRUNC('day', NOW()) + INTERVAL '1 day 2 hours'),
  ('Cleanup Audit Logs', 'cleanup', '0 3 * * 0', DATE_TRUNC('week', NOW()) + INTERVAL '1 week 3 hours'),
  ('Performance Stats Collection', 'monitoring', '*/15 * * * *', NOW() + INTERVAL '15 minutes')
ON CONFLICT (task_name) DO NOTHING;

-- =====================================================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================================================

COMMENT ON FUNCTION get_slow_queries IS 'Identifies slow-running queries that may need optimization';
COMMENT ON FUNCTION analyze_table_performance IS 'Provides comprehensive table performance statistics';
COMMENT ON FUNCTION get_index_usage_stats IS 'Shows index usage patterns to identify unused indexes';
COMMENT ON FUNCTION suggest_missing_indexes IS 'Suggests potential missing indexes based on query patterns';
COMMENT ON FUNCTION get_connection_stats IS 'Monitors database connection usage and patterns';
COMMENT ON FUNCTION analyze_query_patterns IS 'Analyzes query execution patterns for optimization opportunities';
COMMENT ON FUNCTION refresh_analytics_views IS 'Refreshes all materialized views for analytics';
COMMENT ON FUNCTION auto_analyze_tables IS 'Automatically analyzes tables with significant changes';
COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Cleans up old audit log entries to maintain performance';

COMMENT ON MATERIALIZED VIEW mv_student_performance_summary IS 'Pre-computed student performance metrics for fast analytics';
COMMENT ON MATERIALIZED VIEW mv_teacher_utilization_summary IS 'Pre-computed teacher utilization and performance metrics';
COMMENT ON MATERIALIZED VIEW mv_daily_analytics_summary IS 'Pre-computed daily activity and performance metrics';

-- =====================================================================================
-- INITIAL SETUP COMMANDS
-- =====================================================================================

-- Refresh the materialized views initially
SELECT refresh_analytics_views();

-- Analyze all tables to update statistics
SELECT auto_analyze_tables();

-- Document performance settings
SELECT apply_performance_settings();

-- Log the completion of optimization setup
INSERT INTO system_events (event_type, event_category, description, metadata)
VALUES (
  'database_optimization_completed',
  'system',
  'Database query optimization and indexing migration completed',
  jsonb_build_object(
    'migration_version', '20250710_database_optimization',
    'completed_at', NOW(),
    'optimizations_applied', jsonb_build_array(
      'composite_indexes',
      'materialized_views',
      'performance_monitoring',
      'maintenance_procedures'
    )
  )
);