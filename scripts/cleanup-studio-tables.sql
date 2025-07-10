-- Cleanup script to remove studio_ tables that don't belong to the LMS project
-- These tables are from MySakinah Studio project and should not be in the LMS database

-- Drop all studio_ tables
DROP TABLE IF EXISTS studio_analytics CASCADE;
DROP TABLE IF EXISTS studio_api_usage CASCADE;
DROP TABLE IF EXISTS studio_drive_assets CASCADE;
DROP TABLE IF EXISTS studio_generation_jobs CASCADE;
DROP TABLE IF EXISTS studio_templates CASCADE;
DROP TABLE IF EXISTS studio_user_preferences CASCADE;

-- Drop any related functions/triggers that might exist for studio tables
DROP FUNCTION IF EXISTS update_studio_analytics_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_studio_api_usage_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_studio_drive_assets_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_studio_generation_jobs_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_studio_templates_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_studio_user_preferences_updated_at() CASCADE;

-- Verify cleanup by listing remaining tables
SELECT 'Remaining tables after cleanup:' as message;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;