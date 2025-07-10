-- =====================================================================================
-- HeyPeter Academy - Scheduling System Database Schema
-- =====================================================================================
-- This file contains the additional database tables and modifications needed
-- for the AI-powered automatic class scheduling system.
-- 
-- Key Features Supported:
-- - Intelligent content-based scheduling
-- - Student progress tracking for scheduling decisions
-- - Teacher workload balancing
-- - Conflict detection and resolution
-- - Performance optimization and analytics
-- - Manual override capabilities
-- - Daily data updates and synchronization
-- =====================================================================================

-- =====================================================================================
-- LEARNING CONTENT AND CURRICULUM TABLES
-- =====================================================================================

-- Learning content units table
CREATE TABLE learning_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    course_type VARCHAR(50) NOT NULL CHECK (course_type IN ('Basic', 'Everyday A', 'Everyday B', 'Speak Up', 'Business English', '1-on-1')),
    unit_number INTEGER NOT NULL CHECK (unit_number > 0),
    lesson_number INTEGER NOT NULL CHECK (lesson_number > 0),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    estimated_duration INTEGER NOT NULL CHECK (estimated_duration > 0), -- in minutes
    difficulty_level INTEGER NOT NULL CHECK (difficulty_level >= 1 AND difficulty_level <= 10),
    is_required BOOLEAN DEFAULT TRUE,
    learning_objectives TEXT[],
    skills_covered JSONB, -- Array of skill objects
    prerequisites UUID[], -- Array of content IDs that must be completed first
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique lesson numbering within a course unit
    UNIQUE(course_id, unit_number, lesson_number)
);

-- Learning skills reference table
CREATE TABLE learning_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL CHECK (category IN ('speaking', 'listening', 'reading', 'writing', 'grammar', 'vocabulary', 'pronunciation')),
    description TEXT,
    weight DECIMAL(3,2) DEFAULT 1.0 CHECK (weight > 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- STUDENT PROGRESS AND PERFORMANCE TRACKING
-- =====================================================================================

-- Student progress tracking table
CREATE TABLE student_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    progress_percentage DECIMAL(5,2) DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    current_unit INTEGER DEFAULT 1 CHECK (current_unit > 0),
    current_lesson INTEGER DEFAULT 1 CHECK (current_lesson > 0),
    learning_pace DECIMAL(4,2) DEFAULT 2.0 CHECK (learning_pace > 0), -- lessons per week
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    study_streak INTEGER DEFAULT 0 CHECK (study_streak >= 0), -- consecutive days
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one progress record per student per course
    UNIQUE(student_id, course_id)
);

-- Student content completion tracking
CREATE TABLE student_content_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    content_id UUID NOT NULL REFERENCES learning_content(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'mastered')),
    completion_percentage DECIMAL(5,2) DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    time_spent INTEGER DEFAULT 0, -- in minutes
    attempts INTEGER DEFAULT 0,
    best_score DECIMAL(5,2), -- percentage score
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one record per student per content
    UNIQUE(student_id, content_id)
);

-- Student skill assessments
CREATE TABLE student_skill_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES learning_skills(id) ON DELETE CASCADE,
    assessment_level DECIMAL(4,2) NOT NULL CHECK (assessment_level >= 0 AND assessment_level <= 10),
    assessment_date TIMESTAMPTZ DEFAULT NOW(),
    assessment_type VARCHAR(50) DEFAULT 'automatic' CHECK (assessment_type IN ('manual', 'automatic', 'test', 'observation')),
    assessor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student performance metrics
