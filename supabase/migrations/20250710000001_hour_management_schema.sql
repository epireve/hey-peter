-- Hour Management and Leave Request Enhancement Schema
-- This migration adds comprehensive hour tracking and leave management capabilities

-- Enhanced hour tracking table
CREATE TABLE IF NOT EXISTS hour_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('purchase', 'deduction', 'refund', 'bonus', 'adjustment', 'makeup')),
    amount DECIMAL(4,2) NOT NULL,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    description TEXT,
    reason VARCHAR(255),
    balance_before DECIMAL(4,2) NOT NULL,
    balance_after DECIMAL(4,2) NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hour purchase records
CREATE TABLE IF NOT EXISTS hour_purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    package_name VARCHAR(255) NOT NULL,
    hours_purchased INTEGER NOT NULL CHECK (hours_purchased > 0),
    price_per_hour DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50) CHECK (payment_method IN ('credit_card', 'bank_transfer', 'cash', 'voucher', 'other')),
    payment_reference VARCHAR(255),
    expiration_date DATE,
    purchase_date DATE DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hour policies table
CREATE TABLE IF NOT EXISTS hour_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_type VARCHAR(50) NOT NULL CHECK (course_type IN ('Basic', 'Everyday A', 'Everyday B', 'Speak Up', 'Business English', '1-on-1')),
    deduction_rate DECIMAL(4,2) NOT NULL DEFAULT 1.0,
    makeup_allowed BOOLEAN DEFAULT TRUE,
    makeup_deadline_days INTEGER DEFAULT 7,
    late_cancellation_penalty DECIMAL(4,2) DEFAULT 0.5,
    no_show_penalty DECIMAL(4,2) DEFAULT 1.0,
    minimum_advance_notice_hours INTEGER DEFAULT 24,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(course_type)
);

-- Enhanced leave requests table (extend existing)
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS leave_type VARCHAR(50) DEFAULT 'personal' CHECK (leave_type IN ('personal', 'medical', 'emergency', 'vacation', 'other'));
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS hours_recovered DECIMAL(4,2) DEFAULT 0;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS makeup_scheduled BOOLEAN DEFAULT FALSE;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS makeup_deadline DATE;
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

