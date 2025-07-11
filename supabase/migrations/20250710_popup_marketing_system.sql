-- ========================================
-- Visitor Popup Marketing System
-- Created: 2025-01-10
-- Description: Comprehensive popup marketing system with A/B testing, analytics, and GDPR compliance
-- ========================================

-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- POPUP CAMPAIGNS TABLE
-- ========================================
CREATE TABLE popup_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
    campaign_type VARCHAR(50) NOT NULL DEFAULT 'lead_capture' CHECK (campaign_type IN ('lead_capture', 'course_promotion', 'discount_offer', 'newsletter_signup', 'exit_intent', 'welcome')),
    
    -- Targeting settings
    target_audience JSONB NOT NULL DEFAULT '{}',
    device_targeting VARCHAR(20) DEFAULT 'all' CHECK (device_targeting IN ('all', 'desktop', 'mobile', 'tablet')),
    geo_targeting JSONB DEFAULT '{}',
    
    -- Schedule settings
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- A/B Testing
    ab_testing_enabled BOOLEAN DEFAULT false,
    traffic_allocation DECIMAL(3,2) DEFAULT 1.00 CHECK (traffic_allocation >= 0.01 AND traffic_allocation <= 1.00),
    
    -- Compliance
    gdpr_compliant BOOLEAN DEFAULT true,
    requires_consent BOOLEAN DEFAULT true,
    consent_text TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT valid_date_range CHECK (start_date IS NULL OR end_date IS NULL OR start_date < end_date)
);

-- ========================================
-- POPUP VARIATIONS TABLE (for A/B testing)
-- ========================================
CREATE TABLE popup_variations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES popup_campaigns(id) ON DELETE CASCADE,
    variation_name VARCHAR(100) NOT NULL,
    is_control BOOLEAN DEFAULT false,
    traffic_percentage DECIMAL(5,2) NOT NULL DEFAULT 50.00 CHECK (traffic_percentage >= 0 AND traffic_percentage <= 100),
    
    -- Design configuration
    template_type VARCHAR(50) NOT NULL DEFAULT 'modal' CHECK (template_type IN ('modal', 'banner', 'slide_in', 'corner', 'fullscreen')),
    design_config JSONB NOT NULL DEFAULT '{}',
    content_config JSONB NOT NULL DEFAULT '{}',
    
    -- Form configuration
    form_fields JSONB NOT NULL DEFAULT '[]',
    cta_config JSONB NOT NULL DEFAULT '{}',
    
    -- Trigger configuration
    trigger_rules JSONB NOT NULL DEFAULT '{}',
    
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(campaign_id, variation_name)
);

-- ========================================
-- POPUP TRIGGERS TABLE
-- ========================================
CREATE TABLE popup_triggers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN (
        'time_delay', 'scroll_percentage', 'exit_intent', 'page_visit_count', 
        'session_duration', 'specific_page', 'referrer_source', 'device_type',
        'returning_visitor', 'first_time_visitor', 'geographic_location'
    )),
    trigger_config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- POPUP DISPLAYS TABLE (tracking)
-- ========================================
CREATE TABLE popup_displays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) NOT NULL,
    visitor_id VARCHAR(255), -- anonymous or authenticated user ID
    campaign_id UUID NOT NULL REFERENCES popup_campaigns(id) ON DELETE CASCADE,
    variation_id UUID NOT NULL REFERENCES popup_variations(id) ON DELETE CASCADE,
    
    -- Display context
    page_url TEXT NOT NULL,
    referrer_url TEXT,
    user_agent TEXT,
    device_info JSONB DEFAULT '{}',
    geo_info JSONB DEFAULT '{}',
    
    -- Timing
    displayed_at TIMESTAMPTZ DEFAULT NOW(),
    trigger_type VARCHAR(50),
    trigger_value JSONB DEFAULT '{}',
    
    -- User interaction
    interaction_type VARCHAR(50) CHECK (interaction_type IN ('displayed', 'clicked', 'dismissed', 'converted', 'closed')),
    interaction_data JSONB DEFAULT '{}',
    time_to_interaction INTEGER, -- milliseconds
    
    -- Conversion tracking
    converted BOOLEAN DEFAULT false,
    conversion_value DECIMAL(10,2),
    conversion_data JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- POPUP LEADS TABLE
