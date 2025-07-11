-- Migration: Error Tracking and Logging System
-- Description: Creates tables and indexes for comprehensive error tracking, logging, and monitoring

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- System Logs Table
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    level VARCHAR(20) NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal')),
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'authentication', 'database', 'api', 'ui', 'scheduling', 
        'hours', 'analytics', 'performance', 'security', 'integration', 
        'user_action', 'system'
    )),
    message TEXT NOT NULL,
    context JSONB,
    user_id UUID REFERENCES auth.users(id),
    session_id VARCHAR(255),
    request_id VARCHAR(255),
    source VARCHAR(20) NOT NULL CHECK (source IN ('client', 'server')),
    stack_trace TEXT,
    fingerprint VARCHAR(255),
    tags TEXT[],
    environment VARCHAR(50) NOT NULL DEFAULT 'development'
);

-- Error Reports Table
CREATE TABLE IF NOT EXISTS error_reports (
    id VARCHAR(255) PRIMARY KEY,
    message TEXT NOT NULL,
    stack TEXT,
    type VARCHAR(255) NOT NULL,
    level VARCHAR(20) NOT NULL CHECK (level IN ('fatal', 'error', 'warning', 'info', 'debug')),
    fingerprint VARCHAR(255) NOT NULL,
    context JSONB NOT NULL,
    first_seen TIMESTAMPTZ NOT NULL,
    last_seen TIMESTAMPTZ NOT NULL,
    count INTEGER NOT NULL DEFAULT 1,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    assignee VARCHAR(255),
    tags TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Metrics Table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    value DECIMAL(10, 2) NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'ms',
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'rendering', 'api_response', 'database_query', 'bundle_size',
        'memory_usage', 'cpu_usage', 'network', 'user_interaction',
        'page_load', 'custom'
    )),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    context JSONB,
    threshold DECIMAL(10, 2),
    tags TEXT[],
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id),
    session_id VARCHAR(255)
);

-- User Actions Table
CREATE TABLE IF NOT EXISTS user_actions (
    id VARCHAR(255) PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'click', 'input', 'submit', 'navigation', 'scroll', 'resize',
        'focus', 'blur', 'hover', 'key_press', 'form_interaction',
        'modal_interaction', 'api_call', 'error', 'custom'
    )),
    component VARCHAR(255),
    element VARCHAR(255),
    page VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    data JSONB,
    metadata JSONB NOT NULL,
    performance JSONB,
    sequence INTEGER NOT NULL
);

-- User Sessions Table
CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    duration INTEGER, -- in milliseconds
    page_views INTEGER NOT NULL DEFAULT 0,
    actions_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    browser VARCHAR(255) NOT NULL,
    os VARCHAR(255) NOT NULL,
    device_type VARCHAR(20) NOT NULL CHECK (device_type IN ('desktop', 'tablet', 'mobile')),
    referrer TEXT,
    exit_page VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Error Alerts Table
CREATE TABLE IF NOT EXISTS error_alerts (
    id VARCHAR(255) PRIMARY KEY,
    rule_id VARCHAR(255) NOT NULL,
    rule_name VARCHAR(255) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('firing', 'resolved', 'suppressed')),
    triggered_at TIMESTAMPTZ NOT NULL,
    resolved_at TIMESTAMPTZ,
    message TEXT NOT NULL,
    details JSONB NOT NULL,
    context JSONB NOT NULL,
    actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alert Rules Table