CREATE TABLE student_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    attendance_rate DECIMAL(4,3) DEFAULT 0 CHECK (attendance_rate >= 0 AND attendance_rate <= 1),
    assignment_completion_rate DECIMAL(4,3) DEFAULT 0 CHECK (assignment_completion_rate >= 0 AND assignment_completion_rate <= 1),
    average_score DECIMAL(5,2) DEFAULT 0 CHECK (average_score >= 0 AND average_score <= 100),
    engagement_level INTEGER DEFAULT 5 CHECK (engagement_level >= 1 AND engagement_level <= 10),
    preferred_class_types VARCHAR(20)[] DEFAULT ARRAY['group'], -- 'individual', 'group'
    optimal_class_size INTEGER DEFAULT 4 CHECK (optimal_class_size >= 1 AND optimal_class_size <= 9),
    challenging_topics TEXT[],
    calculation_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one record per student per course per calculation date
    UNIQUE(student_id, course_id, calculation_date)
);

-- Student preferred learning times
CREATE TABLE student_preferred_times (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL CHECK (start_time < end_time),
    preference_strength INTEGER DEFAULT 5 CHECK (preference_strength >= 1 AND preference_strength <= 10),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- SCHEDULING CONFIGURATION AND STATE
-- =====================================================================================

-- Scheduling algorithm configuration
CREATE TABLE scheduling_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,
    config_data JSONB NOT NULL, -- Full SchedulingAlgorithmConfig as JSON
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    activated_at TIMESTAMPTZ,
    
    -- Ensure only one active config at a time
    CONSTRAINT only_one_active_config EXCLUDE (is_active WITH =) WHERE (is_active = TRUE)
);

-- Scheduling requests tracking
CREATE TABLE scheduling_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('auto_schedule', 'reschedule', 'conflict_resolution', 'optimization', 'content_sync', 'manual_override')),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    student_ids UUID[] NOT NULL,
    course_id UUID NOT NULL REFERENCES courses(id),
    preferred_time_slots JSONB, -- Array of TimeSlot objects
    content_to_schedule UUID[], -- Array of content IDs
    constraints_override JSONB, -- Partial SchedulingConstraints override
    manual_overrides JSONB, -- Array of SchedulingOverride objects
    context_data JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    requested_by UUID NOT NULL REFERENCES users(id),
    processed_at TIMESTAMPTZ,
    processing_time INTEGER, -- in milliseconds
    error_details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduling results tracking
CREATE TABLE scheduling_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES scheduling_requests(id) ON DELETE CASCADE,
    success BOOLEAN NOT NULL,
    scheduled_classes JSONB, -- Array of ScheduledClass objects
    conflicts_detected JSONB, -- Array of SchedulingConflict objects
    recommendations JSONB, -- Array of SchedulingRecommendation objects
    metrics JSONB NOT NULL, -- SchedulingMetrics object
    processing_time INTEGER NOT NULL, -- in milliseconds
    algorithm_version VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- ENHANCED CLASS SCHEDULING TABLES
-- =====================================================================================

-- Enhanced scheduled classes table (extends the existing bookings concept)
CREATE TABLE scheduled_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    class_type VARCHAR(20) NOT NULL CHECK (class_type IN ('individual', 'group')),
    scheduled_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL CHECK (start_time < end_time),
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    max_capacity INTEGER NOT NULL CHECK (max_capacity > 0 AND max_capacity <= 9),
    current_enrollment INTEGER DEFAULT 0 CHECK (current_enrollment >= 0),
    location VARCHAR(255),
    meeting_link VARCHAR(500),
    content_to_cover UUID[], -- Array of learning_content IDs
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled')),
    confidence_score DECIMAL(4,3) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    scheduling_rationale TEXT,
    created_by_request UUID REFERENCES scheduling_requests(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Class enrollment tracking (many-to-many between students and scheduled classes)
CREATE TABLE class_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheduled_class_id UUID NOT NULL REFERENCES scheduled_classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    enrollment_status VARCHAR(20) NOT NULL DEFAULT 'enrolled' CHECK (enrollment_status IN ('enrolled', 'waitlisted', 'confirmed', 'attended', 'absent', 'cancelled')),
    enrollment_date TIMESTAMPTZ DEFAULT NOW(),
    confirmation_date TIMESTAMPTZ,
    cancellation_date TIMESTAMPTZ,
    cancellation_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one enrollment per student per class
    UNIQUE(scheduled_class_id, student_id)
);