-- ========================================
CREATE TABLE popup_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    display_id UUID NOT NULL REFERENCES popup_displays(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES popup_campaigns(id) ON DELETE CASCADE,
    variation_id UUID NOT NULL REFERENCES popup_variations(id) ON DELETE CASCADE,
    
    -- Lead information
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    company VARCHAR(255),
    lead_source VARCHAR(100) DEFAULT 'popup',
    
    -- Preferences and interests
    interests JSONB DEFAULT '[]',
    course_preferences JSONB DEFAULT '[]',
    preferred_contact_method VARCHAR(50) DEFAULT 'email',
    
    -- Consent and compliance
    marketing_consent BOOLEAN DEFAULT false,
    consent_timestamp TIMESTAMPTZ,
    consent_ip_address INET,
    gdpr_compliant BOOLEAN DEFAULT true,
    
    -- Lead scoring and qualification
    lead_score INTEGER DEFAULT 0,
    lead_status VARCHAR(50) DEFAULT 'new' CHECK (lead_status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
    qualification_notes TEXT,
    
    -- Follow-up tracking
    follow_up_required BOOLEAN DEFAULT true,
    follow_up_date TIMESTAMPTZ,
    assigned_to UUID REFERENCES auth.users(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(email, campaign_id)
);

-- ========================================
-- POPUP ANALYTICS TABLE
-- ========================================
CREATE TABLE popup_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES popup_campaigns(id) ON DELETE CASCADE,
    variation_id UUID REFERENCES popup_variations(id) ON DELETE CASCADE,
    
    -- Date partitioning
    analytics_date DATE NOT NULL DEFAULT CURRENT_DATE,
    hour_bucket INTEGER CHECK (hour_bucket >= 0 AND hour_bucket <= 23),
    
    -- Metrics
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    dismissals INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    
    -- Calculated metrics
    click_through_rate DECIMAL(5,4) DEFAULT 0.0000,
    conversion_rate DECIMAL(5,4) DEFAULT 0.0000,
    average_time_to_interaction DECIMAL(8,2) DEFAULT 0.00,
    bounce_rate DECIMAL(5,4) DEFAULT 0.0000,
    
    -- Revenue tracking
    total_revenue DECIMAL(12,2) DEFAULT 0.00,
    average_order_value DECIMAL(10,2) DEFAULT 0.00,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(campaign_id, variation_id, analytics_date, hour_bucket)
);

-- ========================================
-- VISITOR CONSENT TABLE (GDPR)
-- ========================================
CREATE TABLE visitor_consent (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visitor_id VARCHAR(255) NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    
    -- Consent details
    consent_type VARCHAR(50) NOT NULL CHECK (consent_type IN ('marketing', 'analytics', 'functional', 'all')),
    consent_granted BOOLEAN NOT NULL,
    consent_timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    -- Technical details
    ip_address INET,
    user_agent TEXT,
    consent_method VARCHAR(50) DEFAULT 'popup' CHECK (consent_method IN ('popup', 'banner', 'form', 'api')),
    
    -- Legal compliance
    privacy_policy_version VARCHAR(20),
    terms_version VARCHAR(20),
    gdpr_applicable BOOLEAN DEFAULT true,
    
    -- Expiry and updates
    expires_at TIMESTAMPTZ,
    withdrawn_at TIMESTAMPTZ,
    withdrawal_reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(visitor_id, consent_type)
);

-- ========================================
-- EMAIL INTEGRATION TABLE
-- ========================================
CREATE TABLE popup_email_integration (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES popup_campaigns(id) ON DELETE CASCADE,
    
    -- Email service configuration
    email_provider VARCHAR(50) NOT NULL CHECK (email_provider IN ('mailchimp', 'sendgrid', 'hubspot', 'custom')),
    api_config JSONB NOT NULL DEFAULT '{}',
    
    -- Email automation
    welcome_email_enabled BOOLEAN DEFAULT true,
    welcome_email_template_id VARCHAR(255),
    follow_up_sequence_enabled BOOLEAN DEFAULT false,
    follow_up_config JSONB DEFAULT '{}',
    
    -- List management
    mailing_list_id VARCHAR(255),
    segment_tags JSONB DEFAULT '[]',
    
    -- Status and monitoring
    sync_enabled BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    sync_errors JSONB DEFAULT '[]',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(campaign_id, email_provider)
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Campaign indexes
CREATE INDEX idx_popup_campaigns_status ON popup_campaigns(status);
CREATE INDEX idx_popup_campaigns_dates ON popup_campaigns(start_date, end_date);
CREATE INDEX idx_popup_campaigns_created_at ON popup_campaigns(created_at);

-- Variation indexes
CREATE INDEX idx_popup_variations_campaign_status ON popup_variations(campaign_id, status);

-- Display indexes
CREATE INDEX idx_popup_displays_session ON popup_displays(session_id);
CREATE INDEX idx_popup_displays_campaign_date ON popup_displays(campaign_id, displayed_at);
CREATE INDEX idx_popup_displays_visitor ON popup_displays(visitor_id);
CREATE INDEX idx_popup_displays_conversion ON popup_displays(converted, displayed_at);

-- Lead indexes
CREATE INDEX idx_popup_leads_email ON popup_leads(email);
CREATE INDEX idx_popup_leads_campaign ON popup_leads(campaign_id, created_at);
CREATE INDEX idx_popup_leads_status ON popup_leads(lead_status, follow_up_required);
CREATE INDEX idx_popup_leads_assigned ON popup_leads(assigned_to, follow_up_date);

-- Analytics indexes
CREATE INDEX idx_popup_analytics_campaign_date ON popup_analytics(campaign_id, analytics_date);
CREATE INDEX idx_popup_analytics_variation_date ON popup_analytics(variation_id, analytics_date);

-- Consent indexes
CREATE INDEX idx_visitor_consent_visitor ON visitor_consent(visitor_id, consent_type);
CREATE INDEX idx_visitor_consent_timestamp ON visitor_consent(consent_timestamp);

-- ========================================
-- ROW LEVEL SECURITY (RLS)
-- ========================================

-- Enable RLS on all tables
ALTER TABLE popup_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE popup_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE popup_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE popup_displays ENABLE ROW LEVEL SECURITY;
ALTER TABLE popup_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE popup_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE popup_email_integration ENABLE ROW LEVEL SECURITY;

-- Policies for admin users (full access)
CREATE POLICY "Admin full access to popup_campaigns" ON popup_campaigns
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_app_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Admin full access to popup_variations" ON popup_variations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_app_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Admin full access to popup_triggers" ON popup_triggers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_app_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Admin full access to popup_displays" ON popup_displays
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_app_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Admin full access to popup_leads" ON popup_leads
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_app_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Admin full access to popup_analytics" ON popup_analytics
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_app_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Admin full access to visitor_consent" ON visitor_consent
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_app_meta_data->>'role' = 'admin'
        )
    );