-- Teacher hour tracking table
CREATE TABLE IF NOT EXISTS teacher_hours (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    teaching_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL,
    hours_taught DECIMAL(4,2) NOT NULL,
    hourly_rate DECIMAL(10,2) NOT NULL,
    base_compensation DECIMAL(10,2) NOT NULL,
    bonus_amount DECIMAL(10,2) DEFAULT 0,
    total_compensation DECIMAL(10,2) NOT NULL,
    compensation_type VARCHAR(50) DEFAULT 'standard' CHECK (compensation_type IN ('standard', 'overtime', 'holiday', 'substitute', 'bonus')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'disputed')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teacher compensation rules
CREATE TABLE IF NOT EXISTS teacher_compensation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    course_type VARCHAR(50) NOT NULL CHECK (course_type IN ('Basic', 'Everyday A', 'Everyday B', 'Speak Up', 'Business English', '1-on-1')),
    base_rate DECIMAL(10,2) NOT NULL,
    overtime_rate DECIMAL(10,2),
    holiday_rate DECIMAL(10,2),
    substitute_rate DECIMAL(10,2),
    bonus_thresholds JSONB DEFAULT '{}',
    effective_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hour expiration tracking
CREATE TABLE IF NOT EXISTS hour_expirations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    purchase_id UUID REFERENCES hour_purchases(id) ON DELETE SET NULL,
    hours_expiring DECIMAL(4,2) NOT NULL,
    expiration_date DATE NOT NULL,
    warning_sent BOOLEAN DEFAULT FALSE,
    warning_sent_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'warned', 'expired', 'extended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Default hour policies
INSERT INTO hour_policies (course_type, deduction_rate, makeup_allowed, makeup_deadline_days, late_cancellation_penalty, no_show_penalty, minimum_advance_notice_hours) 
VALUES 
    ('Basic', 1.0, TRUE, 7, 0.5, 1.0, 24),
    ('Everyday A', 1.0, TRUE, 7, 0.5, 1.0, 24),
    ('Everyday B', 1.0, TRUE, 7, 0.5, 1.0, 24),
    ('Speak Up', 1.0, TRUE, 7, 0.5, 1.0, 24),
    ('Business English', 1.0, TRUE, 7, 0.5, 1.0, 24),
    ('1-on-1', 1.0, TRUE, 3, 0.5, 1.0, 12)
ON CONFLICT (course_type) DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_hour_transactions_student_id ON hour_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_hour_transactions_type ON hour_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_hour_transactions_created_at ON hour_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_hour_transactions_booking_id ON hour_transactions(booking_id);

CREATE INDEX IF NOT EXISTS idx_hour_purchases_student_id ON hour_purchases(student_id);
CREATE INDEX IF NOT EXISTS idx_hour_purchases_purchase_date ON hour_purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_hour_purchases_expiration_date ON hour_purchases(expiration_date);

CREATE INDEX IF NOT EXISTS idx_leave_requests_type ON leave_requests(leave_type);
CREATE INDEX IF NOT EXISTS idx_leave_requests_approved_by ON leave_requests(approved_by);
CREATE INDEX IF NOT EXISTS idx_leave_requests_approved_at ON leave_requests(approved_at);

CREATE INDEX IF NOT EXISTS idx_teacher_hours_teacher_id ON teacher_hours(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_hours_teaching_date ON teacher_hours(teaching_date);
CREATE INDEX IF NOT EXISTS idx_teacher_hours_status ON teacher_hours(status);
CREATE INDEX IF NOT EXISTS idx_teacher_hours_booking_id ON teacher_hours(booking_id);

CREATE INDEX IF NOT EXISTS idx_teacher_compensation_rules_teacher_id ON teacher_compensation_rules(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_compensation_rules_active ON teacher_compensation_rules(is_active) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_hour_expirations_student_id ON hour_expirations(student_id);
CREATE INDEX IF NOT EXISTS idx_hour_expirations_expiration_date ON hour_expirations(expiration_date);
CREATE INDEX IF NOT EXISTS idx_hour_expirations_status ON hour_expirations(status);

-- Functions for hour management

-- Function to calculate student hour balance
CREATE OR REPLACE FUNCTION calculate_student_hour_balance(student_uuid UUID)
RETURNS DECIMAL(4,2) AS $$
DECLARE
    balance DECIMAL(4,2);
BEGIN
    SELECT COALESCE(SUM(
        CASE 
            WHEN transaction_type IN ('purchase', 'refund', 'bonus', 'makeup') THEN amount
            WHEN transaction_type IN ('deduction', 'adjustment') THEN -amount
            ELSE 0
        END
    ), 0) INTO balance
    FROM hour_transactions
    WHERE student_id = student_uuid;
    
    RETURN balance;
END;
$$ LANGUAGE plpgsql;

-- Function to deduct hours from student balance
CREATE OR REPLACE FUNCTION deduct_student_hours(
    student_uuid UUID,
    hours_to_deduct DECIMAL(4,2),
    booking_uuid UUID DEFAULT NULL,
    class_uuid UUID DEFAULT NULL,
    teacher_uuid UUID DEFAULT NULL,
    deduction_reason TEXT DEFAULT 'Class attendance',
    created_by_uuid UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_balance DECIMAL(4,2);
    new_balance DECIMAL(4,2);
BEGIN
    -- Get current balance
    current_balance := calculate_student_hour_balance(student_uuid);
    
    -- Check if sufficient balance
    IF current_balance < hours_to_deduct THEN
        RETURN FALSE;
    END IF;
    
    -- Calculate new balance
    new_balance := current_balance - hours_to_deduct;
    
    -- Insert transaction record
    INSERT INTO hour_transactions (
        student_id, transaction_type, amount, booking_id, class_id, teacher_id,
        description, balance_before, balance_after, created_by
    ) VALUES (
        student_uuid, 'deduction', hours_to_deduct, booking_uuid, class_uuid, teacher_uuid,
        deduction_reason, current_balance, new_balance, created_by_uuid
    );
    
    -- Update student balance
    UPDATE students SET 
        hour_balance = new_balance,
        hours_used = hours_used + hours_to_deduct::INTEGER
    WHERE id = student_uuid;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to add hours to student balance
CREATE OR REPLACE FUNCTION add_student_hours(
    student_uuid UUID,
    hours_to_add DECIMAL(4,2),
    transaction_type VARCHAR(50) DEFAULT 'purchase',
    description_text TEXT DEFAULT 'Hour purchase',
    created_by_uuid UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_balance DECIMAL(4,2);
    new_balance DECIMAL(4,2);
BEGIN
    -- Get current balance
    current_balance := calculate_student_hour_balance(student_uuid);
    
    -- Calculate new balance
    new_balance := current_balance + hours_to_add;
    
    -- Insert transaction record
    INSERT INTO hour_transactions (
        student_id, transaction_type, amount, description, 
        balance_before, balance_after, created_by
    ) VALUES (
        student_uuid, transaction_type, hours_to_add, description_text,
        current_balance, new_balance, created_by_uuid
    );
    
    -- Update student balance
    UPDATE students SET 
        hour_balance = new_balance,
        total_hours_purchased = total_hours_purchased + hours_to_add::INTEGER
    WHERE id = student_uuid;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get hour deduction rate for course type
CREATE OR REPLACE FUNCTION get_hour_deduction_rate(course_type_param VARCHAR(50))
RETURNS DECIMAL(4,2) AS $$
DECLARE
    deduction_rate DECIMAL(4,2);
BEGIN
    SELECT hp.deduction_rate INTO deduction_rate
    FROM hour_policies hp
    WHERE hp.course_type = course_type_param;
    
    RETURN COALESCE(deduction_rate, 1.0);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate teacher compensation
CREATE OR REPLACE FUNCTION calculate_teacher_compensation(
    teacher_uuid UUID,
    course_type_param VARCHAR(50),
    hours_taught DECIMAL(4,2),
    teaching_date DATE DEFAULT CURRENT_DATE,
    compensation_type_param VARCHAR(50) DEFAULT 'standard'
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    base_rate DECIMAL(10,2);
    rate_multiplier DECIMAL(4,2) := 1.0;
    total_compensation DECIMAL(10,2);
BEGIN
    -- Get base rate for teacher and course type
    SELECT tcr.base_rate INTO base_rate
    FROM teacher_compensation_rules tcr
    WHERE tcr.teacher_id = teacher_uuid 
      AND tcr.course_type = course_type_param
      AND tcr.is_active = TRUE
      AND (tcr.end_date IS NULL OR tcr.end_date >= teaching_date)
    ORDER BY tcr.effective_date DESC
    LIMIT 1;
    
    -- If no specific rate found, use teacher's default hourly rate
    IF base_rate IS NULL THEN
        SELECT t.hourly_rate INTO base_rate
        FROM teachers t
        WHERE t.id = teacher_uuid;
    END IF;
    
    -- Apply rate multiplier based on compensation type
    CASE compensation_type_param
        WHEN 'overtime' THEN rate_multiplier := 1.5;
        WHEN 'holiday' THEN rate_multiplier := 2.0;
        WHEN 'substitute' THEN rate_multiplier := 1.2;
        ELSE rate_multiplier := 1.0;
    END CASE;
    
    -- Calculate total compensation
    total_compensation := COALESCE(base_rate, 0) * rate_multiplier * hours_taught;
    
    RETURN total_compensation;
END;
$$ LANGUAGE plpgsql;

-- Function to process leave request approval
CREATE OR REPLACE FUNCTION process_leave_request(
    leave_request_uuid UUID,
    approved_status VARCHAR(20),
    approver_uuid UUID,
    admin_notes_text TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    request_record RECORD;
    hours_to_recover DECIMAL(4,2) := 0;
BEGIN
    -- Get leave request details
    SELECT * INTO request_record
    FROM leave_requests
    WHERE id = leave_request_uuid;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Update leave request status
    IF approved_status = 'approved' THEN
        UPDATE leave_requests SET
            status = 'approved',
            approved_by = approver_uuid,
            approved_at = NOW(),
            admin_notes = admin_notes_text
        WHERE id = leave_request_uuid;
        
        -- If hours were affected, add them back to student balance
        IF request_record.hours_affected > 0 THEN
            PERFORM add_student_hours(
                request_record.student_id,
                request_record.hours_affected,
                'refund',
                'Leave request approved - hours refunded',
                approver_uuid
            );
            
            -- Update leave request with recovered hours
            UPDATE leave_requests SET
                hours_recovered = request_record.hours_affected
            WHERE id = leave_request_uuid;
        END IF;
        
    ELSIF approved_status = 'rejected' THEN
        UPDATE leave_requests SET
            status = 'rejected',
            rejected_by = approver_uuid,
            rejected_at = NOW(),
            admin_notes = admin_notes_text
        WHERE id = leave_request_uuid;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic hour calculations
CREATE OR REPLACE FUNCTION trigger_automatic_hour_deduction()
RETURNS TRIGGER AS $$
DECLARE
    course_type_val VARCHAR(50);
    deduction_rate DECIMAL(4,2);
    hours_to_deduct DECIMAL(4,2);
    student_uuid UUID;
    teacher_uuid UUID;
BEGIN
    -- Only process when booking status changes to 'completed'
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Get course type from class
        SELECT c.course_type, NEW.student_id, NEW.teacher_id 
        INTO course_type_val, student_uuid, teacher_uuid
        FROM classes cl
        JOIN courses c ON cl.course_id = c.id
        WHERE cl.id = NEW.class_id;
        
        -- Get deduction rate for this course type
        deduction_rate := get_hour_deduction_rate(course_type_val);
        
        -- Calculate hours to deduct based on duration
        hours_to_deduct := (NEW.duration_minutes / 60.0) * deduction_rate;
        
        -- Deduct hours from student balance
        PERFORM deduct_student_hours(
            student_uuid,
            hours_to_deduct,
            NEW.id,
            NEW.class_id,
            teacher_uuid,
            'Automatic deduction for completed class',
            NULL
        );
        
        -- Record teacher hours
        INSERT INTO teacher_hours (
            teacher_id, booking_id, class_id, teaching_date,
            start_time, end_time, duration_minutes, hours_taught,
            hourly_rate, base_compensation, total_compensation
        ) VALUES (
            teacher_uuid, NEW.id, NEW.class_id, NEW.scheduled_at::DATE,
            NEW.scheduled_at::TIME, (NEW.scheduled_at + INTERVAL '1 minute' * NEW.duration_minutes)::TIME,
            NEW.duration_minutes, hours_to_deduct,
            COALESCE((SELECT hourly_rate FROM teachers WHERE id = teacher_uuid), 0),
            calculate_teacher_compensation(teacher_uuid, course_type_val, hours_to_deduct),
            calculate_teacher_compensation(teacher_uuid, course_type_val, hours_to_deduct)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_booking_hour_deduction
    AFTER UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION trigger_automatic_hour_deduction();

-- Update triggers
CREATE TRIGGER update_hour_transactions_updated_at
    BEFORE UPDATE ON hour_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hour_purchases_updated_at
    BEFORE UPDATE ON hour_purchases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hour_policies_updated_at
    BEFORE UPDATE ON hour_policies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teacher_hours_updated_at
    BEFORE UPDATE ON teacher_hours
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teacher_compensation_rules_updated_at
    BEFORE UPDATE ON teacher_compensation_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hour_expirations_updated_at
    BEFORE UPDATE ON hour_expirations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();