-- =====================================================================================
-- CONFLICT TRACKING AND RESOLUTION
-- =====================================================================================

-- Scheduling conflicts tracking
CREATE TABLE scheduling_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conflict_type VARCHAR(50) NOT NULL CHECK (conflict_type IN ('time_overlap', 'capacity_exceeded', 'teacher_unavailable', 'student_unavailable', 'content_mismatch', 'resource_conflict')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    entity_ids UUID[] NOT NULL, -- IDs of conflicting entities
    description TEXT NOT NULL,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    resolution_status VARCHAR(20) DEFAULT 'pending' CHECK (resolution_status IN ('pending', 'in_progress', 'resolved', 'ignored')),
    resolved_at TIMESTAMPTZ,
    resolution_method TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conflict resolution attempts
CREATE TABLE conflict_resolutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conflict_id UUID NOT NULL REFERENCES scheduling_conflicts(id) ON DELETE CASCADE,
    resolution_type VARCHAR(50) NOT NULL CHECK (resolution_type IN ('reschedule', 'reassign_teacher', 'split_class', 'merge_classes', 'cancel_conflicting', 'manual_intervention')),
    description TEXT NOT NULL,
    impact_data JSONB, -- ResolutionImpact object
    feasibility_score DECIMAL(4,3) CHECK (feasibility_score >= 0 AND feasibility_score <= 1),
    implementation_time INTEGER, -- in minutes
    required_approvals TEXT[],
    status VARCHAR(20) DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'implemented', 'failed', 'rejected')),
    implemented_by UUID REFERENCES users(id),
    implemented_at TIMESTAMPTZ,
    implementation_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- CONTENT SYNCHRONIZATION
-- =====================================================================================

-- Content synchronization jobs
CREATE TABLE content_sync_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_type VARCHAR(50) NOT NULL CHECK (sync_type IN ('progress_sync', 'content_alignment', 'group_sync', 'curriculum_update')),
    target_entities UUID[], -- Student IDs, class IDs, etc.
    sync_config JSONB, -- ContentSyncConfig object
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
    progress_percentage DECIMAL(5,2) DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    items_synced INTEGER DEFAULT 0,
    total_items INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- DAILY DATA UPDATES AND ANALYTICS
-- =====================================================================================

-- Daily update jobs tracking
CREATE TABLE daily_update_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    update_date DATE NOT NULL,
    job_type VARCHAR(50) NOT NULL CHECK (job_type IN ('student_progress', 'teacher_availability', 'class_schedules', 'content_sync', 'performance_metrics', 'analytics_refresh')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'skipped')),
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    dependencies TEXT[], -- Other job types this depends on
    config_data JSONB,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    processing_time INTEGER, -- in milliseconds
    records_processed INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_details JSONB,
    metrics JSONB, -- Job-specific metrics
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one job per type per date
    UNIQUE(update_date, job_type)
);

-- Analytics snapshots for performance tracking
CREATE TABLE scheduling_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    snapshot_date DATE NOT NULL,
    snapshot_type VARCHAR(50) NOT NULL CHECK (snapshot_type IN ('daily', 'weekly', 'monthly')),
    total_classes_scheduled INTEGER DEFAULT 0,
    total_students_served INTEGER DEFAULT 0,
    total_teachers_utilized INTEGER DEFAULT 0,
    average_class_utilization DECIMAL(4,3) DEFAULT 0,
    conflict_resolution_rate DECIMAL(4,3) DEFAULT 0,
    student_satisfaction_score DECIMAL(4,3) DEFAULT 0,
    teacher_satisfaction_score DECIMAL(4,3) DEFAULT 0,
    system_performance_score DECIMAL(4,3) DEFAULT 0,
    detailed_metrics JSONB, -- Additional detailed metrics
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one snapshot per type per date
    UNIQUE(snapshot_date, snapshot_type)
);