CREATE POLICY "Admin full access to popup_email_integration" ON popup_email_integration
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_app_meta_data->>'role' = 'admin'
        )
    );

-- Public read access for active campaigns (for display)
CREATE POLICY "Public read access to active campaigns" ON popup_campaigns
    FOR SELECT USING (status = 'active' AND (start_date IS NULL OR start_date <= NOW()) AND (end_date IS NULL OR end_date >= NOW()));

CREATE POLICY "Public read access to active variations" ON popup_variations
    FOR SELECT USING (
        status = 'active' AND 
        EXISTS (
            SELECT 1 FROM popup_campaigns 
            WHERE popup_campaigns.id = popup_variations.campaign_id 
            AND popup_campaigns.status = 'active'
            AND (popup_campaigns.start_date IS NULL OR popup_campaigns.start_date <= NOW())
            AND (popup_campaigns.end_date IS NULL OR popup_campaigns.end_date >= NOW())
        )
    );

-- Public insert access for displays and leads (anonymous users)
CREATE POLICY "Public insert access to popup_displays" ON popup_displays
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Public insert access to popup_leads" ON popup_leads
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Public insert access to visitor_consent" ON visitor_consent
    FOR INSERT WITH CHECK (true);

-- ========================================
-- FUNCTIONS AND TRIGGERS
-- ========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_popup_campaigns_updated_at BEFORE UPDATE ON popup_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_popup_variations_updated_at BEFORE UPDATE ON popup_variations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_popup_triggers_updated_at BEFORE UPDATE ON popup_triggers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_popup_leads_updated_at BEFORE UPDATE ON popup_leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_popup_analytics_updated_at BEFORE UPDATE ON popup_analytics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_visitor_consent_updated_at BEFORE UPDATE ON visitor_consent FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_popup_email_integration_updated_at BEFORE UPDATE ON popup_email_integration FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically calculate analytics metrics
CREATE OR REPLACE FUNCTION calculate_popup_metrics()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.clicks > 0 AND NEW.impressions > 0 THEN
        NEW.click_through_rate = (NEW.clicks::DECIMAL / NEW.impressions::DECIMAL);
    END IF;
    
    IF NEW.conversions > 0 AND NEW.impressions > 0 THEN
        NEW.conversion_rate = (NEW.conversions::DECIMAL / NEW.impressions::DECIMAL);
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_popup_analytics_metrics 
    BEFORE INSERT OR UPDATE ON popup_analytics 
    FOR EACH ROW EXECUTE FUNCTION calculate_popup_metrics();

