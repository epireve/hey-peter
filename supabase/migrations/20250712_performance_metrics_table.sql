-- Create performance_metrics table for application performance monitoring
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    duration DECIMAL(10,2) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    metadata JSONB,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    user_agent TEXT,
    url TEXT,
    error_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexes for common queries
    INDEX idx_performance_metrics_timestamp (timestamp DESC),
    INDEX idx_performance_metrics_type (type),
    INDEX idx_performance_metrics_user_id (user_id),
    INDEX idx_performance_metrics_session_id (session_id),
    INDEX idx_performance_metrics_name_type (name, type)
);

-- Create index for time-range queries
CREATE INDEX idx_performance_metrics_time_range 
ON performance_metrics(timestamp) 
WHERE timestamp IS NOT NULL;

-- Add RLS policies
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own metrics
CREATE POLICY "Users can insert their own metrics" ON performance_metrics
    FOR INSERT
    TO authenticated
    USING (auth.uid() = user_id);

-- Allow authenticated users to read their own metrics
CREATE POLICY "Users can read their own metrics" ON performance_metrics
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Allow service role full access
CREATE POLICY "Service role has full access" ON performance_metrics
    FOR ALL
    TO service_role
    USING (true);

-- Add comment
COMMENT ON TABLE performance_metrics IS 'Stores application performance metrics for monitoring and analysis';