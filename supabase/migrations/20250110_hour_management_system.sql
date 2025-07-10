-- =====================================================================================
-- Hour Management System for HeyPeter Academy
-- =====================================================================================
-- This migration creates the complete hour management system including:
-- 1. Hour packages (different package types with prices and validity)
-- 2. Hour purchases (tracking student purchases with payment info)
-- 3. Hour transactions (all hour additions/deductions)
-- 4. Hour adjustments (manual adjustments with reason tracking)
-- 5. Hour alerts (low balance and expiration warnings)
-- =====================================================================================

-- Create enum for package types
CREATE TYPE hour_package_type AS ENUM (
  'standard_10',
  'standard_20',
  'standard_50',
  'premium_10',
  'premium_20',
  'premium_50',
  'corporate_100',
  'corporate_200',
  'corporate_500',
  'trial_2',
  'custom'
);

-- Create enum for transaction types
CREATE TYPE hour_transaction_type AS ENUM (
  'purchase',
  'deduction',
  'refund',
  'transfer',
  'adjustment',
  'expiry',
  'bonus'
);

-- Create enum for payment status
CREATE TYPE payment_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'refunded',
  'cancelled'
);

-- Create enum for payment methods
CREATE TYPE payment_method AS ENUM (
  'credit_card',
  'debit_card',
  'bank_transfer',
  'paypal',
  'stripe',
  'cash',
  'corporate_invoice',
  'other'
);

-- =====================================================================================
-- HOUR PACKAGES TABLE
-- =====================================================================================
CREATE TABLE IF NOT EXISTS hour_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_type hour_package_type NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  hours_included INTEGER NOT NULL CHECK (hours_included > 0),
  validity_days INTEGER NOT NULL CHECK (validity_days > 0),
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  
  -- Discount and pricing
  discount_percentage DECIMAL(5, 2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  original_price DECIMAL(10, 2),
  
  -- Class type restrictions
  class_types_allowed TEXT[] DEFAULT ARRAY['individual', 'group'],
  course_types_allowed TEXT[] DEFAULT ARRAY['Basic', 'Everyday A', 'Everyday B', 'Speak Up', 'Business English', '1-on-1'],
  
  -- Features and benefits
  features JSONB DEFAULT '[]'::jsonb,
  
  -- Status and visibility
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  
  -- Limits and restrictions
  max_purchases_per_student INTEGER,
  min_purchase_hours INTEGER DEFAULT 1,
  
  -- Corporate package settings
  is_corporate BOOLEAN DEFAULT false,
  requires_approval BOOLEAN DEFAULT false,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- =====================================================================================
-- HOUR PURCHASES TABLE
-- =====================================================================================
CREATE TABLE IF NOT EXISTS hour_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES hour_packages(id),
  
  -- Purchase details
  hours_purchased INTEGER NOT NULL CHECK (hours_purchased > 0),
  price_paid DECIMAL(10, 2) NOT NULL CHECK (price_paid >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  
  -- Payment information
  payment_status payment_status NOT NULL DEFAULT 'pending',
  payment_method payment_method,
  payment_reference VARCHAR(255),
  payment_gateway_response JSONB,
  paid_at TIMESTAMPTZ,
  
  -- Validity period
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ NOT NULL,
  
  -- Usage tracking
  hours_used INTEGER DEFAULT 0 CHECK (hours_used >= 0),
  hours_remaining INTEGER GENERATED ALWAYS AS (hours_purchased - hours_used) STORED,
  
  -- Transfer settings (for family accounts)
  is_transferable BOOLEAN DEFAULT false,
  transfer_limit INTEGER,
  transfers_made INTEGER DEFAULT 0,
  
  -- Corporate/bulk purchase
  is_corporate_purchase BOOLEAN DEFAULT false,
  corporate_account_id UUID REFERENCES profiles(id),
  invoice_number VARCHAR(100),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_expired BOOLEAN DEFAULT false,
  
  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- HOUR TRANSACTIONS TABLE
-- =====================================================================================
CREATE TABLE IF NOT EXISTS hour_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  purchase_id UUID REFERENCES hour_purchases(id),
  
  -- Transaction details
  transaction_type hour_transaction_type NOT NULL,
  hours_amount INTEGER NOT NULL, -- Positive for additions, negative for deductions
  balance_before INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  
  -- Related entities
  class_id UUID REFERENCES classes(id),
  booking_id UUID REFERENCES bookings(id),
  transfer_to_student_id UUID REFERENCES profiles(id),
  transfer_from_student_id UUID REFERENCES profiles(id),
  
  -- Class type and deduction rates
  class_type VARCHAR(50),
  deduction_rate DECIMAL(3, 2) DEFAULT 1.0, -- 1.0 for regular, could be 1.5 for premium classes
  
  -- Description and reason
  description TEXT NOT NULL,
  reason TEXT,
  
  -- Approval for manual transactions
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  
  -- Reversal tracking
  is_reversed BOOLEAN DEFAULT false,
  reversed_by UUID REFERENCES auth.users(id),
  reversed_at TIMESTAMPTZ,
  reversal_reason TEXT,
  original_transaction_id UUID REFERENCES hour_transactions(id),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- =====================================================================================
-- HOUR ADJUSTMENTS TABLE
-- =====================================================================================
CREATE TABLE IF NOT EXISTS hour_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES hour_transactions(id),
  
  -- Adjustment details
  adjustment_type VARCHAR(50) NOT NULL,
  hours_adjusted INTEGER NOT NULL,
  reason TEXT NOT NULL,
  
  -- Supporting documentation
  supporting_documents JSONB DEFAULT '[]'::jsonb,
  
  -- Approval workflow
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approval_notes TEXT,
  
  -- Impact tracking
  affected_classes UUID[],
  affected_bookings UUID[],
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- HOUR ALERTS TABLE
-- =====================================================================================
CREATE TABLE IF NOT EXISTS hour_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('low_balance', 'expiring_soon', 'expired', 'no_hours')),
  
  -- Alert details
  hours_remaining INTEGER,
  expiry_date TIMESTAMPTZ,
  threshold_value INTEGER,
  
  -- Alert status
  is_active BOOLEAN DEFAULT true,
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id),
  
  -- Notification tracking
  notifications_sent INTEGER DEFAULT 0,
  last_notification_at TIMESTAMPTZ,
  next_notification_at TIMESTAMPTZ,
  
  -- Actions taken
  action_taken TEXT,
  action_taken_at TIMESTAMPTZ,
  action_taken_by UUID REFERENCES auth.users(id),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- HOUR TRANSFER LOGS TABLE