-- =====================================================================================
-- SCHEDULING EVENTS AND AUDIT LOG
-- =====================================================================================

-- Scheduling events for monitoring and debugging
CREATE TABLE scheduling_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    event_source VARCHAR(50) NOT NULL CHECK (event_source IN ('api', 'scheduler', 'optimizer', 'conflict_resolver', 'sync_service')),
    entity_type VARCHAR(50), -- 'student', 'class', 'teacher', 'system'
    entity_id UUID,
    event_data JSONB NOT NULL,
    event_metadata JSONB,
    severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id UUID,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- PERFORMANCE INDEXES
-- =====================================================================================

-- Learning content indexes
CREATE INDEX idx_learning_content_course ON learning_content(course_id);
CREATE INDEX idx_learning_content_unit_lesson ON learning_content(course_id, unit_number, lesson_number);
CREATE INDEX idx_learning_content_difficulty ON learning_content(difficulty_level);
CREATE INDEX idx_learning_content_required ON learning_content(is_required);

-- Student progress indexes
CREATE INDEX idx_student_progress_student_course ON student_progress(student_id, course_id);
CREATE INDEX idx_student_progress_activity ON student_progress(last_activity);
CREATE INDEX idx_student_content_progress_student ON student_content_progress(student_id);
CREATE INDEX idx_student_content_progress_status ON student_content_progress(status);
CREATE INDEX idx_student_content_progress_completion ON student_content_progress(completion_percentage);

-- Student performance indexes
CREATE INDEX idx_student_performance_student_course ON student_performance_metrics(student_id, course_id);
CREATE INDEX idx_student_performance_calculation_date ON student_performance_metrics(calculation_date);
CREATE INDEX idx_student_skill_assessments_student ON student_skill_assessments(student_id);
CREATE INDEX idx_student_skill_assessments_skill ON student_skill_assessments(skill_id);
CREATE INDEX idx_student_preferred_times_student ON student_preferred_times(student_id);

-- Scheduling indexes
CREATE INDEX idx_scheduling_requests_status ON scheduling_requests(status);
CREATE INDEX idx_scheduling_requests_requested_by ON scheduling_requests(requested_by);
CREATE INDEX idx_scheduling_requests_course ON scheduling_requests(course_id);
CREATE INDEX idx_scheduling_requests_created ON scheduling_requests(created_at);
CREATE INDEX idx_scheduling_results_request ON scheduling_results(request_id);
CREATE INDEX idx_scheduling_results_success ON scheduling_results(success);

-- Scheduled classes indexes
CREATE INDEX idx_scheduled_classes_course ON scheduled_classes(course_id);
CREATE INDEX idx_scheduled_classes_teacher ON scheduled_classes(teacher_id);
CREATE INDEX idx_scheduled_classes_date_time ON scheduled_classes(scheduled_date, start_time);
CREATE INDEX idx_scheduled_classes_status ON scheduled_classes(status);
CREATE INDEX idx_class_enrollments_class ON class_enrollments(scheduled_class_id);
CREATE INDEX idx_class_enrollments_student ON class_enrollments(student_id);
CREATE INDEX idx_class_enrollments_status ON class_enrollments(enrollment_status);

-- Conflict indexes
CREATE INDEX idx_scheduling_conflicts_type ON scheduling_conflicts(conflict_type);
CREATE INDEX idx_scheduling_conflicts_severity ON scheduling_conflicts(severity);
CREATE INDEX idx_scheduling_conflicts_status ON scheduling_conflicts(resolution_status);
CREATE INDEX idx_scheduling_conflicts_detected ON scheduling_conflicts(detected_at);
CREATE INDEX idx_conflict_resolutions_conflict ON conflict_resolutions(conflict_id);
CREATE INDEX idx_conflict_resolutions_status ON conflict_resolutions(status);

