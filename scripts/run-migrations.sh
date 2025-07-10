#!/bin/bash

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL not found in .env.local"
    echo "Please add your database connection string to .env.local"
    exit 1
fi

echo "Running migrations..."

# Run migrations in order
psql "$DATABASE_URL" -f supabase/migrations/20250628000000_lms_core_schema.sql
if [ $? -eq 0 ]; then
    echo "✓ Core schema created successfully"
else
    echo "✗ Failed to create core schema"
    exit 1
fi

psql "$DATABASE_URL" -f supabase/migrations/20250628000001_lms_rls_policies.sql
if [ $? -eq 0 ]; then
    echo "✓ RLS policies applied successfully"
else
    echo "✗ Failed to apply RLS policies"
    exit 1
fi

psql "$DATABASE_URL" -f supabase/migrations/20250628000002_lms_views_functions.sql
if [ $? -eq 0 ]; then
    echo "✓ Views and functions created successfully"
else
    echo "✗ Failed to create views and functions"
    exit 1
fi

psql "$DATABASE_URL" -f supabase/migrations/20250629000000_studio_schema.sql
if [ $? -eq 0 ]; then
    echo "✓ Studio schema created successfully"
else
    echo "✗ Failed to create studio schema"
    exit 1
fi

echo "All migrations completed successfully!"