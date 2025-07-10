-- ===================================================================================
-- Leave Rules Configuration System
-- ===================================================================================

-- Create leave rules table
CREATE TABLE IF NOT EXISTS leave_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN (
    'monthly_limit', 'blackout_dates', 'advance_notice', 'consecutive_days', 
    'minimum_hours', 'approval_required', 'cancellation_policy'
  )),
  
  -- Rule parameters
  value JSONB NOT NULL, -- Can store number, string, boolean, or complex objects
  frequency VARCHAR(50) CHECK (frequency IN (
    'daily', 'weekly', 'monthly', 'quarterly', 'annually', 'per_course'
  )),
  
  -- Scope and applicability
  applies_to_course_types TEXT[] DEFAULT '{}',
  applies_to_student_types TEXT[] DEFAULT '{}',
  applies_to_regions TEXT[] DEFAULT '{}',
  
  -- Date-based rules
  blackout_dates JSONB DEFAULT '[]'::jsonb,
  
  -- Conditional rules
  conditions JSONB DEFAULT '[]'::jsonb,
  
  -- Exceptions
  exceptions JSONB DEFAULT '[]'::jsonb,
  
  -- Status and visibility
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create leave requests table
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id),
  
  -- Leave details
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  leave_type VARCHAR(50) NOT NULL CHECK (leave_type IN (
    'medical', 'vacation', 'emergency', 'other'
  )),
  
  -- Affected classes
  affected_classes JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Approval workflow
  approval_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (approval_status IN (
    'pending', 'approved', 'rejected'
  )),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  approval_notes TEXT,
  
  -- Rule validation
  rule_validation_results JSONB DEFAULT '[]'::jsonb,
  
  -- Supporting documents
  supporting_documents JSONB DEFAULT '[]'::jsonb,
  
  -- Hour processing
  total_hours_requested DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_hours_approved DECIMAL(10,2),
  hours_processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES auth.users(id),
  
  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Constraints
  CONSTRAINT valid_date_range CHECK (end_date >= start_date),
  CONSTRAINT valid_hours CHECK (total_hours_requested >= 0),
  CONSTRAINT valid_approved_hours CHECK (total_hours_approved IS NULL OR total_hours_approved >= 0)
);

-- Create leave rule violations table for tracking
CREATE TABLE IF NOT EXISTS leave_rule_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_request_id UUID NOT NULL REFERENCES leave_requests(id),
  rule_id UUID NOT NULL REFERENCES leave_rules(id),
  
  -- Violation details
  violation_type VARCHAR(50) NOT NULL, -- 'error', 'warning'
  message TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'error' CHECK (severity IN ('error', 'warning')),
  
  -- Resolution
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===================================================================================
-- INDEXES
-- ===================================================================================

-- Leave rules indexes
CREATE INDEX IF NOT EXISTS idx_leave_rules_type ON leave_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_leave_rules_active ON leave_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_leave_rules_priority ON leave_rules(priority);
CREATE INDEX IF NOT EXISTS idx_leave_rules_created_at ON leave_rules(created_at);

