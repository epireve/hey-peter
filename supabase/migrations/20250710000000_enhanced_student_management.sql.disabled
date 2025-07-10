-- Enhanced Student Management Schema
-- This migration enhances the existing schema to fully support the StudentInformationManager features

-- Add enhanced fields to the students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS nationality VARCHAR(100);
ALTER TABLE students ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE students ADD COLUMN IF NOT EXISTS profile_data JSONB DEFAULT '{}';

-- Enhanced emergency contact and proficiency tracking
ALTER TABLE students ADD COLUMN IF NOT EXISTS emergency_contact JSONB DEFAULT '{}';
ALTER TABLE students ADD COLUMN IF NOT EXISTS proficiency_data JSONB DEFAULT '{}';
ALTER TABLE students ADD COLUMN IF NOT EXISTS coach VARCHAR(255);
ALTER TABLE students ADD COLUMN IF NOT EXISTS expected_graduation_date DATE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Graduated', 'Withdrawn', 'On Hold'));
ALTER TABLE students ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100);
ALTER TABLE students ADD COLUMN IF NOT EXISTS attendance_rate DECIMAL(5,2) DEFAULT 100.00;
ALTER TABLE students ADD COLUMN IF NOT EXISTS last_activity_date TIMESTAMP WITH TIME ZONE;

-- Enhanced payment tracking
ALTER TABLE students ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'Pending' CHECK (payment_status IN ('Paid', 'Pending', 'Overdue', 'Installment'));
ALTER TABLE students ADD COLUMN IF NOT EXISTS total_amount_paid DECIMAL(10,2) DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS outstanding_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS payment_plan VARCHAR(255);

-- Enhanced referral tracking
ALTER TABLE students ADD COLUMN IF NOT EXISTS referrer_name VARCHAR(255);
ALTER TABLE students ADD COLUMN IF NOT EXISTS referrer_type VARCHAR(50) CHECK (referrer_type IN ('Student', 'Teacher', 'Partner', 'Other'));

-- Enhanced hours tracking
ALTER TABLE students ADD COLUMN IF NOT EXISTS total_hours_purchased INTEGER DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS hours_used INTEGER DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS hour_balance INTEGER DEFAULT 0;

-- Create student ID generation function
CREATE OR REPLACE FUNCTION generate_student_id()
RETURNS TEXT AS $$
DECLARE
    next_id INTEGER;
    student_id TEXT;
BEGIN
    -- Get the next student number
    SELECT COALESCE(MAX(CAST(SUBSTRING(student_id FROM 4) AS INTEGER)), 0) + 1
    INTO next_id
    FROM students
    WHERE student_id LIKE 'HPA%';
    
    -- Format as HPA001, HPA002, etc.
    student_id := 'HPA' || LPAD(next_id::TEXT, 3, '0');
    
    RETURN student_id;
END;
$$ LANGUAGE plpgsql;

-- Create internal code generation function
CREATE OR REPLACE FUNCTION generate_internal_code(coach_code TEXT)
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
    internal_code TEXT;
BEGIN
    -- Get the next student number for this coach
    SELECT COALESCE(MAX(CAST(SUBSTRING(internal_code FROM LENGTH(coach_code) + 2) AS INTEGER)), 0) + 1
    INTO next_num
    FROM students
    WHERE internal_code LIKE coach_code || '-%';
    
    -- Format as SC001-001, SC001-002, etc.
    internal_code := coach_code || '-' || LPAD(next_num::TEXT, 3, '0');
    
    RETURN internal_code;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate student_id
CREATE OR REPLACE FUNCTION auto_generate_student_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.student_id IS NULL OR NEW.student_id = '' THEN
        NEW.student_id := generate_student_id();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_generate_student_id
    BEFORE INSERT ON students
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_student_id();

-- Enhanced material issuance tracking
CREATE TABLE IF NOT EXISTS student_material_issuance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    material_name VARCHAR(255) NOT NULL,
    material_type VARCHAR(50) CHECK (material_type IN ('Book', 'Workbook', 'Audio CD', 'Online Access', 'Certificate', 'Other')),
    issued_date DATE NOT NULL,
    return_date DATE,
    condition VARCHAR(20) DEFAULT 'New' CHECK (condition IN ('New', 'Good', 'Fair', 'Damaged', 'Lost')),
    cost DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced proficiency assessment tracking
