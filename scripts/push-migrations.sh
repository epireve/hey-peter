#!/bin/bash

# Check if DATABASE_URL is provided as an argument or in .env.local
if [ -n "$1" ]; then
    DATABASE_URL="$1"
elif [ -f .env.local ]; then
    source .env.local
fi

if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL not provided"
    echo ""
    echo "Usage: ./scripts/push-migrations.sh 'postgresql://postgres:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'"
    echo ""
    echo "Or add DATABASE_URL to your .env.local file"
    echo ""
    echo "To get your DATABASE_URL:"
    echo "1. Go to https://supabase.com/dashboard/project/rgqcbsjucvpffyajrjrc/settings/database"
    echo "2. Find 'Connection string' section"
    echo "3. Switch to 'URI' tab"
    echo "4. Copy the connection string"
    exit 1
fi

echo "Pushing migrations to remote database..."

# Use supabase db push with the database URL
supabase db push --db-url "$DATABASE_URL"

if [ $? -eq 0 ]; then
    echo "✅ Migrations pushed successfully!"
else
    echo "❌ Failed to push migrations"
    exit 1
fi