-- =====================================================================================
CREATE TABLE IF NOT EXISTS hour_transfer_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_student_id UUID NOT NULL REFERENCES profiles(id),
  to_student_id UUID NOT NULL REFERENCES profiles(id),
  from_purchase_id UUID NOT NULL REFERENCES hour_purchases(id),
  
  -- Transfer details
  hours_transferred INTEGER NOT NULL CHECK (hours_transferred > 0),
  transfer_reason TEXT NOT NULL,
  
  -- Family account verification
  is_family_transfer BOOLEAN DEFAULT true,
  family_relationship VARCHAR(50),
  
  -- Approval
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  approval_status VARCHAR(20) DEFAULT 'completed',
  
  -- Transaction references
  from_transaction_id UUID REFERENCES hour_transactions(id),
  to_transaction_id UUID REFERENCES hour_transactions(id),
  
  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- =====================================================================================
-- LEAVE REQUESTS TABLE
-- =====================================================================================
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  
  -- Request details
  class_date TIMESTAMPTZ NOT NULL,
  class_time VARCHAR(20) NOT NULL,
  class_type VARCHAR(50) NOT NULL,
  teacher_id UUID REFERENCES profiles(id),
  teacher_name VARCHAR(100),
  
  -- Leave details
  reason TEXT NOT NULL,
  leave_type VARCHAR(20) NOT NULL DEFAULT 'sick' CHECK (leave_type IN ('sick', 'emergency', 'personal', 'work', 'family', 'travel', 'other')),
  
  -- Medical certificate (for sick leave)
  medical_certificate_url TEXT,
  
  -- Submission validation
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  hours_before_class DECIMAL(5, 2) NOT NULL, -- Calculated hours between submission and class
  meets_48_hour_rule BOOLEAN NOT NULL DEFAULT false,
  
  -- Status and approval
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  -- Hour refund tracking
  hours_to_refund INTEGER DEFAULT 0,
  refund_percentage DECIMAL(5, 2) DEFAULT 0,
  refund_processed BOOLEAN DEFAULT false,
  refund_transaction_id UUID REFERENCES hour_transactions(id),
  
  -- Automatic approval (if meets 48-hour rule)
  auto_approved BOOLEAN DEFAULT false,
  
  -- Metadata
  additional_notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================================
