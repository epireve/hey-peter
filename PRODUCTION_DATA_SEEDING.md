# HeyPeter Academy Production Data Seeding Guide

This guide provides comprehensive instructions for seeding the HeyPeter Academy database with realistic dummy data for testing all implemented systems.

## Overview

The production data seeding creates a realistic testing environment with:

- **50+ students** with varied profiles and progress levels
- **10 teachers** with different specializations and availability patterns  
- **200+ classes** scheduled across different time slots and courses
- **Comprehensive booking history** with realistic attendance patterns
- **Hour transaction data** including purchases and deductions
- **Feedback and assessment records** for performance analysis
- **Learning materials** structured across all course types

## Quick Start

### Prerequisites

- Supabase CLI installed (`npm install -g supabase`)
- Project running locally (`supabase start`)
- Database reset capability for clean seeding

### Execute Seeding

```bash
# Make the script executable (if not already)
chmod +x scripts/run-production-seeding.sh

# Run the comprehensive seeding process
./scripts/run-production-seeding.sh
```

The script will:
1. ✅ Validate prerequisites
2. ⚠️ Request confirmation for data insertion
3. 💾 Create database backup information
4. 🌱 Execute the seeding SQL script
5. 🔍 Validate data integrity
6. 📊 Display summary statistics

## Test Account Information

### Admin Accounts
| Email | Password | Role | Description |
|-------|----------|------|-------------|
| admin@heypeter.com | admin123 | Super Admin | Full system access |
| operations@heypeter.com | ops123 | Operations Manager | Operational oversight |
| support@heypeter.com | support123 | Support Staff | Customer support |

### Teacher Accounts
| Email | Password | Specialization | Schedule Type |
|-------|----------|----------------|---------------|
| emily.teacher@heypeter.com | teacher123 | Basic, Everyday A/B | Full-time (9-17) |
| david.teacher@heypeter.com | teacher123 | Everyday A/B, Speak Up | Afternoon/Evening |
| maria.teacher@heypeter.com | teacher123 | Basic, Everyday A, Speak Up | Morning (8-16) |
| robert.business@heypeter.com | teacher123 | Business English, 1-on-1 | Business hours |
| anna.tutor@heypeter.com | teacher123 | 1-on-1, Basic, Everyday A | Flexible + weekends |
| *[...and 5 more teachers]* | teacher123 | Various specializations | Mixed schedules |

### Student Accounts
Students follow the pattern: `[firstname].[lastname]@student.example.com` with password `student123`

Examples:
- alex.anderson@student.example.com  
- sam.brown@student.example.com
- jordan.davis@student.example.com
- *[...and 47 more students]*

## Data Structure Overview

### Foundation Data (Phase 1)
- **Users & Authentication**: 65+ auth users across all roles
- **Course Structure**: 6 course types with realistic content
- **Schedule Templates**: 25+ recurring time slots

### Business Logic Data (Phase 2)  
- **Student Profiles**: Distributed across proficiency levels 1-10
- **Teacher Assignments**: Availability patterns covering all time zones
- **Class Scheduling**: 4 weeks of scheduled classes with capacity management

### Operational Data (Phase 3)
- **Booking History**: 6-12 months of realistic booking patterns
- **Hour Transactions**: Purchase and deduction history
- **Attendance Records**: 85% attendance rate with realistic no-show patterns

### Advanced Features Data (Phase 4)
- **Assessment & Progress**: Complete tracking for all active students  
- **Feedback & Analytics**: 80% feedback completion rate with ratings 3-5
- **System Events**: Automated notifications and system monitoring

## Testing Scenarios Enabled

### ✅ AI Scheduling System
- **Complex multi-student scheduling** with capacity constraints
- **Content-based class formation** using unlearned content analysis
- **Conflict detection and resolution** across time and resource conflicts
- **Manual override capabilities** with admin intervention tracking

### ✅ 1v1 Booking System  
- **Teacher auto-matching** based on 6-factor scoring algorithm
- **Duration selection** (30/60 minutes) with pricing
- **Learning goals specification** across all skill categories
- **Alternative recommendations** when preferred options unavailable

### ✅ Email Notification System
- **Queue processing** with priority handling and retry logic
- **Delivery verification** with realistic success rates (97.9%)
- **Notification triggers** for all scheduling and booking events
- **User preference management** with granular control

### ✅ Hour Management System
- **Automatic tracking** with real-time balance updates
- **Purchase history** with various package sizes and payment methods
- **Expiration handling** with advance warnings
- **Leave request workflow** with approval mechanisms

### ✅ Analytics & Performance
- **Student progress tracking** across all courses and skill levels
- **Teacher performance metrics** with ratings and utilization
- **System health monitoring** with infrastructure metrics
- **Business intelligence** with revenue and forecasting data

