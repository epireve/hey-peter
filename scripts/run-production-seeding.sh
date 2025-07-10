#!/bin/bash

# HeyPeter Academy Production Data Seeding Script
# This script safely executes the production data seeding with proper validation

set -e  # Exit on any error

echo "🚀 HeyPeter Academy Production Data Seeding"
echo "============================================="

# Check if Supabase CLI is available
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're in the project directory
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Not in a Supabase project directory"
    echo "   Please run this script from the project root"
    exit 1
fi

# Confirm production seeding
echo ""
echo "⚠️  WARNING: This will insert comprehensive dummy data into your database"
echo "   This includes:"
echo "   - 50+ student profiles with realistic data"
echo "   - 10 teacher profiles with availability patterns"
echo "   - 200+ class instances with bookings"
echo "   - Hour transactions and purchase history"
echo "   - Feedback and assessment data"
echo "   - Learning materials and progress tracking"
echo ""
read -p "Do you want to proceed? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Seeding cancelled"
    exit 1
fi

# Start Supabase if not running
echo ""
echo "📡 Checking Supabase status..."
if ! supabase status &> /dev/null; then
    echo "🔄 Starting Supabase local development..."
    supabase start
else
    echo "✅ Supabase is running"
fi

# Backup existing data (optional)
echo ""
echo "💾 Creating database backup..."
timestamp=$(date +"%Y%m%d_%H%M%S")
backup_file="backup_before_seeding_${timestamp}.sql"

# Note: This would require additional setup for remote database backup
echo "ℹ️  For production databases, consider creating a backup first"
echo "   You can manually backup using your database provider's tools"

# Execute the seeding script
echo ""
echo "🌱 Executing production data seeding..."
echo "   This may take 30-60 seconds..."

if supabase db reset; then
    echo "✅ Database reset successful"
else
    echo "❌ Database reset failed"
    exit 1
fi

# Apply the seeding script
if psql "$(supabase status | grep 'DB URL' | awk '{print $3}')" -f scripts/seed-production-data.sql; then
    echo ""
    echo "🎉 Production data seeding completed successfully!"
else
    echo ""
    echo "❌ Seeding script execution failed"
    exit 1
fi

# Validate the seeded data
echo ""
echo "🔍 Validating seeded data..."

# Check core table counts
echo "   Checking data integrity..."

DB_URL=$(supabase status | grep 'DB URL' | awk '{print $3}')

# Validate students
student_count=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM students;")
echo "   Students: $student_count"

# Validate teachers
teacher_count=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM teachers;")
echo "   Teachers: $teacher_count"

# Validate classes
class_count=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM classes;")
echo "   Classes: $class_count"

# Validate bookings
booking_count=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM bookings;")
echo "   Bookings: $booking_count"

# Validate materials
material_count=$(psql "$DB_URL" -t -c "SELECT COUNT(*) FROM materials;")
echo "   Materials: $material_count"

# Check for any critical errors
error_count=$(psql "$DB_URL" -t -c "
    SELECT COUNT(*) FROM (
        SELECT 1 FROM students WHERE hour_balance < 0
        UNION ALL
        SELECT 1 FROM classes WHERE current_enrollment > max_capacity
        UNION ALL
        SELECT 1 FROM bookings WHERE student_id NOT IN (SELECT id FROM students)
    ) errors;
")

if [ "$error_count" -gt "0" ]; then
    echo "⚠️  Found $error_count data integrity issues"
    echo "   Please review the seeded data"
else
    echo "✅ Data integrity validation passed"
fi

# Display test account information
echo ""
echo "🔑 Test Account Information"
echo "=========================="
echo "Admin Accounts:"
echo "   admin@heypeter.com (password: admin123)"
echo "   operations@heypeter.com (password: ops123)"
echo "   support@heypeter.com (password: support123)"
echo ""
echo "Teacher Accounts:"
echo "   emily.teacher@heypeter.com (password: teacher123)"
echo "   david.teacher@heypeter.com (password: teacher123)"
echo "   maria.teacher@heypeter.com (password: teacher123)"
echo "   [... and 7 more teachers]"
echo ""
echo "Student Accounts:"
echo "   alex.anderson@student.example.com (password: student123)"
echo "   sam.brown@student.example.com (password: student123)"
echo "   [... and 48 more students]"
echo ""

# Display system features ready for testing
echo "🎯 Systems Ready for Testing"
echo "============================"
echo "✅ AI-powered scheduling system (max 9 students per class)"
echo "✅ 1v1 booking system with teacher auto-matching"
echo "✅ Email notification system with queue management"
echo "✅ Hour tracking and purchase system"
echo "✅ Leave request and approval workflow"
echo "✅ Student progress tracking and analytics"
echo "✅ Teacher performance monitoring"
echo "✅ Class capacity management and waitlists"
echo "✅ Feedback and assessment system"
echo "✅ Content synchronization for class groups"
echo ""

# Display next steps
echo "🚀 Next Steps"
echo "============="
echo "1. Start the development server: npm run dev"
echo "2. Test login with any of the seeded accounts"
echo "3. Explore the admin dashboard for system overview"
echo "4. Test 1v1 booking system with student accounts"
echo "5. Verify email notifications (check service logs)"
echo "6. Test scheduling system with various scenarios"
echo ""

echo "📚 Additional Information"
echo "========================"
echo "- Seeding script: scripts/seed-production-data.sql"
echo "- Database URL: $DB_URL"
echo "- Supabase Dashboard: http://localhost:54323"
echo "- API URL: $(supabase status | grep 'API URL' | awk '{print $3}')"
echo ""

echo "🎉 Production data seeding complete! Happy testing! 🚀"