-- Create database functions and triggers

-- Function to update user role
CREATE OR REPLACE FUNCTION update_user_role()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        INSERT INTO user_roles (user_id, role)
        VALUES (NEW.id, NEW.role);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call update_user_role function after user update
CREATE TRIGGER update_user_role_trigger
AFTER UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_user_role();

-- Function to create a default student entry when a user with role 'student' is created
CREATE OR REPLACE FUNCTION create_default_student()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'student' THEN
        INSERT INTO students (user_id)
        VALUES (NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call create_default_student function after user insert
CREATE TRIGGER create_default_student_trigger
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_default_student();

-- Function to create a default teacher entry when a user with role 'teacher' is created
CREATE OR REPLACE FUNCTION create_default_teacher()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role = 'teacher' THEN
        INSERT INTO teachers (user_id)
        VALUES (NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call create_default_teacher function after user insert
CREATE TRIGGER create_default_teacher_trigger
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_default_teacher();

-- Function to log user sessions
CREATE OR REPLACE FUNCTION log_user_session()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_sessions (user_id, login_time)
    VALUES (NEW.id, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call log_user_session function after user login (assuming auth.users table is used for logins)
-- This trigger needs to be created on the auth.users table, which might require elevated privileges.
-- CREATE TRIGGER log_user_session_trigger
-- AFTER INSERT ON auth.users
-- FOR EACH ROW
-- EXECUTE FUNCTION log_user_session();

-- Function to log system events
CREATE OR REPLACE FUNCTION log_system_event(event_type text, event_details jsonb)
RETURNS void AS $$
BEGIN
    INSERT INTO system_events (event_type, event_details)
    VALUES (event_type, event_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Example usage of log_system_event function:
-- SELECT log_system_event('user_created', jsonb_build_object('user_id', NEW.id, 'email', NEW.email));