-- Leave requests indexes
CREATE INDEX IF NOT EXISTS idx_leave_requests_student_id ON leave_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_approval_status ON leave_requests(approval_status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_leave_type ON leave_requests(leave_type);
CREATE INDEX IF NOT EXISTS idx_leave_requests_created_at ON leave_requests(created_at);

-- Leave rule violations indexes
CREATE INDEX IF NOT EXISTS idx_leave_rule_violations_request_id ON leave_rule_violations(leave_request_id);
CREATE INDEX IF NOT EXISTS idx_leave_rule_violations_rule_id ON leave_rule_violations(rule_id);
CREATE INDEX IF NOT EXISTS idx_leave_rule_violations_resolved ON leave_rule_violations(is_resolved);

-- ===================================================================================
-- FUNCTIONS
-- ===================================================================================

-- Function to validate leave request against rules
CREATE OR REPLACE FUNCTION validate_leave_request(
  p_student_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_leave_type VARCHAR,
  p_affected_classes JSONB DEFAULT '[]'::jsonb
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_rule RECORD;
  v_violation_count INTEGER := 0;
  v_errors JSONB := '[]'::jsonb;
  v_warnings JSONB := '[]'::jsonb;
  v_requires_approval BOOLEAN := false;
  v_student_record RECORD;
  v_monthly_requests INTEGER;
  v_advance_days INTEGER;
  v_consecutive_days INTEGER;
  v_total_hours DECIMAL;
BEGIN
  -- Get student information
  SELECT * INTO v_student_record FROM students WHERE id = p_student_id;
  
  -- Calculate request metrics
  v_consecutive_days := (p_end_date - p_start_date + 1);
  v_advance_days := (p_start_date - CURRENT_DATE);
  
  -- Calculate total hours from affected classes
  SELECT COALESCE(SUM(CAST(class_data->>'hoursToRefund' AS DECIMAL)), 0) 
  INTO v_total_hours
  FROM jsonb_array_elements(p_affected_classes) AS class_data;
  
  -- Check each active rule
  FOR v_rule IN 
    SELECT * FROM leave_rules 
    WHERE is_active = true 
    ORDER BY priority DESC 
  LOOP
    -- Check if rule applies to this student/course type
    IF (v_rule.applies_to_student_types = '{}' OR 
        v_student_record.student_type = ANY(v_rule.applies_to_student_types)) AND
       (v_rule.applies_to_course_types = '{}' OR 
        v_student_record.course_type = ANY(v_rule.applies_to_course_types)) THEN
      
      -- Validate based on rule type
      CASE v_rule.rule_type
        WHEN 'monthly_limit' THEN
          -- Count leaves this month
          SELECT COUNT(*) INTO v_monthly_requests
          FROM leave_requests 
          WHERE student_id = p_student_id 
            AND approval_status = 'approved'
            AND DATE_TRUNC('month', start_date) = DATE_TRUNC('month', p_start_date);
          
          IF v_monthly_requests >= CAST(v_rule.value AS INTEGER) THEN
            v_errors := v_errors || jsonb_build_object(
              'ruleId', v_rule.id,
              'ruleName', v_rule.name,
              'message', format('Monthly limit of %s leaves exceeded', v_rule.value),
              'severity', 'error'
            );
            v_violation_count := v_violation_count + 1;
          END IF;
          
        WHEN 'advance_notice' THEN
          IF v_advance_days < CAST(v_rule.value AS INTEGER) THEN
            v_errors := v_errors || jsonb_build_object(
              'ruleId', v_rule.id,
              'ruleName', v_rule.name,
              'message', format('Advance notice of %s days required', v_rule.value),
              'severity', 'error'
            );
            v_violation_count := v_violation_count + 1;
          END IF;
          
        WHEN 'consecutive_days' THEN
          IF v_consecutive_days > CAST(v_rule.value AS INTEGER) THEN
            v_errors := v_errors || jsonb_build_object(
              'ruleId', v_rule.id,
              'ruleName', v_rule.name,
              'message', format('Maximum consecutive days limit of %s exceeded', v_rule.value),
              'severity', 'error'
            );
            v_violation_count := v_violation_count + 1;
          END IF;
          
        WHEN 'minimum_hours' THEN
          IF v_total_hours < CAST(v_rule.value AS DECIMAL) THEN
            v_warnings := v_warnings || jsonb_build_object(
              'ruleId', v_rule.id,
              'ruleName', v_rule.name,
              'message', format('Minimum hours of %s not met', v_rule.value)
            );
          END IF;
          
        WHEN 'approval_required' THEN
          v_requires_approval := true;
          
        WHEN 'blackout_dates' THEN
          -- Check if request overlaps with blackout dates
          IF EXISTS (
            SELECT 1 FROM jsonb_array_elements(v_rule.blackout_dates) AS blackout_date
            WHERE (p_start_date <= CAST(blackout_date->>'endDate' AS DATE) AND 
                   p_end_date >= CAST(blackout_date->>'startDate' AS DATE))
          ) THEN
            v_errors := v_errors || jsonb_build_object(
              'ruleId', v_rule.id,
              'ruleName', v_rule.name,
              'message', 'Leave request overlaps with blackout dates',
              'severity', 'error'
            );
            v_violation_count := v_violation_count + 1;
          END IF;
          
      END CASE;
    END IF;
  END LOOP;
  
  -- Build result
  v_result := jsonb_build_object(
    'isValid', v_violation_count = 0,
    'errors', v_errors,
    'warnings', v_warnings,
    'summary', jsonb_build_object(
      'totalRulesChecked', (SELECT COUNT(*) FROM leave_rules WHERE is_active = true),
      'rulesViolated', v_violation_count,
      'canProceed', v_violation_count = 0,
      'requiresApproval', v_requires_approval OR v_violation_count > 0
    )
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Function to get leave statistics for a student
CREATE OR REPLACE FUNCTION get_student_leave_statistics(
  p_student_id UUID,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_monthly_stats JSONB := '[]'::jsonb;
  v_month_data JSONB;
  v_month INTEGER;
BEGIN
  -- Get monthly statistics for the year
  FOR v_month IN 1..12 LOOP
    SELECT jsonb_build_object(
      'month', v_month,
      'totalRequests', COUNT(*),
      'approvedRequests', COUNT(*) FILTER (WHERE approval_status = 'approved'),
      'rejectedRequests', COUNT(*) FILTER (WHERE approval_status = 'rejected'),
      'pendingRequests', COUNT(*) FILTER (WHERE approval_status = 'pending'),
      'totalDays', COALESCE(SUM(end_date - start_date + 1), 0),
      'totalHours', COALESCE(SUM(total_hours_requested), 0)
    ) INTO v_month_data
    FROM leave_requests
    WHERE student_id = p_student_id
      AND EXTRACT(YEAR FROM start_date) = p_year
      AND EXTRACT(MONTH FROM start_date) = v_month;
    
    v_monthly_stats := v_monthly_stats || v_month_data;
  END LOOP;
  
  -- Get overall statistics
  SELECT jsonb_build_object(
    'year', p_year,
    'totalRequests', COUNT(*),
    'approvedRequests', COUNT(*) FILTER (WHERE approval_status = 'approved'),
    'rejectedRequests', COUNT(*) FILTER (WHERE approval_status = 'rejected'),
    'pendingRequests', COUNT(*) FILTER (WHERE approval_status = 'pending'),
    'totalDays', COALESCE(SUM(end_date - start_date + 1), 0),
    'totalHours', COALESCE(SUM(total_hours_requested), 0),
    'averageRequestDuration', COALESCE(AVG(end_date - start_date + 1), 0),
    'monthlyStats', v_monthly_stats
  ) INTO v_result
  FROM leave_requests
  WHERE student_id = p_student_id
    AND EXTRACT(YEAR FROM start_date) = p_year;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ===================================================================================
-- TRIGGERS
-- ===================================================================================

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_leave_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_leave_rules_updated_at
  BEFORE UPDATE ON leave_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_leave_rules_updated_at();

CREATE TRIGGER trigger_leave_requests_updated_at
  BEFORE UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_leave_rules_updated_at();

-- Trigger to validate leave request on insert/update
CREATE OR REPLACE FUNCTION validate_leave_request_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_validation_result JSONB;
  v_violation JSONB;
BEGIN
  -- Validate the leave request
  SELECT validate_leave_request(
    NEW.student_id,
    NEW.start_date,
    NEW.end_date,
    NEW.leave_type,
    NEW.affected_classes
  ) INTO v_validation_result;
  
  -- Store validation results
  NEW.rule_validation_results = v_validation_result;
  
  -- Insert violations into tracking table
  IF jsonb_array_length(v_validation_result->'errors') > 0 THEN
    FOR v_violation IN SELECT * FROM jsonb_array_elements(v_validation_result->'errors') LOOP
      INSERT INTO leave_rule_violations (
        leave_request_id, rule_id, violation_type, message, severity
      ) VALUES (
        NEW.id,
        CAST(v_violation->>'ruleId' AS UUID),
        'error',
        v_violation->>'message',
        v_violation->>'severity'
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validate_leave_request
  BEFORE INSERT OR UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION validate_leave_request_trigger();

-- ===================================================================================
-- ROW LEVEL SECURITY
-- ===================================================================================

-- Enable RLS
ALTER TABLE leave_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_rule_violations ENABLE ROW LEVEL SECURITY;

-- Leave rules policies (admin only)
CREATE POLICY "Leave rules are viewable by authenticated users" ON leave_rules
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Leave rules are manageable by admins" ON leave_rules
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Leave requests policies
CREATE POLICY "Students can view their own leave requests" ON leave_requests
  FOR SELECT USING (
    auth.uid() = student_id OR 
    auth.jwt() ->> 'role' IN ('admin', 'teacher')
  );

CREATE POLICY "Students can create their own leave requests" ON leave_requests
  FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their own pending leave requests" ON leave_requests
  FOR UPDATE USING (
    auth.uid() = student_id AND approval_status = 'pending'
  );

CREATE POLICY "Admins can manage all leave requests" ON leave_requests
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Leave rule violations policies
CREATE POLICY "Leave rule violations are viewable by related users" ON leave_rule_violations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leave_requests 
      WHERE id = leave_request_id 
      AND (student_id = auth.uid() OR auth.jwt() ->> 'role' IN ('admin', 'teacher'))
    )
  );

CREATE POLICY "Admins can manage leave rule violations" ON leave_rule_violations
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- ===================================================================================
-- INITIAL DATA
-- ===================================================================================

-- Insert default leave rules
INSERT INTO leave_rules (name, description, rule_type, value, frequency, is_active, priority) VALUES
  ('Monthly Leave Limit', 'Maximum 2 leave requests per month', 'monthly_limit', '2', 'monthly', true, 100),
  ('Advance Notice Requirement', 'Minimum 48 hours advance notice required', 'advance_notice', '2', null, true, 90),
  ('Consecutive Days Limit', 'Maximum 7 consecutive days leave', 'consecutive_days', '7', null, true, 80),
  ('Minimum Hours Requirement', 'Minimum 2 hours for leave processing', 'minimum_hours', '2', null, true, 70),
  ('Medical Leave Approval', 'Medical leaves require approval', 'approval_required', 'true', null, true, 60)
ON CONFLICT DO NOTHING;

-- Insert sample blackout dates (holiday periods)
INSERT INTO leave_rules (name, description, rule_type, value, blackout_dates, is_active, priority) VALUES
  ('Holiday Blackout Dates', 'No leaves during major holidays', 'blackout_dates', 'true', 
   '[
     {"startDate": "2024-12-20", "endDate": "2025-01-05", "reason": "Christmas and New Year holidays"},
     {"startDate": "2024-07-15", "endDate": "2024-08-15", "reason": "Summer intensive period"}
   ]'::jsonb, true, 110)
ON CONFLICT DO NOTHING;

-- Add comment for migration tracking
COMMENT ON TABLE leave_rules IS 'Leave rules configuration for automated validation and policy enforcement';
COMMENT ON TABLE leave_requests IS 'Student leave requests with automated validation and approval workflow';
COMMENT ON TABLE leave_rule_violations IS 'Tracking table for leave rule violations and their resolution';