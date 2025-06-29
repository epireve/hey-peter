-- Implement partitioning strategy

-- Example partitioning for the audit_logs table by range on timestamp
-- This assumes a large volume of audit logs and benefits from partitioning by time.
-- You might need to adjust the partitioning strategy based on expected data volume and query patterns.

-- Create the master table
CREATE TABLE audit_logs_partitioned (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL,
    event_details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) PARTITION BY RANGE (timestamp);

-- Create partitions (example for a few months)
-- You would need to create future partitions as needed.
CREATE TABLE audit_logs_y2025m01 PARTITION OF audit_logs_partitioned
    FOR VALUES FROM ('2025-01-01 00:00:00+00') TO ('2025-02-01 00:00:00+00');

CREATE TABLE audit_logs_y2025m02 PARTITION OF audit_logs_partitioned
    FOR VALUES FROM ('2025-02-01 00:00:00+00') TO ('2025-03-01 00:00:00+00');

CREATE TABLE audit_logs_y2025m03 PARTITION OF audit_logs_partitioned
    FOR VALUES FROM ('2025-03-01 00:00:00+00') TO ('2025-04-01 00:00:00+00');

-- You would repeat the CREATE TABLE ... PARTITION OF for subsequent months/years.

-- Note: When inserting data into a partitioned table, you insert into the master table,
-- and PostgreSQL automatically routes the data to the correct partition.
-- Queries against the master table will automatically utilize the partitions.

-- Consider partitioning other large tables if necessary, e.g., attendance, bookings.
-- Example for attendance (by range on attendance_time):
-- CREATE TABLE attendance_partitioned (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
--     attendance_time TIMESTAMP WITH TIME ZONE NOT NULL,
--     status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- ) PARTITION BY RANGE (attendance_time);

-- CREATE TABLE attendance_y2025m01 PARTITION OF attendance_partitioned
--     FOR VALUES FROM ('2025-01-01 00:00:00+00') TO ('2025-02-01 00:00:00+00');
-- ... and so on for other partitions.