-- INDEXES
-- =====================================================================================

-- Hour packages indexes
CREATE INDEX idx_hour_packages_active ON hour_packages(is_active) WHERE is_active = true;
CREATE INDEX idx_hour_packages_type ON hour_packages(package_type);
CREATE INDEX idx_hour_packages_featured ON hour_packages(is_featured, display_order) WHERE is_featured = true;

-- Hour purchases indexes
CREATE INDEX idx_hour_purchases_student ON hour_purchases(student_id);
CREATE INDEX idx_hour_purchases_validity ON hour_purchases(valid_until) WHERE is_active = true;
CREATE INDEX idx_hour_purchases_remaining ON hour_purchases(hours_remaining) WHERE is_active = true AND hours_remaining > 0;
CREATE INDEX idx_hour_purchases_payment_status ON hour_purchases(payment_status);
CREATE INDEX idx_hour_purchases_corporate ON hour_purchases(corporate_account_id) WHERE is_corporate_purchase = true;

-- Hour transactions indexes
CREATE INDEX idx_hour_transactions_student ON hour_transactions(student_id);
CREATE INDEX idx_hour_transactions_type ON hour_transactions(transaction_type);
CREATE INDEX idx_hour_transactions_class ON hour_transactions(class_id) WHERE class_id IS NOT NULL;
CREATE INDEX idx_hour_transactions_booking ON hour_transactions(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX idx_hour_transactions_created ON hour_transactions(created_at);
CREATE INDEX idx_hour_transactions_reversed ON hour_transactions(is_reversed) WHERE is_reversed = false;

-- Hour adjustments indexes
CREATE INDEX idx_hour_adjustments_student ON hour_adjustments(student_id);
CREATE INDEX idx_hour_adjustments_status ON hour_adjustments(approval_status);
CREATE INDEX idx_hour_adjustments_requested_by ON hour_adjustments(requested_by);

-- Hour alerts indexes
CREATE INDEX idx_hour_alerts_student_active ON hour_alerts(student_id, alert_type) WHERE is_active = true;
CREATE INDEX idx_hour_alerts_type ON hour_alerts(alert_type) WHERE is_active = true;
CREATE INDEX idx_hour_alerts_notification ON hour_alerts(next_notification_at) WHERE is_active = true AND is_acknowledged = false;

-- Hour transfer logs indexes
CREATE INDEX idx_hour_transfers_from_student ON hour_transfer_logs(from_student_id);
CREATE INDEX idx_hour_transfers_to_student ON hour_transfer_logs(to_student_id);
CREATE INDEX idx_hour_transfers_created ON hour_transfer_logs(created_at);

-- Leave requests indexes
CREATE INDEX idx_leave_requests_student ON leave_requests(student_id);
CREATE INDEX idx_leave_requests_class ON leave_requests(class_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_class_date ON leave_requests(class_date);
CREATE INDEX idx_leave_requests_submitted ON leave_requests(submitted_at);
CREATE INDEX idx_leave_requests_48_hour_rule ON leave_requests(meets_48_hour_rule);
CREATE INDEX idx_leave_requests_pending_review ON leave_requests(status, reviewed_at) WHERE status = 'pending';

-- =====================================================================================
-- FUNCTIONS
-- =====================================================================================

-- Function to calculate total available hours for a student
CREATE OR REPLACE FUNCTION calculate_student_hours(p_student_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_total_hours INTEGER;
BEGIN
  SELECT COALESCE(SUM(hours_remaining), 0)
  INTO v_total_hours
  FROM hour_purchases
  WHERE student_id = p_student_id
    AND is_active = true
    AND is_expired = false
    AND valid_until > NOW()
    AND payment_status = 'completed';
    
  RETURN v_total_hours;
END;
$$ LANGUAGE plpgsql;

-- Function to deduct hours for a class
CREATE OR REPLACE FUNCTION deduct_class_hours(
  p_student_id UUID,
  p_class_id UUID,
  p_booking_id UUID,
  p_hours_to_deduct INTEGER,
  p_class_type VARCHAR,
  p_deduction_rate DECIMAL DEFAULT 1.0
) RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
  v_actual_deduction INTEGER;
  v_balance_before INTEGER;
  v_balance_after INTEGER;
  v_purchase_record RECORD;
  v_remaining_to_deduct INTEGER;
BEGIN
  -- Calculate actual deduction based on rate
  v_actual_deduction := CEIL(p_hours_to_deduct * p_deduction_rate);
  v_remaining_to_deduct := v_actual_deduction;
  
  -- Get current balance
  v_balance_before := calculate_student_hours(p_student_id);
  
  -- Check if student has enough hours
  IF v_balance_before < v_actual_deduction THEN
    RAISE EXCEPTION 'Insufficient hours. Required: %, Available: %', v_actual_deduction, v_balance_before;
  END IF;
  
  -- Deduct from purchases in FIFO order (oldest first)
  FOR v_purchase_record IN
    SELECT id, hours_remaining
    FROM hour_purchases
    WHERE student_id = p_student_id
      AND is_active = true
      AND is_expired = false
      AND valid_until > NOW()
      AND payment_status = 'completed'
      AND hours_remaining > 0
    ORDER BY valid_until ASC, created_at ASC
  LOOP
    IF v_remaining_to_deduct <= 0 THEN
      EXIT;
    END IF;
    
    IF v_purchase_record.hours_remaining >= v_remaining_to_deduct THEN
      -- Deduct all remaining hours from this purchase
      UPDATE hour_purchases
      SET hours_used = hours_used + v_remaining_to_deduct,
          updated_at = NOW()
      WHERE id = v_purchase_record.id;
      
      v_remaining_to_deduct := 0;
    ELSE
      -- Deduct all available hours from this purchase
      UPDATE hour_purchases
      SET hours_used = hours_used + v_purchase_record.hours_remaining,
          updated_at = NOW()
      WHERE id = v_purchase_record.id;
      
      v_remaining_to_deduct := v_remaining_to_deduct - v_purchase_record.hours_remaining;
    END IF;
  END LOOP;
  
  -- Calculate new balance
  v_balance_after := calculate_student_hours(p_student_id);
  
  -- Create transaction record
  INSERT INTO hour_transactions (
    student_id,
    transaction_type,
    hours_amount,
    balance_before,
    balance_after,
    class_id,
    booking_id,
    class_type,
    deduction_rate,
    description
  ) VALUES (
    p_student_id,
    'deduction',
    -v_actual_deduction,
    v_balance_before,
    v_balance_after,
    p_class_id,
    p_booking_id,
    p_class_type,
    p_deduction_rate,
    'Class attendance deduction'
  ) RETURNING id INTO v_transaction_id;
  
  -- Check if low balance alert needed
  PERFORM check_hour_balance_alerts(p_student_id);
  
  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check and create hour balance alerts
CREATE OR REPLACE FUNCTION check_hour_balance_alerts(p_student_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_hours INTEGER;
  v_expiring_purchase RECORD;
BEGIN
  -- Get current total hours
  v_total_hours := calculate_student_hours(p_student_id);
  
  -- Check for low balance (less than 5 hours)
  IF v_total_hours < 5 AND v_total_hours > 0 THEN
    INSERT INTO hour_alerts (
      student_id,
      alert_type,
      hours_remaining,
      threshold_value
    ) VALUES (
      p_student_id,
      'low_balance',
      v_total_hours,
      5
    ) ON CONFLICT (student_id, alert_type) WHERE is_active = true
    DO UPDATE SET
      hours_remaining = EXCLUDED.hours_remaining,
      updated_at = NOW();
  END IF;
  
  -- Check for no hours
  IF v_total_hours = 0 THEN
    INSERT INTO hour_alerts (
      student_id,
      alert_type,
      hours_remaining,
      threshold_value
    ) VALUES (
      p_student_id,
      'no_hours',
      0,
      0
    ) ON CONFLICT (student_id, alert_type) WHERE is_active = true
    DO UPDATE SET
      updated_at = NOW();
  END IF;
  
  -- Check for expiring hours (within 30 days)
  FOR v_expiring_purchase IN
    SELECT id, valid_until, hours_remaining
    FROM hour_purchases
    WHERE student_id = p_student_id
      AND is_active = true
      AND is_expired = false
      AND hours_remaining > 0
      AND valid_until BETWEEN NOW() AND NOW() + INTERVAL '30 days'
  LOOP
    INSERT INTO hour_alerts (
      student_id,
      alert_type,
      hours_remaining,
      expiry_date,
      threshold_value
    ) VALUES (
      p_student_id,
      'expiring_soon',
      v_expiring_purchase.hours_remaining,
      v_expiring_purchase.valid_until,
      30
    ) ON CONFLICT (student_id, alert_type, expiry_date)
    DO UPDATE SET
      hours_remaining = EXCLUDED.hours_remaining,
      updated_at = NOW();
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to expire old hour purchases
CREATE OR REPLACE FUNCTION expire_hour_purchases()
RETURNS INTEGER AS $$
DECLARE
  v_expired_count INTEGER := 0;
  v_purchase RECORD;
BEGIN
  FOR v_purchase IN
    SELECT id, student_id, hours_remaining
    FROM hour_purchases
    WHERE is_active = true
      AND is_expired = false
      AND valid_until < NOW()
      AND hours_remaining > 0
  LOOP
    -- Mark purchase as expired
    UPDATE hour_purchases
    SET is_expired = true,
        updated_at = NOW()
    WHERE id = v_purchase.id;
    
    -- Create expiry transaction
    INSERT INTO hour_transactions (
      student_id,
      purchase_id,
      transaction_type,
      hours_amount,
      balance_before,
      balance_after,
      description
    ) VALUES (
      v_purchase.student_id,
      v_purchase.id,
      'expiry',
      -v_purchase.hours_remaining,
      calculate_student_hours(v_purchase.student_id) + v_purchase.hours_remaining,
      calculate_student_hours(v_purchase.student_id),
      'Hours expired'
    );
    
    -- Create expiry alert
    INSERT INTO hour_alerts (
      student_id,
      alert_type,
      hours_remaining,
      expiry_date
    ) VALUES (
      v_purchase.student_id,
      'expired',
      v_purchase.hours_remaining,
      NOW()
    );
    
    v_expired_count := v_expired_count + 1;
  END LOOP;
  
  RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql;

-- Function to submit leave request with 48-hour rule validation
CREATE OR REPLACE FUNCTION submit_leave_request(
  p_student_id UUID,
  p_class_id UUID,
  p_booking_id UUID,
  p_class_date TIMESTAMPTZ,
  p_class_time VARCHAR,
  p_class_type VARCHAR,
  p_teacher_id UUID,
  p_teacher_name VARCHAR,
  p_reason TEXT,
  p_leave_type VARCHAR DEFAULT 'sick',
  p_medical_certificate_url TEXT DEFAULT NULL,
  p_additional_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_leave_request_id UUID;
  v_hours_before_class DECIMAL(5, 2);
  v_meets_48_hour_rule BOOLEAN DEFAULT false;
  v_hours_to_refund INTEGER DEFAULT 0;
  v_refund_percentage DECIMAL(5, 2) DEFAULT 0;
  v_auto_approved BOOLEAN DEFAULT false;
  v_status VARCHAR(20) DEFAULT 'pending';
BEGIN
  -- Calculate hours between submission and class
  v_hours_before_class := EXTRACT(EPOCH FROM (p_class_date - NOW())) / 3600;
  
  -- Check if meets 48-hour rule
  IF v_hours_before_class >= 48 THEN
    v_meets_48_hour_rule := true;
    v_auto_approved := true;
    v_status := 'approved';
    
    -- Full refund for 48+ hours notice
    v_refund_percentage := 100;
    v_hours_to_refund := 1; -- Assuming 1 hour per class, adjust as needed
  ELSIF v_hours_before_class >= 24 THEN
    -- 24-48 hours: partial refund, requires manual review
    v_refund_percentage := 50;
    v_hours_to_refund := 1;
  ELSIF v_hours_before_class >= 2 THEN
    -- 2-24 hours: limited refund, requires manual review
    v_refund_percentage := 25;
    v_hours_to_refund := 1;
  ELSE
    -- Less than 2 hours: no refund
    v_refund_percentage := 0;
    v_hours_to_refund := 0;
  END IF;
  
  -- Special handling for medical emergencies
  IF p_leave_type = 'emergency' OR p_leave_type = 'sick' THEN
    -- Medical cases can get better treatment even with short notice
    IF v_hours_before_class < 48 AND v_hours_before_class >= 2 THEN
      v_refund_percentage := 75;
    END IF;
  END IF;
  
  -- Prevent duplicate requests for the same class
  IF EXISTS (
    SELECT 1 FROM leave_requests 
    WHERE student_id = p_student_id 
      AND class_id = p_class_id 
      AND status NOT IN ('cancelled', 'rejected')
  ) THEN
    RAISE EXCEPTION 'Leave request already exists for this class';
  END IF;
  
  -- Create leave request
  INSERT INTO leave_requests (
    student_id,
    class_id,
    booking_id,
    class_date,
    class_time,
    class_type,
    teacher_id,
    teacher_name,
    reason,
    leave_type,
    medical_certificate_url,
    hours_before_class,
    meets_48_hour_rule,
    status,
    hours_to_refund,
    refund_percentage,
    auto_approved,
    additional_notes
  ) VALUES (
    p_student_id,
    p_class_id,
    p_booking_id,
    p_class_date,
    p_class_time,
    p_class_type,
    p_teacher_id,
    p_teacher_name,
    p_reason,
    p_leave_type,
    p_medical_certificate_url,
    v_hours_before_class,
    v_meets_48_hour_rule,
    v_status,
    v_hours_to_refund,
    v_refund_percentage,
    v_auto_approved,
    p_additional_notes
  ) RETURNING id INTO v_leave_request_id;
  
  -- If auto-approved, process the refund immediately
  IF v_auto_approved AND v_hours_to_refund > 0 THEN
    PERFORM process_leave_refund(v_leave_request_id);
  END IF;
  
  RETURN v_leave_request_id;
END;
$$ LANGUAGE plpgsql;

-- Function to process leave refund
CREATE OR REPLACE FUNCTION process_leave_refund(p_leave_request_id UUID)
RETURNS VOID AS $$
DECLARE
  v_request RECORD;
  v_transaction_id UUID;
  v_balance_before INTEGER;
  v_balance_after INTEGER;
BEGIN
  -- Get leave request details
  SELECT * INTO v_request
  FROM leave_requests
  WHERE id = p_leave_request_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leave request not found';
  END IF;
  
  -- Check if refund already processed
  IF v_request.refund_processed THEN
    RAISE EXCEPTION 'Refund already processed for this request';
  END IF;
  
  -- Only process if there are hours to refund
  IF v_request.hours_to_refund > 0 THEN
    -- Get current balance
    v_balance_before := calculate_student_hours(v_request.student_id);
    v_balance_after := v_balance_before + v_request.hours_to_refund;
    
    -- Create refund transaction
    INSERT INTO hour_transactions (
      student_id,
      transaction_type,
      hours_amount,
      balance_before,
      balance_after,
      class_id,
      booking_id,
      description,
      reason,
      metadata
    ) VALUES (
      v_request.student_id,
      'refund',
      v_request.hours_to_refund,
      v_balance_before,
      v_balance_after,
      v_request.class_id,
      v_request.booking_id,
      'Leave request refund',
      v_request.reason,
      jsonb_build_object(
        'leave_request_id', p_leave_request_id,
        'refund_percentage', v_request.refund_percentage,
        'hours_before_class', v_request.hours_before_class
      )
    ) RETURNING id INTO v_transaction_id;
    
    -- Update leave request with refund info
    UPDATE leave_requests
    SET refund_processed = true,
        refund_transaction_id = v_transaction_id,
        updated_at = NOW()
    WHERE id = p_leave_request_id;
    
    -- Add hours back to student's oldest active purchase
    -- This is a simplified approach - in production, you might want more sophisticated logic
    UPDATE hour_purchases
    SET hours_used = hours_used - v_request.hours_to_refund,
        updated_at = NOW()
    WHERE id = (
      SELECT id FROM hour_purchases
      WHERE student_id = v_request.student_id
        AND is_active = true
        AND is_expired = false
        AND hours_used >= v_request.hours_to_refund
      ORDER BY created_at ASC
      LIMIT 1
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================================
-- TRIGGERS
-- =====================================================================================

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_hour_management_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_hour_packages_timestamp
  BEFORE UPDATE ON hour_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_hour_management_timestamp();

CREATE TRIGGER update_hour_purchases_timestamp
  BEFORE UPDATE ON hour_purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_hour_management_timestamp();

CREATE TRIGGER update_hour_adjustments_timestamp
  BEFORE UPDATE ON hour_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION update_hour_management_timestamp();

CREATE TRIGGER update_hour_alerts_timestamp
  BEFORE UPDATE ON hour_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_hour_management_timestamp();

CREATE TRIGGER update_leave_requests_timestamp
  BEFORE UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_hour_management_timestamp();

-- =====================================================================================
-- ROW LEVEL SECURITY
-- =====================================================================================

-- Enable RLS on all tables
ALTER TABLE hour_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE hour_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE hour_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hour_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hour_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE hour_transfer_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

-- Hour packages policies (public read, admin write)
CREATE POLICY hour_packages_select ON hour_packages
  FOR SELECT USING (is_active = true OR auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  ));

CREATE POLICY hour_packages_insert ON hour_packages
  FOR INSERT WITH CHECK (auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  ));

CREATE POLICY hour_packages_update ON hour_packages
  FOR UPDATE USING (auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  ));

-- Hour purchases policies
CREATE POLICY hour_purchases_select ON hour_purchases
  FOR SELECT USING (
    student_id = auth.uid() OR
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'teacher'))
  );

CREATE POLICY hour_purchases_insert ON hour_purchases
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

CREATE POLICY hour_purchases_update ON hour_purchases
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Hour transactions policies
CREATE POLICY hour_transactions_select ON hour_transactions
  FOR SELECT USING (
    student_id = auth.uid() OR
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'teacher'))
  );

