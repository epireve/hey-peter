-- MySakinah Studio Database Schema
-- This migration creates tables for the AI marketing asset generation system

-- 1. STUDIO CORE TABLES

-- Templates table for Canva template management
CREATE TABLE studio_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canva_template_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- e.g., 'social_media', 'blog_header', 'advertisement'
    thumbnail_url VARCHAR(500),
    frame_coordinates JSONB, -- Store frame position data for image injection
    canvas_width INTEGER,
    canvas_height INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generation jobs table for tracking asset creation workflow
CREATE TABLE studio_generation_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id VARCHAR(100) UNIQUE NOT NULL, -- External job identifier
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    prompt_text TEXT NOT NULL,
    template_id UUID NOT NULL REFERENCES studio_templates(id) ON DELETE CASCADE,
    
    -- Job status and workflow
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'generating_image', 'composing_asset', 'uploading', 'completed', 'failed')
    ),
    
    -- AI Image generation details
    openai_image_url VARCHAR(500),
    openai_image_prompt TEXT,
    image_style VARCHAR(100), -- e.g., 'photorealistic', 'digital_art', 'cartoon'
    image_resolution VARCHAR(20) DEFAULT '1024x1024',
    
    -- Canva composition details
    canva_design_id VARCHAR(255),
    canva_export_url VARCHAR(500),
    
    -- Final asset details
    preview_url VARCHAR(500),
    drive_file_id VARCHAR(255),
    drive_share_url VARCHAR(500),
    final_asset_url VARCHAR(500),
    
    -- Metadata and timing
    generation_start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    generation_end_time TIMESTAMP WITH TIME ZONE,
    total_generation_seconds INTEGER,
    
    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drive assets table for tracking uploaded files
CREATE TABLE studio_drive_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    generation_job_id UUID NOT NULL REFERENCES studio_generation_jobs(id) ON DELETE CASCADE,
    drive_file_id VARCHAR(255) NOT NULL UNIQUE,
    drive_share_url VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    is_public BOOLEAN DEFAULT TRUE,
    download_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- API usage tracking for monitoring and billing