-- Function to update analytics when display interactions occur
CREATE OR REPLACE FUNCTION update_popup_analytics()
RETURNS TRIGGER AS $$
DECLARE
    analytics_record popup_analytics%ROWTYPE;
    current_date DATE := CURRENT_DATE;
    current_hour INTEGER := EXTRACT(HOUR FROM NOW());
BEGIN
    -- Find or create analytics record
    SELECT * INTO analytics_record 
    FROM popup_analytics 
    WHERE campaign_id = NEW.campaign_id 
    AND variation_id = NEW.variation_id 
    AND analytics_date = current_date 
    AND hour_bucket = current_hour;
    
    IF NOT FOUND THEN
        INSERT INTO popup_analytics (campaign_id, variation_id, analytics_date, hour_bucket, impressions)
        VALUES (NEW.campaign_id, NEW.variation_id, current_date, current_hour, 1);
    ELSE
        -- Update based on interaction type
        IF NEW.interaction_type = 'displayed' THEN
            UPDATE popup_analytics 
            SET impressions = impressions + 1 
            WHERE id = analytics_record.id;
        ELSIF NEW.interaction_type = 'clicked' THEN
            UPDATE popup_analytics 
            SET clicks = clicks + 1 
            WHERE id = analytics_record.id;
        ELSIF NEW.interaction_type = 'converted' THEN
            UPDATE popup_analytics 
            SET conversions = conversions + 1,
                total_revenue = total_revenue + COALESCE(NEW.conversion_value, 0)
            WHERE id = analytics_record.id;
        ELSIF NEW.interaction_type = 'dismissed' THEN
            UPDATE popup_analytics 
            SET dismissals = dismissals + 1 
            WHERE id = analytics_record.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_analytics_on_display 
    AFTER INSERT ON popup_displays 
    FOR EACH ROW EXECUTE FUNCTION update_popup_analytics();

-- ========================================
-- VIEWS FOR REPORTING
-- ========================================

-- Campaign performance view
CREATE VIEW campaign_performance AS
SELECT 
    c.id,
    c.name,
    c.status,
    c.campaign_type,
    SUM(a.impressions) as total_impressions,
    SUM(a.clicks) as total_clicks,
    SUM(a.conversions) as total_conversions,
    SUM(a.dismissals) as total_dismissals,
    CASE 
        WHEN SUM(a.impressions) > 0 
        THEN ROUND((SUM(a.clicks)::DECIMAL / SUM(a.impressions)::DECIMAL) * 100, 2)
        ELSE 0 
    END as ctr_percentage,
    CASE 
        WHEN SUM(a.impressions) > 0 
        THEN ROUND((SUM(a.conversions)::DECIMAL / SUM(a.impressions)::DECIMAL) * 100, 2)
        ELSE 0 
    END as conversion_percentage,
    SUM(a.total_revenue) as total_revenue,
    COUNT(DISTINCT l.id) as total_leads,
    c.created_at