CREATE POLICY hour_transactions_insert ON hour_transactions
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'teacher'))
  );

-- Hour adjustments policies
CREATE POLICY hour_adjustments_select ON hour_adjustments
  FOR SELECT USING (
    student_id = auth.uid() OR
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'teacher'))
  );

CREATE POLICY hour_adjustments_insert ON hour_adjustments
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'teacher'))
  );

CREATE POLICY hour_adjustments_update ON hour_adjustments
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Hour alerts policies
CREATE POLICY hour_alerts_select ON hour_alerts
  FOR SELECT USING (
    student_id = auth.uid() OR
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'teacher'))
  );

CREATE POLICY hour_alerts_update ON hour_alerts
  FOR UPDATE USING (
    student_id = auth.uid() OR
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'teacher'))
  );

-- Hour transfer logs policies
CREATE POLICY hour_transfer_logs_select ON hour_transfer_logs
  FOR SELECT USING (
    from_student_id = auth.uid() OR
    to_student_id = auth.uid() OR
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'teacher'))
  );

CREATE POLICY hour_transfer_logs_insert ON hour_transfer_logs
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- Leave requests policies
CREATE POLICY leave_requests_select ON leave_requests
  FOR SELECT USING (
    student_id = auth.uid() OR
    teacher_id = auth.uid() OR
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'teacher'))
  );