## Data Volume Summary

| Entity Type | Count | Description |
|-------------|-------|-------------|
| **Students** | 50 | Varied proficiency levels and course enrollments |
| **Teachers** | 10 | Mixed specializations and availability patterns |
| **Classes** | 200+ | 4 weeks of scheduled classes across all courses |
| **Bookings** | 800+ | Historical and future bookings with realistic patterns |
| **Materials** | 50+ | Learning content across all course structures |
| **Feedback** | 200+ | Student and teacher feedback with rating distribution |
| **Hour Transactions** | 150+ | Purchase, deduction, and refund history |
| **Schedules** | 25+ | Recurring time slot templates |

## Realistic Features

### Student Distribution
- **Beginners (30%)**: Basic/Everyday A courses, 1-3 proficiency
- **Intermediate (50%)**: Everyday B/Speak Up courses, 3-6 proficiency  
- **Advanced (20%)**: Business English/1-on-1 courses, 6-10 proficiency

### Teacher Specializations
- **Basic/Everyday instructors** (4 teachers): Foundation courses
- **Business English specialists** (2 teachers): Professional communication
- **1-on-1 tutors** (3 teachers): Personalized instruction
- **Part-time/Weekend teachers** (1 teacher): Flexible scheduling

### Financial Patterns
- **Hour balances**: 10-60 hours per student with realistic usage
- **Payment status**: 85% paid, 15% pending/overdue
- **Package purchases**: 10, 20, 30, 50-hour packages with timing patterns
- **Class costs**: 1 hour for group classes, 2 hours for 1-on-1 sessions

### Performance Metrics
- **Attendance rate**: 85% realistic with no-show patterns
- **Feedback completion**: 80% with positive bias (ratings 3-5)
- **Teacher ratings**: 4.4-4.9 average with performance distribution
- **System utilization**: 78.5% capacity usage across all classes

## Manual Seeding (Alternative)

If the automated script fails, you can manually execute:

```bash
# Reset database
supabase db reset

# Execute seeding script
psql "$(supabase status | grep 'DB URL' | awk '{print $3}')" -f scripts/seed-production-data.sql
```

## Data Validation

After seeding, verify the data integrity:

```sql
-- Check student distribution
SELECT test_level, COUNT(*) FROM students GROUP BY test_level ORDER BY test_level;

-- Check class capacity utilization  
SELECT AVG(current_enrollment), AVG(max_capacity) FROM classes;

-- Check hour balance distribution
SELECT 
  COUNT(*) FILTER (WHERE hour_balance < 5) as low_balance,
  COUNT(*) FILTER (WHERE hour_balance BETWEEN 5 AND 20) as medium_balance,
  COUNT(*) FILTER (WHERE hour_balance > 20) as high_balance
FROM students;

-- Check booking success rate
SELECT 
  attendance_status, 
  COUNT(*), 
  ROUND(COUNT(*)::NUMERIC / SUM(COUNT(*)) OVER () * 100, 2) as percentage
FROM bookings 
WHERE attendance_status IN ('present', 'absent')
GROUP BY attendance_status;
```

## Troubleshooting

### Common Issues

1. **Supabase not running**: Execute `supabase start` before seeding
2. **Permission errors**: Ensure database has proper RLS policies disabled for seeding
3. **Constraint violations**: Reset database completely before re-seeding
4. **Memory issues**: Increase database memory if seeding large datasets

### Clean Re-seeding

```bash
# Complete reset and re-seed
supabase db reset
./scripts/run-production-seeding.sh
```

### Selective Data Reset

```sql
-- Clear only transactional data (keep users/courses)
DELETE FROM feedback;
DELETE FROM hour_transactions;  
DELETE FROM bookings;
DELETE FROM attendance;
-- Then re-run specific sections of seeding script
```

## Security Notes

⚠️ **Important**: This seeding creates test accounts with default passwords. In production:

1. **Change all default passwords** immediately
2. **Enable Row Level Security** policies  
3. **Review user permissions** and access controls
4. **Monitor authentication** logs and activity
5. **Implement proper backup** procedures

## Next Steps

After successful seeding:

1. 🚀 **Start development server**: `npm run dev`
2. 🔐 **Test authentication** with seeded accounts
3. 📊 **Explore admin dashboard** for system overview
4. 📚 **Test 1v1 booking** with student accounts
5. 📧 **Verify email notifications** in service logs
6. 🤖 **Test AI scheduling** with various scenarios
7. 💰 **Validate hour management** workflows
8. 📈 **Review analytics** and performance metrics

The comprehensive seeding provides a production-like environment for thorough testing of all HeyPeter Academy systems! 🎉