-- Create audit_logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    details JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_sessions table
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    login_time TIMESTAMPTZ DEFAULT NOW(),
    logout_time TIMESTAMPTZ,
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- Create system_events table
CREATE TABLE system_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(255) NOT NULL,
    details JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);