FROM popup_campaigns c
LEFT JOIN popup_analytics a ON c.id = a.campaign_id
LEFT JOIN popup_leads l ON c.id = l.campaign_id
GROUP BY c.id, c.name, c.status, c.campaign_type, c.created_at;

-- A/B test results view
CREATE VIEW ab_test_results AS
SELECT 
    c.id as campaign_id,
    c.name as campaign_name,
    v.id as variation_id,
    v.variation_name,
    v.is_control,
    v.traffic_percentage,
    SUM(a.impressions) as impressions,
    SUM(a.clicks) as clicks,
    SUM(a.conversions) as conversions,
    CASE 
        WHEN SUM(a.impressions) > 0 
        THEN ROUND((SUM(a.clicks)::DECIMAL / SUM(a.impressions)::DECIMAL) * 100, 4)
        ELSE 0 
    END as ctr_percentage,
    CASE 
        WHEN SUM(a.impressions) > 0 
        THEN ROUND((SUM(a.conversions)::DECIMAL / SUM(a.impressions)::DECIMAL) * 100, 4)
        ELSE 0 
    END as conversion_percentage,
    SUM(a.total_revenue) as revenue
FROM popup_campaigns c
JOIN popup_variations v ON c.id = v.campaign_id
LEFT JOIN popup_analytics a ON v.id = a.variation_id
WHERE c.ab_testing_enabled = true
GROUP BY c.id, c.name, v.id, v.variation_name, v.is_control, v.traffic_percentage;

-- Lead quality view
CREATE VIEW lead_quality_metrics AS
SELECT 
    l.campaign_id,
    c.name as campaign_name,
    COUNT(*) as total_leads,
    COUNT(CASE WHEN l.lead_status = 'qualified' THEN 1 END) as qualified_leads,
    COUNT(CASE WHEN l.lead_status = 'converted' THEN 1 END) as converted_leads,
    ROUND(AVG(l.lead_score), 2) as average_lead_score,
    COUNT(CASE WHEN l.marketing_consent = true THEN 1 END) as consented_leads,
    ROUND(
        (COUNT(CASE WHEN l.lead_status = 'qualified' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100, 
        2
    ) as qualification_rate,
    ROUND(
        (COUNT(CASE WHEN l.lead_status = 'converted' THEN 1 END)::DECIMAL / COUNT(*)::DECIMAL) * 100, 
        2
    ) as lead_conversion_rate
FROM popup_leads l
JOIN popup_campaigns c ON l.campaign_id = c.id
GROUP BY l.campaign_id, c.name;

-- ========================================
-- SAMPLE DATA FOR TESTING
-- ========================================

-- Insert sample trigger configurations
INSERT INTO popup_triggers (name, description, trigger_type, trigger_config) VALUES
('5 Second Delay', 'Show popup after 5 seconds on page', 'time_delay', '{"delay": 5000}'),
('50% Scroll', 'Show popup when user scrolls 50% down page', 'scroll_percentage', '{"percentage": 50}'),
('Exit Intent', 'Show popup when user attempts to leave page', 'exit_intent', '{"sensitivity": "medium"}'),
('Third Page Visit', 'Show popup on third page visit in session', 'page_visit_count', '{"count": 3}'),
('2 Minute Session', 'Show popup after 2 minutes of activity', 'session_duration', '{"duration": 120000}'),
('First Time Visitor', 'Show popup to first-time visitors only', 'first_time_visitor', '{"exclude_returning": true}');

COMMENT ON TABLE popup_campaigns IS 'Main popup campaign configuration and metadata';
COMMENT ON TABLE popup_variations IS 'A/B test variations for popup campaigns';
COMMENT ON TABLE popup_triggers IS 'Behavioral trigger configurations for popups';
COMMENT ON TABLE popup_displays IS 'Tracking table for all popup display events';
COMMENT ON TABLE popup_leads IS 'Lead capture data from popup submissions';
COMMENT ON TABLE popup_analytics IS 'Aggregated analytics data for popup performance';
COMMENT ON TABLE visitor_consent IS 'GDPR compliance and visitor consent tracking';
COMMENT ON TABLE popup_email_integration IS 'Email service provider integration settings';