CREATE TABLE IF NOT EXISTS alert_rules (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    conditions JSONB NOT NULL,
    actions JSONB NOT NULL,
    cooldown_period INTEGER NOT NULL DEFAULT 15, -- in minutes
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance

-- System Logs indexes
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_category ON system_logs(category);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_session_id ON system_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_fingerprint ON system_logs(fingerprint);
CREATE INDEX IF NOT EXISTS idx_system_logs_environment ON system_logs(environment);
CREATE INDEX IF NOT EXISTS idx_system_logs_source ON system_logs(source);

-- Error Reports indexes
CREATE INDEX IF NOT EXISTS idx_error_reports_fingerprint ON error_reports(fingerprint);
CREATE INDEX IF NOT EXISTS idx_error_reports_last_seen ON error_reports(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_error_reports_count ON error_reports(count DESC);
CREATE INDEX IF NOT EXISTS idx_error_reports_resolved ON error_reports(resolved);
CREATE INDEX IF NOT EXISTS idx_error_reports_type ON error_reports(type);
CREATE INDEX IF NOT EXISTS idx_error_reports_level ON error_reports(level);

-- Performance Metrics indexes
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON performance_metrics(name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_category ON performance_metrics(category);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_severity ON performance_metrics(severity);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id ON performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_session_id ON performance_metrics(session_id);

-- User Actions indexes
CREATE INDEX IF NOT EXISTS idx_user_actions_timestamp ON user_actions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_actions_session_id ON user_actions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_actions_user_id ON user_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_actions_type ON user_actions(type);
CREATE INDEX IF NOT EXISTS idx_user_actions_page ON user_actions(page);
CREATE INDEX IF NOT EXISTS idx_user_actions_sequence ON user_actions(sequence);

-- User Sessions indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_start_time ON user_sessions(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_device_type ON user_sessions(device_type);

-- Error Alerts indexes
CREATE INDEX IF NOT EXISTS idx_error_alerts_rule_id ON error_alerts(rule_id);
CREATE INDEX IF NOT EXISTS idx_error_alerts_status ON error_alerts(status);
CREATE INDEX IF NOT EXISTS idx_error_alerts_severity ON error_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_error_alerts_triggered_at ON error_alerts(triggered_at DESC);

-- Alert Rules indexes
CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON alert_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_alert_rules_severity ON alert_rules(severity);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_system_logs_level_timestamp ON system_logs(level, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_category_timestamp ON system_logs(category, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_reports_resolved_last_seen ON error_reports(resolved, last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_category_timestamp ON performance_metrics(category, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_actions_session_type ON user_actions(session_id, type);

-- Create GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_system_logs_context_gin ON system_logs USING GIN(context);
CREATE INDEX IF NOT EXISTS idx_error_reports_context_gin ON error_reports USING GIN(context);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_context_gin ON performance_metrics USING GIN(context);
CREATE INDEX IF NOT EXISTS idx_user_actions_data_gin ON user_actions USING GIN(data);
CREATE INDEX IF NOT EXISTS idx_user_actions_metadata_gin ON user_actions USING GIN(metadata);

-- Create partial indexes for active records
CREATE INDEX IF NOT EXISTS idx_error_reports_unresolved ON error_reports(last_seen DESC) WHERE resolved = FALSE;
CREATE INDEX IF NOT EXISTS idx_error_alerts_active ON error_alerts(triggered_at DESC) WHERE status = 'firing';
CREATE INDEX IF NOT EXISTS idx_alert_rules_active ON alert_rules(updated_at DESC) WHERE enabled = TRUE;

-- Create functions and triggers for automatic updates

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_error_reports_updated_at
    BEFORE UPDATE ON error_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_error_alerts_updated_at
    BEFORE UPDATE ON error_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alert_rules_updated_at
    BEFORE UPDATE ON alert_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically increment error count
CREATE OR REPLACE FUNCTION increment_error_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update existing error report if fingerprint exists
    UPDATE error_reports 
    SET count = count + 1,
        last_seen = NEW.last_seen,
        context = NEW.context
    WHERE fingerprint = NEW.fingerprint;
    
    -- If no existing error was updated, insert the new one
    IF NOT FOUND THEN
        RETURN NEW;
    END IF;
    
    -- Return NULL to skip the insert
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Trigger for automatic error aggregation
CREATE TRIGGER error_reports_increment_count
    BEFORE INSERT ON error_reports
    FOR EACH ROW
    EXECUTE FUNCTION increment_error_count();

-- Function to clean up old data
CREATE OR REPLACE FUNCTION cleanup_old_logs(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
    cutoff_date TIMESTAMPTZ;
BEGIN
    cutoff_date := NOW() - (days_to_keep || ' days')::INTERVAL;
    
    -- Delete old system logs
    DELETE FROM system_logs WHERE timestamp < cutoff_date;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete old user actions (keep longer retention for user_actions)
    DELETE FROM user_actions WHERE timestamp < (NOW() - '90 days'::INTERVAL);
    
    -- Delete old performance metrics
    DELETE FROM performance_metrics WHERE timestamp < cutoff_date;
    
    -- Delete old resolved alerts
    DELETE FROM error_alerts 
    WHERE status = 'resolved' 
    AND resolved_at < (NOW() - '60 days'::INTERVAL);
    
    RETURN deleted_count;
END;
$$ language 'plpgsql';

-- Create a view for error summary statistics
CREATE OR REPLACE VIEW error_summary AS
SELECT 
    DATE_TRUNC('hour', last_seen) as hour,
    type,
    level,
    COUNT(*) as error_count,
    SUM(count) as total_occurrences,
    MAX(last_seen) as latest_occurrence
FROM error_reports
WHERE last_seen >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', last_seen), type, level
ORDER BY hour DESC, total_occurrences DESC;

-- Create a view for performance metrics summary
CREATE OR REPLACE VIEW performance_summary AS
SELECT 
    DATE_TRUNC('hour', timestamp) as hour,
    category,
    name,
    AVG(value) as avg_value,
    MIN(value) as min_value,
    MAX(value) as max_value,
    COUNT(*) as metric_count,
    COUNT(CASE WHEN severity IN ('high', 'critical') THEN 1 END) as alerts_count
FROM performance_metrics
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', timestamp), category, name
ORDER BY hour DESC, alerts_count DESC;

-- Create a view for user session analytics
CREATE OR REPLACE VIEW session_analytics AS
SELECT 
    DATE_TRUNC('day', start_time) as day,
    device_type,
    COUNT(*) as sessions_count,
    AVG(duration) as avg_duration,
    AVG(page_views) as avg_page_views,
    AVG(actions_count) as avg_actions,
    SUM(error_count) as total_errors
FROM user_sessions
WHERE start_time >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', start_time), device_type
ORDER BY day DESC;

-- Row Level Security (RLS) policies

-- Enable RLS on all tables
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;

-- Create policies for system logs (admin only)
CREATE POLICY "Admin can view all system logs" ON system_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

CREATE POLICY "System can insert logs" ON system_logs
    FOR INSERT WITH CHECK (true);

-- Create policies for error reports (admin only)
CREATE POLICY "Admin can view all error reports" ON error_reports
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

CREATE POLICY "System can manage error reports" ON error_reports
    FOR ALL USING (true);

-- Create policies for performance metrics (admin only)
CREATE POLICY "Admin can view performance metrics" ON performance_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

CREATE POLICY "System can insert performance metrics" ON performance_metrics
    FOR INSERT WITH CHECK (true);

-- Create policies for user actions (users can view their own)
CREATE POLICY "Users can view their own actions" ON user_actions
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

CREATE POLICY "System can insert user actions" ON user_actions
    FOR INSERT WITH CHECK (true);

-- Create policies for user sessions (users can view their own)
CREATE POLICY "Users can view their own sessions" ON user_sessions
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

CREATE POLICY "System can manage user sessions" ON user_sessions
    FOR ALL USING (true);

-- Create policies for alerts (admin only)
CREATE POLICY "Admin can manage alerts" ON error_alerts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

CREATE POLICY "Admin can manage alert rules" ON alert_rules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.user_id = auth.uid() 
            AND user_profiles.role = 'admin'
        )
    );

-- Insert default alert rules
INSERT INTO alert_rules (id, name, description, enabled, conditions, actions, cooldown_period, severity) VALUES 
('high_error_rate', 'High Error Rate', 'Triggers when error rate exceeds 5% in 5 minutes', true, 
 '[{"type": "error_rate", "metric": "error_percentage", "operator": "gt", "value": 5, "timeWindow": 5}]'::jsonb,
 '[{"type": "email", "config": {"recipients": ["admin@heypeter.com"]}}]'::jsonb,
 15, 'high'),

('critical_error_spike', 'Critical Error Spike', 'Triggers when more than 10 critical errors occur in 5 minutes', true,
 '[{"type": "error_count", "metric": "fatal_errors", "operator": "gt", "value": 10, "timeWindow": 5, "filters": {"level": "fatal"}}]'::jsonb,
 '[{"type": "email", "config": {"recipients": ["admin@heypeter.com"], "priority": "high"}}]'::jsonb,
 5, 'critical'),

('performance_degradation', 'Performance Degradation', 'Triggers when average response time exceeds 2 seconds', true,
 '[{"type": "performance", "metric": "avg_response_time", "operator": "gt", "value": 2000, "timeWindow": 10}]'::jsonb,
 '[{"type": "email", "config": {"recipients": ["admin@heypeter.com"]}}]'::jsonb,
 30, 'medium'),

('database_errors', 'Database Connection Errors', 'Triggers on database connection failures', true,
 '[{"type": "log_pattern", "metric": "log_message", "operator": "contains", "value": "database connection", "timeWindow": 5, "filters": {"category": "database", "level": "error"}}]'::jsonb,
 '[{"type": "email", "config": {"recipients": ["admin@heypeter.com"]}}]'::jsonb,
 10, 'high')
ON CONFLICT (id) DO NOTHING;

-- Create a scheduled job to clean up old data (if pg_cron is available)
-- This would typically be set up separately in the database configuration
-- SELECT cron.schedule('cleanup-old-logs', '0 2 * * *', 'SELECT cleanup_old_logs(30);');

-- Comments for documentation
COMMENT ON TABLE system_logs IS 'Centralized logging table for all application logs';
COMMENT ON TABLE error_reports IS 'Aggregated error reports with deduplication by fingerprint';
COMMENT ON TABLE performance_metrics IS 'Performance metrics and monitoring data';
COMMENT ON TABLE user_actions IS 'User interaction tracking for debugging and analytics';
COMMENT ON TABLE user_sessions IS 'User session information and analytics';
COMMENT ON TABLE error_alerts IS 'Active and historical error alerts';
COMMENT ON TABLE alert_rules IS 'Configuration for error alerting rules';

COMMENT ON FUNCTION cleanup_old_logs IS 'Removes old log entries to manage database size';
COMMENT ON VIEW error_summary IS 'Hourly error statistics summary';
COMMENT ON VIEW performance_summary IS 'Hourly performance metrics summary';
COMMENT ON VIEW session_analytics IS 'Daily user session analytics';