-- Sync and update indexes
CREATE INDEX idx_content_sync_jobs_status ON content_sync_jobs(status);
CREATE INDEX idx_content_sync_jobs_type ON content_sync_jobs(sync_type);
CREATE INDEX idx_daily_update_jobs_date_type ON daily_update_jobs(update_date, job_type);
CREATE INDEX idx_daily_update_jobs_status ON daily_update_jobs(status);
CREATE INDEX idx_scheduling_analytics_date_type ON scheduling_analytics(snapshot_date, snapshot_type);

-- Event indexes
CREATE INDEX idx_scheduling_events_type ON scheduling_events(event_type);
CREATE INDEX idx_scheduling_events_source ON scheduling_events(event_source);
CREATE INDEX idx_scheduling_events_timestamp ON scheduling_events(timestamp);
CREATE INDEX idx_scheduling_events_entity ON scheduling_events(entity_type, entity_id);
CREATE INDEX idx_scheduling_events_severity ON scheduling_events(severity);

-- =====================================================================================
-- TRIGGERS AND FUNCTIONS
-- =====================================================================================

-- Function to update student progress based on content completion
CREATE OR REPLACE FUNCTION update_student_progress_on_content_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Update overall progress when content is completed
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE student_progress 
        SET 
            progress_percentage = (
                SELECT COALESCE(
                    (COUNT(*) FILTER (WHERE scp.status = 'completed')::DECIMAL / 
                     NULLIF(COUNT(*)::DECIMAL, 0)) * 100, 
                    0
                )
                FROM student_content_progress scp
                JOIN learning_content lc ON scp.content_id = lc.id
                WHERE scp.student_id = NEW.student_id 
                AND lc.course_id = (
                    SELECT course_id 
                    FROM learning_content 
                    WHERE id = NEW.content_id
                )
            ),
            last_activity = NOW(),
            updated_at = NOW()
        WHERE student_id = NEW.student_id 
        AND course_id = (
            SELECT course_id 
            FROM learning_content 
            WHERE id = NEW.content_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update progress on content completion
CREATE TRIGGER trigger_update_student_progress
    AFTER UPDATE ON student_content_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_student_progress_on_content_completion();

-- Function to automatically update class enrollment count
CREATE OR REPLACE FUNCTION update_class_enrollment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE scheduled_classes 
        SET current_enrollment = current_enrollment + 1,
            updated_at = NOW()
        WHERE id = NEW.scheduled_class_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE scheduled_classes 
        SET current_enrollment = current_enrollment - 1,
            updated_at = NOW()
        WHERE id = OLD.scheduled_class_id;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle status changes that affect enrollment count
        IF NEW.enrollment_status IN ('enrolled', 'confirmed', 'attended') 
           AND OLD.enrollment_status NOT IN ('enrolled', 'confirmed', 'attended') THEN
            UPDATE scheduled_classes 
            SET current_enrollment = current_enrollment + 1,
                updated_at = NOW()
            WHERE id = NEW.scheduled_class_id;
        ELSIF OLD.enrollment_status IN ('enrolled', 'confirmed', 'attended') 
              AND NEW.enrollment_status NOT IN ('enrolled', 'confirmed', 'attended') THEN
            UPDATE scheduled_classes 
            SET current_enrollment = current_enrollment - 1,
                updated_at = NOW()
            WHERE id = NEW.scheduled_class_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update enrollment count
CREATE TRIGGER trigger_update_enrollment_count
    AFTER INSERT OR UPDATE OR DELETE ON class_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION update_class_enrollment_count();

-- Function to log scheduling events
CREATE OR REPLACE FUNCTION log_scheduling_event(
    p_event_type VARCHAR(100),
    p_event_source VARCHAR(50),
    p_entity_type VARCHAR(50) DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_event_data JSONB DEFAULT '{}',
    p_severity VARCHAR(20) DEFAULT 'info',
    p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    event_id UUID;
BEGIN
    INSERT INTO scheduling_events (
        event_type,
        event_source,
        entity_type,
        entity_id,
        event_data,
        severity,
        user_id
    ) VALUES (
        p_event_type,
        p_event_source,
        p_entity_type,
        p_entity_id,
        p_event_data,
        p_severity,
        p_user_id
    ) RETURNING id INTO event_id;
    
    RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================================================

-- View for current student progress with content details
CREATE VIEW student_progress_detailed AS
SELECT 
    sp.student_id,
    sp.course_id,
    s.full_name AS student_name,
    c.title AS course_title,
    sp.progress_percentage,
    sp.current_unit,
    sp.current_lesson,
    sp.learning_pace,
    sp.last_activity,
    sp.study_streak,
    COUNT(scp.id) FILTER (WHERE scp.status = 'completed') AS completed_content_count,
    COUNT(scp.id) FILTER (WHERE scp.status = 'in_progress') AS in_progress_content_count,
    COUNT(lc.id) - COUNT(scp.id) FILTER (WHERE scp.status IN ('completed', 'in_progress')) AS unlearned_content_count
FROM student_progress sp
JOIN students s ON sp.student_id = s.id
JOIN courses c ON sp.course_id = c.id
LEFT JOIN learning_content lc ON lc.course_id = sp.course_id
LEFT JOIN student_content_progress scp ON scp.student_id = sp.student_id AND scp.content_id = lc.id
GROUP BY sp.student_id, sp.course_id, s.full_name, c.title, sp.progress_percentage, 
         sp.current_unit, sp.current_lesson, sp.learning_pace, sp.last_activity, sp.study_streak;

-- View for scheduled classes with enrollment details
CREATE VIEW scheduled_classes_detailed AS
SELECT 
    sc.id,
    sc.course_id,
    c.title AS course_title,
    sc.teacher_id,
    COALESCE(t.full_name, 'Unassigned') AS teacher_name,
    sc.class_type,
    sc.scheduled_date,
    sc.start_time,
    sc.end_time,
    sc.duration_minutes,
    sc.max_capacity,
    sc.current_enrollment,
    sc.location,
    sc.status,
    sc.confidence_score,
    ARRAY_AGG(DISTINCT s.full_name ORDER BY s.full_name) FILTER (WHERE ce.enrollment_status IN ('enrolled', 'confirmed')) AS enrolled_students,
    ARRAY_AGG(DISTINCT lc.title ORDER BY lc.unit_number, lc.lesson_number) FILTER (WHERE lc.id = ANY(sc.content_to_cover)) AS content_titles
FROM scheduled_classes sc
JOIN courses c ON sc.course_id = c.id
LEFT JOIN teachers t ON sc.teacher_id = t.id
LEFT JOIN class_enrollments ce ON sc.id = ce.scheduled_class_id
LEFT JOIN students s ON ce.student_id = s.id
LEFT JOIN learning_content lc ON lc.id = ANY(sc.content_to_cover)
GROUP BY sc.id, c.title, t.full_name, sc.course_id, sc.teacher_id, sc.class_type, 
         sc.scheduled_date, sc.start_time, sc.end_time, sc.duration_minutes, 
         sc.max_capacity, sc.current_enrollment, sc.location, sc.status, sc.confidence_score;

-- View for conflict summary
CREATE VIEW scheduling_conflicts_summary AS
SELECT 
    DATE(detected_at) AS conflict_date,
    conflict_type,
    severity,
    COUNT(*) AS conflict_count,
    COUNT(*) FILTER (WHERE resolution_status = 'resolved') AS resolved_count,
    COUNT(*) FILTER (WHERE resolution_status = 'pending') AS pending_count,
    AVG(EXTRACT(EPOCH FROM (resolved_at - detected_at))/60) FILTER (WHERE resolved_at IS NOT NULL) AS avg_resolution_time_minutes
FROM scheduling_conflicts
GROUP BY DATE(detected_at), conflict_type, severity
ORDER BY conflict_date DESC, severity DESC;

-- =====================================================================================
-- INITIAL DATA SETUP
-- =====================================================================================

-- Insert default learning skills
INSERT INTO learning_skills (name, category, description, weight) VALUES
('Conversational Speaking', 'speaking', 'Ability to engage in everyday conversations', 1.0),
('Presentation Skills', 'speaking', 'Ability to present ideas clearly and confidently', 0.8),
('Active Listening', 'listening', 'Ability to understand spoken English in various contexts', 1.0),
('Academic Listening', 'listening', 'Ability to understand lectures and academic content', 0.7),
('Reading Comprehension', 'reading', 'Ability to understand written texts', 0.9),
('Speed Reading', 'reading', 'Ability to read quickly while maintaining comprehension', 0.6),
('Essay Writing', 'writing', 'Ability to write structured essays and reports', 0.8),
('Creative Writing', 'writing', 'Ability to write creative and expressive texts', 0.5),
('Grammar Accuracy', 'grammar', 'Correct use of English grammar structures', 0.9),
('Advanced Grammar', 'grammar', 'Understanding of complex grammatical concepts', 0.7),
('Vocabulary Building', 'vocabulary', 'Expanding and using varied vocabulary', 0.8),
('Academic Vocabulary', 'vocabulary', 'Understanding academic and professional terms', 0.6),
('Pronunciation Clarity', 'pronunciation', 'Clear and understandable pronunciation', 0.7),
('Accent Training', 'pronunciation', 'Developing native-like pronunciation patterns', 0.5);

-- Insert default scheduling configuration
INSERT INTO scheduling_config (version, is_active, config_data, created_by) VALUES
('1.0.0', TRUE, '{
    "version": "1.0.0",
    "maxProcessingTime": 30000,
    "enableConflictResolution": true,
    "enableContentSync": true,
    "enablePerformanceOptimization": true,
    "maxOptimizationIterations": 5,
    "scoringWeights": {
        "contentProgression": 0.3,
        "studentAvailability": 0.25,
        "teacherAvailability": 0.2,
        "classSizeOptimization": 0.1,
        "learningPaceMatching": 0.05,
        "skillLevelAlignment": 0.05,
        "scheduleContinuity": 0.03,
        "resourceUtilization": 0.02
    },
    "constraints": {
        "maxStudentsPerClass": 9,
        "minStudentsForGroupClass": 2,
        "maxConcurrentClassesPerTeacher": 3,
        "maxClassesPerDayPerStudent": 2,
        "minBreakBetweenClasses": 15,
        "maxAdvanceBookingDays": 30,
        "minAdvanceBookingHours": 24,
        "workingHours": {
            "start": "09:00",
            "end": "18:00"
        },
        "availableDays": [1, 2, 3, 4, 5],
        "blockedDates": []
    }
}', (SELECT id FROM users WHERE role = 'admin' LIMIT 1));

-- =====================================================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================================================

COMMENT ON TABLE learning_content IS 'Stores curriculum content units with learning objectives and prerequisites';
COMMENT ON TABLE student_progress IS 'Tracks overall student progress through courses';
COMMENT ON TABLE student_content_progress IS 'Tracks detailed progress through individual content items';
COMMENT ON TABLE student_performance_metrics IS 'Stores calculated performance metrics for scheduling optimization';
COMMENT ON TABLE scheduled_classes IS 'Enhanced class scheduling with AI-driven optimization data';
COMMENT ON TABLE scheduling_conflicts IS 'Tracks detected scheduling conflicts and their resolution status';
COMMENT ON TABLE content_sync_jobs IS 'Manages content synchronization across class groups';
COMMENT ON TABLE daily_update_jobs IS 'Tracks daily data update and maintenance jobs';
COMMENT ON TABLE scheduling_events IS 'Comprehensive event log for scheduling system monitoring';

-- =====================================================================================
-- END OF SCHEMA
-- =====================================================================================