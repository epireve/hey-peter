# HeyPeter Academy Test Credentials

## 🚀 Quick Start

The development server is running at: **http://localhost:3001**

## 🔐 Test Account Credentials

### Admin Accounts
| Email | Password | Description |
|-------|----------|-------------|
| **admin@heypeter.com** | admin123 | Super Admin - Full system access |
| operations@heypeter.com | ops123 | Operations Manager |
| support@heypeter.com | support123 | Support Staff |

### Teacher Accounts
| Email | Password | Specialization |
|-------|----------|----------------|
| **emily.teacher@heypeter.com** | teacher123 | Basic & Everyday courses |
| david.teacher@heypeter.com | teacher123 | Conversation specialist |
| maria.teacher@heypeter.com | teacher123 | Beginner specialist |
| james.teacher@heypeter.com | teacher123 | Mixed-level groups |
| robert.business@heypeter.com | teacher123 | Business English |

### Student Accounts (Sample)
| Email | Password | Level |
|-------|----------|-------|
| **alex.anderson@student.example.com** | student123 | Varied |
| sam.brown@student.example.com | student123 | Varied |
| jordan.davis@student.example.com | student123 | Varied |

*Note: 25 total students available with emails following pattern: firstname.lastname@student.example.com*

## 📊 Seeded Data Summary

- **33** Total Users (3 admins, 5 teachers, 25 students)
- **12** Courses across all types
- **9** Learning materials
- **3** Scheduled classes
- **10** Student bookings
- **5** Feedback records (4.0/5.0 average)

## 🧪 Testing Workflows

### 1. Admin Dashboard
1. Login with `admin@heypeter.com`
2. Access full system management
3. View analytics and reports
4. Manage students and teachers

### 2. Teacher Portal
1. Login with `emily.teacher@heypeter.com`
2. View assigned classes
3. Track student progress
4. Submit feedback

### 3. Student Experience
1. Login with `alex.anderson@student.example.com`
2. Book classes
3. View learning materials
4. Track progress

## 🐛 Fixes Applied

✅ **Dropdown Click Issue Fixed**
- Changed cursor styling from `cursor-default` to `cursor-pointer`
- Increased z-index for dropdown content
- Applied to both DropdownMenu and Select components

## 🔧 Development Commands

```bash
# Start dev server
npm run dev

# Reset and reseed database
supabase db reset
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f scripts/seed-production-data-final.sql
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f scripts/add-classes.sql
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -f scripts/setup-auth-users.sql

# View logs
npm run docker:logs
```

## 📝 Notes

- All passwords are for testing only
- The application uses Supabase Auth for authentication
- Row Level Security (RLS) policies are enforced
- Different user roles have different access levels