CREATE POLICY leave_requests_insert ON leave_requests
  FOR INSERT WITH CHECK (
    student_id = auth.uid() OR
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

CREATE POLICY leave_requests_update ON leave_requests
  FOR UPDATE USING (
    student_id = auth.uid() OR
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'teacher'))
  );

-- =====================================================================================
-- SEED DATA - Default hour packages
-- =====================================================================================

INSERT INTO hour_packages (package_type, name, description, hours_included, validity_days, price, currency, features, display_order) VALUES
  ('trial_2', 'Trial Package', 'Perfect for trying out our classes', 2, 30, 29.99, 'USD', 
   '["2 hours of classes", "Valid for 30 days", "All class types available", "No commitment required"]'::jsonb, 1),
  
  ('standard_10', 'Starter Package', 'Great for beginners', 10, 90, 149.99, 'USD',
   '["10 hours of classes", "Valid for 90 days", "All class types available", "5% discount"]'::jsonb, 2),
  
  ('standard_20', 'Regular Package', 'Our most popular package', 20, 120, 279.99, 'USD',
   '["20 hours of classes", "Valid for 120 days", "All class types available", "10% discount", "Priority booking"]'::jsonb, 3),
  
  ('standard_50', 'Intensive Package', 'For dedicated learners', 50, 180, 649.99, 'USD',
   '["50 hours of classes", "Valid for 180 days", "All class types available", "15% discount", "Priority booking", "Free assessment"]'::jsonb, 4),
  
  ('premium_20', 'Premium Small', 'Premium learning experience', 20, 150, 349.99, 'USD',
   '["20 hours of classes", "Valid for 150 days", "Premium teachers only", "15% discount", "Priority booking", "Personalized curriculum"]'::jsonb, 5),
  
  ('premium_50', 'Premium Large', 'Maximum flexibility and benefits', 50, 365, 799.99, 'USD',
   '["50 hours of classes", "Valid for 365 days", "Premium teachers only", "20% discount", "Priority booking", "Personalized curriculum", "Progress reports"]'::jsonb, 6),
  
  ('corporate_100', 'Corporate Basic', 'For small teams', 100, 365, 1299.99, 'USD',
   '["100 hours of classes", "Valid for 365 days", "Transferable between employees", "25% discount", "Dedicated support", "Monthly reports"]'::jsonb, 7),
  
  ('corporate_200', 'Corporate Standard', 'For growing teams', 200, 365, 2399.99, 'USD',
   '["200 hours of classes", "Valid for 365 days", "Transferable between employees", "30% discount", "Dedicated support", "Weekly reports", "Custom scheduling"]'::jsonb, 8),
  
  ('corporate_500', 'Corporate Enterprise', 'For large organizations', 500, 365, 5499.99, 'USD',
   '["500 hours of classes", "Valid for 365 days", "Unlimited transfers", "35% discount", "Dedicated account manager", "Real-time analytics", "Custom curriculum", "On-site option"]'::jsonb, 9);

