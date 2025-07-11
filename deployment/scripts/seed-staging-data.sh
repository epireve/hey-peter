#!/bin/bash

# Seed staging data for HeyPeter Academy LMS
# This script populates the staging database with test data

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Load environment variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../environments/.env.staging"

echo -e "${GREEN}Seeding staging database with test data...${NC}"

# Create temporary SQL file with staging data
cat > /tmp/staging_seed.sql << 'EOF'
-- Staging Test Data for HeyPeter Academy LMS

BEGIN;

-- Test Users (with known passwords for testing)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'admin@staging.heypeter.com', crypt('staging123', gen_salt('bf')), NOW(), NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'teacher1@staging.heypeter.com', crypt('staging123', gen_salt('bf')), NOW(), NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', 'teacher2@staging.heypeter.com', crypt('staging123', gen_salt('bf')), NOW(), NOW(), NOW()),
  ('44444444-4444-4444-4444-444444444444', 'student1@staging.heypeter.com', crypt('staging123', gen_salt('bf')), NOW(), NOW(), NOW()),
  ('55555555-5555-5555-5555-555555555555', 'student2@staging.heypeter.com', crypt('staging123', gen_salt('bf')), NOW(), NOW(), NOW()),
  ('66666666-6666-6666-6666-666666666666', 'student3@staging.heypeter.com', crypt('staging123', gen_salt('bf')), NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- User Profiles
INSERT INTO public.profiles (id, email, full_name, role, avatar_url, created_at, updated_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'admin@staging.heypeter.com', 'Staging Admin', 'admin', 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin', NOW(), NOW()),
  ('22222222-2222-2222-2222-222222222222', 'teacher1@staging.heypeter.com', 'Sarah Johnson', 'teacher', 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah', NOW(), NOW()),
  ('33333333-3333-3333-3333-333333333333', 'teacher2@staging.heypeter.com', 'Michael Chen', 'teacher', 'https://api.dicebear.com/7.x/avataaars/svg?seed=michael', NOW(), NOW()),
  ('44444444-4444-4444-4444-444444444444', 'student1@staging.heypeter.com', 'Emma Wilson', 'student', 'https://api.dicebear.com/7.x/avataaars/svg?seed=emma', NOW(), NOW()),
  ('55555555-5555-5555-5555-555555555555', 'student2@staging.heypeter.com', 'James Brown', 'student', 'https://api.dicebear.com/7.x/avataaars/svg?seed=james', NOW(), NOW()),
  ('66666666-6666-6666-6666-666666666666', 'student3@staging.heypeter.com', 'Olivia Davis', 'student', 'https://api.dicebear.com/7.x/avataaars/svg?seed=olivia', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Test Teachers
INSERT INTO public.teachers (id, email, full_name, phone, address, emergency_contact, date_of_birth, subjects, availability, status)
VALUES 
  ('22222222-2222-2222-2222-222222222222', 'teacher1@staging.heypeter.com', 'Sarah Johnson', '+1234567890', '123 Main St, City', 'John Johnson: +1234567891', '1985-03-15', ARRAY['English', 'Business English'], '{"monday": ["09:00-17:00"], "tuesday": ["09:00-17:00"], "wednesday": ["09:00-17:00"]}', 'active'),
  ('33333333-3333-3333-3333-333333333333', 'teacher2@staging.heypeter.com', 'Michael Chen', '+1234567892', '456 Oak Ave, Town', 'Lisa Chen: +1234567893', '1990-07-22', ARRAY['English', 'Speak Up'], '{"tuesday": ["10:00-18:00"], "thursday": ["10:00-18:00"], "friday": ["10:00-18:00"]}', 'active')
ON CONFLICT (id) DO NOTHING;

-- Test Students
INSERT INTO public.students (id, email, full_name, phone, address, emergency_contact, date_of_birth, enrollment_date, status, notes)
VALUES 
  ('44444444-4444-4444-4444-444444444444', 'student1@staging.heypeter.com', 'Emma Wilson', '+1234567894', '789 Pine Rd, Village', 'Robert Wilson: +1234567895', '2005-11-20', NOW() - INTERVAL '6 months', 'active', 'Advanced level student'),
  ('55555555-5555-5555-5555-555555555555', 'student2@staging.heypeter.com', 'James Brown', '+1234567896', '321 Elm St, District', 'Mary Brown: +1234567897', '2006-02-10', NOW() - INTERVAL '3 months', 'active', 'Intermediate level'),
  ('66666666-6666-6666-6666-666666666666', 'student3@staging.heypeter.com', 'Olivia Davis', '+1234567898', '654 Maple Dr, Borough', 'Tom Davis: +1234567899', '2004-08-05', NOW() - INTERVAL '1 year', 'active', 'Preparing for business English')
ON CONFLICT (id) DO NOTHING;

-- Test Courses
INSERT INTO public.courses (name, description, level, duration_hours, max_students, course_type, is_active)
VALUES 
  ('Basic English A1', 'Beginner English course for absolute beginners', 'A1', 60, 9, 'Basic', true),
  ('Everyday English A2', 'Pre-intermediate conversational English', 'A2', 80, 9, 'Everyday', true),
  ('Speak Up B1', 'Intermediate speaking and listening skills', 'B1', 100, 9, 'Speak Up', true),
  ('Business English B2', 'Advanced business communication skills', 'B2', 120, 9, 'Business English', true),
  ('1-on-1 Coaching', 'Personalized one-on-one English coaching', 'All', 1, 1, 'One-on-One', true)
ON CONFLICT (name) DO NOTHING;

-- Enrollments (link students to courses)
INSERT INTO public.student_courses (student_id, course_id, enrollment_date, status)
SELECT 
  s.id,
  c.id,
  NOW() - INTERVAL '1 month',
  'active'
FROM public.students s
CROSS JOIN public.courses c
WHERE s.id IN ('44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555')
  AND c.name IN ('Everyday English A2', 'Speak Up B1')
ON CONFLICT (student_id, course_id) DO NOTHING;

-- Test Classes (scheduled for the next week)
INSERT INTO public.classes (course_id, teacher_id, start_time, end_time, status, location, max_students)
SELECT 
  c.id,
  t.id,
  date_trunc('day', NOW() + INTERVAL '1 day') + TIME '10:00:00',
  date_trunc('day', NOW() + INTERVAL '1 day') + TIME '11:30:00',
  'scheduled',
  'Online',
  c.max_students
FROM public.courses c
CROSS JOIN public.teachers t
WHERE c.name = 'Everyday English A2' AND t.full_name = 'Sarah Johnson'
UNION ALL
SELECT 
  c.id,
  t.id,
  date_trunc('day', NOW() + INTERVAL '2 days') + TIME '14:00:00',
  date_trunc('day', NOW() + INTERVAL '2 days') + TIME '15:30:00',
  'scheduled',
  'Online',
  c.max_students
FROM public.courses c
CROSS JOIN public.teachers t
WHERE c.name = 'Speak Up B1' AND t.full_name = 'Michael Chen'
ON CONFLICT DO NOTHING;

-- Hour Packages for students
INSERT INTO public.hour_packages (student_id, package_type, total_hours, used_hours, remaining_hours, purchase_date, expiry_date, status)
VALUES 
  ('44444444-4444-4444-4444-444444444444', 'standard', 20, 5, 15, NOW() - INTERVAL '1 month', NOW() + INTERVAL '5 months', 'active'),
  ('55555555-5555-5555-5555-555555555555', 'premium', 40, 10, 30, NOW() - INTERVAL '2 weeks', NOW() + INTERVAL '6 months', 'active'),
  ('66666666-6666-6666-6666-666666666666', 'basic', 10, 2, 8, NOW() - INTERVAL '3 days', NOW() + INTERVAL '3 months', 'active')
ON CONFLICT DO NOTHING;

-- Sample attendance records
INSERT INTO public.attendance (class_id, student_id, status, check_in_time)
SELECT 
  c.id,
  s.id,
  'present',
  c.start_time + INTERVAL '5 minutes'
FROM public.classes c
CROSS JOIN public.students s
WHERE c.status = 'completed'
  AND s.id IN ('44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555')
ON CONFLICT DO NOTHING;

-- Test notifications
INSERT INTO public.notifications (user_id, title, message, type, read, created_at)
VALUES 
  ('44444444-4444-4444-4444-444444444444', 'Welcome to Staging!', 'This is a test notification for the staging environment.', 'info', false, NOW()),
  ('22222222-2222-2222-2222-222222222222', 'New Class Assignment', 'You have been assigned to teach a new class tomorrow.', 'info', false, NOW())
ON CONFLICT DO NOTHING;

COMMIT;

-- Display summary
SELECT 'Staging data seeded successfully!' as message;
SELECT 'Users created:' as category, COUNT(*) as count FROM auth.users WHERE email LIKE '%@staging.heypeter.com';
SELECT 'Teachers created:' as category, COUNT(*) as count FROM public.teachers;
SELECT 'Students created:' as category, COUNT(*) as count FROM public.students;
SELECT 'Courses created:' as category, COUNT(*) as count FROM public.courses;
SELECT 'Classes scheduled:' as category, COUNT(*) as count FROM public.classes WHERE status = 'scheduled';
EOF

# Execute the SQL
echo -e "${YELLOW}Executing staging seed data...${NC}"
psql "$DATABASE_URL" -f /tmp/staging_seed.sql

# Clean up
rm -f /tmp/staging_seed.sql

echo -e "${GREEN}Staging data seeding completed!${NC}"
echo -e "${GREEN}Test credentials:${NC}"
echo "  Admin: admin@staging.heypeter.com / staging123"
echo "  Teacher: teacher1@staging.heypeter.com / staging123"
echo "  Student: student1@staging.heypeter.com / staging123"