CREATE TABLE studio_api_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    generation_job_id UUID REFERENCES studio_generation_jobs(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- API service tracking
    service_name VARCHAR(50) NOT NULL, -- 'openai', 'canva', 'google_drive'
    api_endpoint VARCHAR(255),
    request_method VARCHAR(10),
    
    -- Usage metrics
    request_count INTEGER DEFAULT 1,
    tokens_used INTEGER, -- For OpenAI API
    credits_consumed DECIMAL(10,2), -- For Canva API
    bytes_transferred BIGINT, -- For Google Drive API
    
    -- Cost tracking
    estimated_cost_usd DECIMAL(10,4),
    
    -- Response details
    response_status INTEGER,
    response_time_ms INTEGER,
    
    -- Metadata
    request_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Studio analytics for performance monitoring
CREATE TABLE studio_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(50), -- 'seconds', 'percentage', 'count', 'bytes'
    
    -- Dimensions for filtering
    time_period VARCHAR(20), -- 'hourly', 'daily', 'weekly', 'monthly'
    template_id UUID REFERENCES studio_templates(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Metadata
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Studio user preferences
CREATE TABLE studio_user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Default generation settings
    default_image_style VARCHAR(100) DEFAULT 'photorealistic',
    default_image_resolution VARCHAR(20) DEFAULT '1024x1024',
    preferred_template_categories TEXT[], -- Array of category preferences
    
    -- Notification preferences
    email_on_completion BOOLEAN DEFAULT TRUE,
    email_on_failure BOOLEAN DEFAULT TRUE,
    
    -- UI preferences
    auto_preview BOOLEAN DEFAULT TRUE,
    auto_upload_to_drive BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- 2. INDEXES FOR PERFORMANCE

-- Generation jobs indexes
CREATE INDEX idx_studio_generation_jobs_user_id ON studio_generation_jobs(user_id);
CREATE INDEX idx_studio_generation_jobs_status ON studio_generation_jobs(status);
CREATE INDEX idx_studio_generation_jobs_template_id ON studio_generation_jobs(template_id);
CREATE INDEX idx_studio_generation_jobs_created_at ON studio_generation_jobs(created_at);
CREATE INDEX idx_studio_generation_jobs_job_id ON studio_generation_jobs(job_id);

-- Templates indexes
CREATE INDEX idx_studio_templates_category ON studio_templates(category);
CREATE INDEX idx_studio_templates_is_active ON studio_templates(is_active);
CREATE INDEX idx_studio_templates_usage_count ON studio_templates(usage_count DESC);
CREATE INDEX idx_studio_templates_canva_id ON studio_templates(canva_template_id);

-- Drive assets indexes
CREATE INDEX idx_studio_drive_assets_generation_job ON studio_drive_assets(generation_job_id);
CREATE INDEX idx_studio_drive_assets_drive_file_id ON studio_drive_assets(drive_file_id);
CREATE INDEX idx_studio_drive_assets_created_at ON studio_drive_assets(created_at);

-- API usage indexes
CREATE INDEX idx_studio_api_usage_service ON studio_api_usage(service_name);
CREATE INDEX idx_studio_api_usage_user_id ON studio_api_usage(user_id);
CREATE INDEX idx_studio_api_usage_timestamp ON studio_api_usage(request_timestamp);
CREATE INDEX idx_studio_api_usage_generation_job ON studio_api_usage(generation_job_id);

-- Analytics indexes
CREATE INDEX idx_studio_analytics_metric_name ON studio_analytics(metric_name);
CREATE INDEX idx_studio_analytics_time_period ON studio_analytics(time_period);
CREATE INDEX idx_studio_analytics_recorded_at ON studio_analytics(recorded_at);
CREATE INDEX idx_studio_analytics_template_id ON studio_analytics(template_id);

-- 3. TRIGGERS FOR AUTOMATIC UPDATES

-- Update generation job timing
CREATE OR REPLACE FUNCTION update_generation_timing()
RETURNS TRIGGER AS $$
BEGIN
    -- When status changes to 'completed' or 'failed', set end time and calculate duration
    IF NEW.status IN ('completed', 'failed') AND OLD.status != NEW.status THEN
        NEW.generation_end_time = NOW();
        NEW.total_generation_seconds = EXTRACT(EPOCH FROM (NOW() - NEW.generation_start_time))::INTEGER;
    END IF;
    
    -- Update template usage count when job completes successfully
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE studio_templates 
        SET usage_count = usage_count + 1 
        WHERE id = NEW.template_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_generation_timing_trigger
    BEFORE UPDATE ON studio_generation_jobs
    FOR EACH ROW EXECUTE FUNCTION update_generation_timing();

-- Update download count when drive asset is accessed
CREATE OR REPLACE FUNCTION increment_download_count()
RETURNS TRIGGER AS $$
BEGIN
    -- This would be called when download count needs to be updated
    -- Can be triggered by application logic
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to studio tables
CREATE TRIGGER update_studio_templates_updated_at 
    BEFORE UPDATE ON studio_templates 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_studio_generation_jobs_updated_at 
    BEFORE UPDATE ON studio_generation_jobs 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_studio_drive_assets_updated_at 
    BEFORE UPDATE ON studio_drive_assets 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_studio_user_preferences_updated_at 
    BEFORE UPDATE ON studio_user_preferences 
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 4. USEFUL FUNCTIONS

-- Function to generate unique job ID
CREATE OR REPLACE FUNCTION generate_studio_job_id()
RETURNS TEXT AS $$
DECLARE
    new_id TEXT;
    counter INT := 1;
BEGIN
    LOOP
        new_id := 'STUDIO_' || TO_CHAR(NOW(), 'YYYYMMDD') || '_' || LPAD(counter::TEXT, 6, '0');
        
        -- Check if this ID already exists
        IF NOT EXISTS (SELECT 1 FROM studio_generation_jobs WHERE job_id = new_id) THEN
            RETURN new_id;
        END IF;
        
        counter := counter + 1;
        
        -- Safety check to prevent infinite loop
        IF counter > 999999 THEN
            RAISE EXCEPTION 'Unable to generate unique studio job ID';
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to log API usage
CREATE OR REPLACE FUNCTION log_studio_api_usage(
    p_generation_job_id UUID,
    p_service_name TEXT,
    p_api_endpoint TEXT,
    p_request_method TEXT DEFAULT 'POST',
    p_tokens_used INTEGER DEFAULT NULL,
    p_credits_consumed DECIMAL DEFAULT NULL,
    p_bytes_transferred BIGINT DEFAULT NULL,
    p_estimated_cost_usd DECIMAL DEFAULT NULL,
    p_response_status INTEGER DEFAULT 200,
    p_response_time_ms INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    usage_id UUID;
    job_user_id UUID;
BEGIN
    -- Get user ID from generation job
    SELECT user_id INTO job_user_id 
    FROM studio_generation_jobs 
    WHERE id = p_generation_job_id;
    
    INSERT INTO studio_api_usage (
        generation_job_id, user_id, service_name, api_endpoint, request_method,
        tokens_used, credits_consumed, bytes_transferred, estimated_cost_usd,
        response_status, response_time_ms
    ) VALUES (
        p_generation_job_id, job_user_id, p_service_name, p_api_endpoint, p_request_method,
        p_tokens_used, p_credits_consumed, p_bytes_transferred, p_estimated_cost_usd,
        p_response_status, p_response_time_ms
    ) RETURNING id INTO usage_id;
    
    RETURN usage_id;
END;
$$ LANGUAGE plpgsql;

-- Function to record analytics metric
CREATE OR REPLACE FUNCTION record_studio_metric(
    p_metric_name TEXT,
    p_metric_value DECIMAL,
    p_metric_unit TEXT DEFAULT 'count',
    p_time_period TEXT DEFAULT 'daily',
    p_template_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    metric_id UUID;
BEGIN
    INSERT INTO studio_analytics (
        metric_name, metric_value, metric_unit, time_period,
        template_id, user_id
    ) VALUES (
        p_metric_name, p_metric_value, p_metric_unit, p_time_period,
        p_template_id, p_user_id
    ) RETURNING id INTO metric_id;
    
    RETURN metric_id;
END;
$$ LANGUAGE plpgsql;

-- 5. SAMPLE DATA INSERTION

-- Insert some sample templates for testing
INSERT INTO studio_templates (canva_template_id, name, description, category, canvas_width, canvas_height) VALUES
    ('CANVA_SOCIAL_001', 'Instagram Post - Modern Minimal', 'Clean and modern Instagram post template', 'social_media', 1080, 1080),
    ('CANVA_BLOG_001', 'Blog Header - Professional', 'Professional blog header template', 'blog_header', 1200, 400),
    ('CANVA_AD_001', 'Facebook Ad - Sale Promotion', 'Eye-catching Facebook advertisement template', 'advertisement', 1200, 628),
    ('CANVA_STORY_001', 'Instagram Story - Product Showcase', 'Product showcase template for Instagram stories', 'social_media', 1080, 1920),
    ('CANVA_BANNER_001', 'Website Banner - Tech Startup', 'Modern website banner for tech companies', 'web_banner', 1920, 600);

-- Create a log entry for system initialization
SELECT log_system_event(
    'studio_schema_initialized',
    'studio',
    'MySakinah Studio database schema has been initialized with core tables and functions',
    '{"tables_created": 6, "functions_created": 4, "sample_templates": 5}'::jsonb,
    'info'
);