-- =====================================================================================
-- COMMENTS
-- =====================================================================================

COMMENT ON TABLE hour_packages IS 'Defines different hour package types available for purchase';
COMMENT ON TABLE hour_purchases IS 'Records of hour packages purchased by students';
COMMENT ON TABLE hour_transactions IS 'All hour-related transactions including purchases, deductions, transfers';
COMMENT ON TABLE hour_adjustments IS 'Manual hour adjustments with approval workflow';
COMMENT ON TABLE hour_alerts IS 'Alerts for low balance, expiring hours, etc.';
COMMENT ON TABLE hour_transfer_logs IS 'Log of hour transfers between students (family accounts)';
COMMENT ON TABLE leave_requests IS 'Student leave requests with 48-hour rule enforcement and refund processing';

COMMENT ON FUNCTION calculate_student_hours IS 'Calculates total available hours for a student';
COMMENT ON FUNCTION deduct_class_hours IS 'Deducts hours when a student attends a class';
COMMENT ON FUNCTION check_hour_balance_alerts IS 'Checks and creates alerts for low balance or expiring hours';
COMMENT ON FUNCTION expire_hour_purchases IS 'Expires old hour purchases and creates transactions';
COMMENT ON FUNCTION submit_leave_request IS 'Submits leave request with 48-hour rule validation and automatic refund processing';
COMMENT ON FUNCTION process_leave_refund IS 'Processes hour refunds for approved leave requests';