CREATE TABLE IF NOT EXISTS proficiency_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    assessment_type VARCHAR(50) DEFAULT 'Manual' CHECK (assessment_type IN ('Manual', 'AI-based')),
    proficiency_level VARCHAR(50) CHECK (proficiency_level IN ('Beginner', 'Elementary', 'Intermediate', 'Upper-Intermediate', 'Advanced', 'Proficient')),
    score INTEGER CHECK (score >= 0 AND score <= 100),
    assessment_date DATE NOT NULL,
    assessor VARCHAR(255), -- Teacher or system name
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);
CREATE INDEX IF NOT EXISTS idx_students_internal_code ON students(internal_code);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_test_level ON students(test_level);
CREATE INDEX IF NOT EXISTS idx_students_lead_source ON students(lead_source);
CREATE INDEX IF NOT EXISTS idx_students_payment_status ON students(payment_status);
CREATE INDEX IF NOT EXISTS idx_students_coach ON students(coach);
CREATE INDEX IF NOT EXISTS idx_students_created_at ON students(created_at);
CREATE INDEX IF NOT EXISTS idx_student_material_issuance_student_id ON student_material_issuance(student_id);
CREATE INDEX IF NOT EXISTS idx_proficiency_assessments_student_id ON proficiency_assessments(student_id);
CREATE INDEX IF NOT EXISTS idx_proficiency_assessments_active ON proficiency_assessments(is_active) WHERE is_active = true;

-- Create a view for comprehensive student information
CREATE OR REPLACE VIEW student_comprehensive_view AS
SELECT 
    s.*,
    u.email as user_email,
    u.full_name as user_full_name,
    u.role as user_role,
    COALESCE(
        (SELECT json_agg(json_build_object(
            'id', smi.id,
            'material_name', smi.material_name,
            'material_type', smi.material_type,
            'issued_date', smi.issued_date,
            'return_date', smi.return_date,
            'condition', smi.condition,
            'cost', smi.cost
        )) FROM student_material_issuance smi WHERE smi.student_id = s.id),
        '[]'::json
    ) as materials_issued,
    COALESCE(
        (SELECT json_build_object(
            'level', pa.proficiency_level,
            'score', pa.score,
            'assessment_date', pa.assessment_date,
            'assessment_type', pa.assessment_type
        ) FROM proficiency_assessments pa 
         WHERE pa.student_id = s.id AND pa.is_active = true 
         ORDER BY pa.assessment_date DESC LIMIT 1),
        '{}'::json
    ) as current_proficiency
FROM students s
LEFT JOIN users u ON s.user_id = u.id;

-- Function to get student statistics
CREATE OR REPLACE FUNCTION get_student_statistics()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_students', (SELECT COUNT(*) FROM students),
        'active_students', (SELECT COUNT(*) FROM students WHERE status = 'Active'),
        'graduated_students', (SELECT COUNT(*) FROM students WHERE status = 'Graduated'),
        'total_revenue', (SELECT COALESCE(SUM(total_amount_paid), 0) FROM students),
        'outstanding_amount', (SELECT COALESCE(SUM(outstanding_amount), 0) FROM students),
        'by_course_type', (
            SELECT json_object_agg(test_level, count)
            FROM (
                SELECT test_level, COUNT(*) as count
                FROM students
                WHERE test_level IS NOT NULL
                GROUP BY test_level
            ) course_counts
        ),
        'by_status', (
            SELECT json_object_agg(status, count)
            FROM (
                SELECT status, COUNT(*) as count
                FROM students
                GROUP BY status
            ) status_counts
        ),
        'by_payment_status', (
            SELECT json_object_agg(payment_status, count)
            FROM (
                SELECT payment_status, COUNT(*) as count
                FROM students
                GROUP BY payment_status
            ) payment_counts
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to search students with filters
CREATE OR REPLACE FUNCTION search_students(
    search_term TEXT DEFAULT '',
    status_filter TEXT DEFAULT '',
    course_type_filter TEXT DEFAULT '',
    limit_count INTEGER DEFAULT 50,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    student_id VARCHAR,
    internal_code VARCHAR,
    full_name VARCHAR,
    email VARCHAR,
    test_level VARCHAR,
    status VARCHAR,
    progress_percentage INTEGER,
    payment_status VARCHAR,
    coach VARCHAR,
    total_amount_paid DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.student_id,
        s.internal_code,
        u.full_name,
        u.email,
        s.test_level,
        s.status,
        s.progress_percentage,
        s.payment_status,
        s.coach,
        s.total_amount_paid,
        s.created_at
    FROM students s
    LEFT JOIN users u ON s.user_id = u.id
    WHERE 
        (search_term = '' OR 
         u.full_name ILIKE '%' || search_term || '%' OR
         u.email ILIKE '%' || search_term || '%' OR
         s.student_id ILIKE '%' || search_term || '%' OR
         s.internal_code ILIKE '%' || search_term || '%')
        AND (status_filter = '' OR s.status = status_filter)
        AND (course_type_filter = '' OR s.test_level = course_type_filter)
    ORDER BY s.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_material_issuance_updated_at
    BEFORE UPDATE ON student_material_issuance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_proficiency_assessments_updated_at
    BEFORE UPDATE ON proficiency_assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();