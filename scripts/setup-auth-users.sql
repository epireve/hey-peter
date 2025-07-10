-- Setup Authentication Users for Testing
-- This script creates auth users that match our application users table

-- Create auth users for admin accounts
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
SELECT 
    u.id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    u.email,
    crypt('admin123', gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('name', u.full_name, 'role', u.role),
    NOW(),
    NOW()
FROM users u
WHERE u.role = 'admin'
ON CONFLICT (id) DO NOTHING;

-- Create auth users for teacher accounts
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
SELECT 
    u.id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    u.email,
    crypt('teacher123', gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('name', u.full_name, 'role', u.role),
    NOW(),
    NOW()
FROM users u
WHERE u.role = 'teacher'
ON CONFLICT (id) DO NOTHING;

-- Create auth users for student accounts
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
SELECT 
    u.id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    u.email,
    crypt('student123', gen_salt('bf')),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('name', u.full_name, 'role', u.role),
    NOW(),
    NOW()
FROM users u
WHERE u.role = 'student'
ON CONFLICT (id) DO NOTHING;

-- Verify auth users created
SELECT COUNT(*) as auth_user_count FROM auth.users;

-- Show sample credentials
SELECT 
    u.email,
    u.role,
    CASE 
        WHEN u.role = 'admin' THEN 'admin123'
        WHEN u.role = 'teacher' THEN 'teacher123'
        WHEN u.role = 'student' THEN 'student123'
    END as password
FROM users u
LIMIT 10;