# Installation Guide for HeyPeter Academy LMS

This guide provides detailed installation instructions for setting up the HeyPeter Academy LMS in various environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start with Docker](#quick-start-with-docker)
3. [Local Development Setup](#local-development-setup)
4. [Database Configuration](#database-configuration)
5. [Environment Variables](#environment-variables)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20.x or higher
- **npm** 10.x or higher (comes with Node.js)
- **Git** for version control
- **Docker Desktop** (for Docker setup)
- **Supabase CLI** (for database management)

### Installing Prerequisites

#### macOS

```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node@20

# Install Supabase CLI
brew install supabase/tap/supabase

# Install Docker Desktop
# Download from: https://www.docker.com/products/docker-desktop
```

#### Windows

```bash
# Install Node.js
# Download from: https://nodejs.org/

# Install Supabase CLI
# Download from: https://github.com/supabase/cli/releases

# Install Docker Desktop
# Download from: https://www.docker.com/products/docker-desktop
```

#### Linux (Ubuntu/Debian)

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Supabase CLI
wget -qO- https://github.com/supabase/cli/releases/download/v1.142.2/supabase_linux_amd64.tar.gz | tar xvz
sudo mv supabase /usr/local/bin/

# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
```

## Quick Start with Docker

The fastest way to get started is using Docker, which provides a fully isolated environment.

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/hey-peter.git
cd hey-peter
```

### 2. Set Up Environment Variables

```bash
# Copy the example environment file
cp .env .env.local

# Edit .env.local with your Supabase credentials
nano .env.local  # or use your preferred editor
```

Required environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://rgqcbsjucvpffyajrjrc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
DATABASE_URL=postgresql://postgres.rgqcbsjucvpffyajrjrc:your-password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
SUPABASE_DB_PASSWORD=your-password-here
```

### 3. Start the Development Environment

```bash
# Start all services with Docker
npm run docker:dev

# The application will be available at:
# - App: http://localhost:3000
# - Supabase Studio: http://localhost:54323
```

### 4. Stop the Environment

```bash
npm run docker:stop
```

## Local Development Setup

If you prefer to run the application without Docker:

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/your-org/hey-peter.git
cd hey-peter

# Install dependencies
npm install
```

### 2. Start Local Supabase

```bash
# Start Supabase services
supabase start

# This will output connection details:
# API URL: http://127.0.0.1:54321
# DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
# Studio URL: http://127.0.0.1:54323
```

### 3. Link to Remote Supabase (Optional)

If you want to connect to your remote Supabase project:

```bash
# Link to your project
supabase link --project-ref rgqcbsjucvpffyajrjrc

# Push migrations to remote
supabase db push --linked --password your-password
```

### 4. Run the Development Server

```bash
npm run dev

# Application will be available at http://localhost:3000
```

## Database Configuration

### Setting Up the Database Schema

#### For Local Development

The local Supabase automatically applies migrations when started:

```bash
supabase start  # Migrations are applied automatically
```

To reset the local database:

```bash
supabase db reset
```

#### For Remote Database

1. **Get your database password** from Supabase Dashboard:
   - Go to: https://supabase.com/dashboard/project/rgqcbsjucvpffyajrjrc/settings/database
   - Copy the database password

2. **Push migrations**:
   ```bash
   supabase db push --linked --password your-password
   ```

### Verifying Database Setup

Check that all tables are created:

```sql
-- Run this query in Supabase SQL Editor
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see 19 tables:
- attendance, audit_logs, bookings, class_schedules, classes
- courses, feedback, leave_requests, materials, notifications
- schedules, student_courses, student_materials, students
- system_events, teachers, user_roles, user_sessions, users

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://rgqcbsjucvpffyajrjrc.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anonymous key | `eyJhbGc...` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:pass@host:5432/postgres` |
| `SUPABASE_DB_PASSWORD` | Database password | `your-secure-password` |

### Getting Your Credentials

1. **Supabase URL and Anon Key**:
   - Go to: Settings → API
   - Copy the Project URL and anon/public key

2. **Database URL and Password**:
   - Go to: Settings → Database
   - Find "Connection string" → URI tab
   - Copy the connection string
   - The password is shown separately

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

#### Docker Issues

```bash
# Clean up Docker resources
docker system prune -a

# Rebuild containers
npm run docker:build
```

#### Database Connection Issues

1. Verify your DATABASE_URL is correct
2. Check if Supabase services are running
3. Ensure your password doesn't contain special characters that need escaping

#### Migration Errors

```bash
# Reset local database
supabase db reset

# Check migration status
supabase migration list
```

### Getting Help

If you encounter issues:

1. Check the [troubleshooting guide](./TROUBLESHOOTING.md)
2. Review [common issues](https://github.com/your-org/hey-peter/issues)
3. Contact support at support@heypeter.academy

## Next Steps

After successful installation:

1. **Create an admin user**:
   - Sign up at http://localhost:3000/auth/signup
   - Verify your email
   - Update user role to 'admin' in Supabase

2. **Explore the application**:
   - Admin Portal: http://localhost:3000/admin
   - Teacher Portal: http://localhost:3000/teacher
   - Student Portal: http://localhost:3000/student

3. **Run tests**:
   ```bash
   npm test
   ```

4. **Check the documentation**:
   - [Architecture Overview](./CLAUDE.md)
   - [Docker Setup](./DOCKER.md)
   - [Development Guide](./DEVELOPMENT.md)