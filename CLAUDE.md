# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
# Start development server (local)
npm run dev

# Start development server (Docker)
npm run docker:dev

# Build for production
npm run build

# Start production server
npm run start

# Start production server (Docker)
npm run docker:prod
```

### Database Management
```bash
# Start local Supabase
supabase start

# Reset local database
supabase db reset

# Push migrations to remote
supabase db push --linked --password your-password

# Check database status
supabase status
```

### Testing
```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run a single test file
npm test -- path/to/test.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="should validate email"
```

### Code Quality
```bash
# Run ESLint
npm run lint

# TypeScript type checking
npx tsc --noEmit
```

### Docker Operations
```bash
# Start development environment
npm run docker:dev

# Start production environment
npm run docker:prod

# Stop all containers
npm run docker:stop

# View logs
npm run docker:logs

# Rebuild containers
npm run docker:build
```

## Architecture Overview

### Project Structure
The codebase is a Learning Management System (LMS) for "HeyPeter Academy" with the following architecture:

```
hey-peter/
├── src/                   # Application source code
│   ├── app/              # Next.js app directory for routing
│   ├── components/       # React components organized by feature
│   ├── lib/              # Core utilities (Supabase client, auth helpers, stores)
│   ├── hooks/            # Custom React hooks
│   └── types/            # TypeScript type definitions
├── supabase/             # Supabase configuration
│   ├── migrations/       # Database migration files
│   └── config.toml       # Supabase local config
├── scripts/              # Utility scripts
│   ├── docker-*.sh       # Docker management scripts
│   └── *.sql            # SQL utilities
├── docker/               # Docker configuration
│   ├── Dockerfile        # Production image
│   ├── Dockerfile.dev    # Development image
│   └── docker-compose.*  # Docker orchestration
└── public/               # Static assets
```

### Technology Stack
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui (built on Radix UI primitives)
- **Forms**: React Hook Form + Zod validation
- **State Management**: Zustand + React Query (TanStack Query)
- **Backend**: Supabase (Auth, Database, Storage, Realtime)
- **Testing**: Jest + React Testing Library

### Key Architectural Patterns

1. **Component Structure**: 
   - Components use shadcn/ui pattern with CVA for variants
   - Form components integrate React Hook Form with Zod schemas
   - Test files are co-located with components in `__tests__` directories

2. **Authentication Flow**:
   - Supabase Auth with Next.js middleware for route protection
   - Server-side auth checks using Supabase Auth Helpers
   - Role-based access control (student, teacher, admin)

3. **Database Architecture**:
   - Row Level Security (RLS) policies for data isolation
   - Comprehensive audit logging with triggers
   - Partitioned tables for performance (attendance, audit logs)
   - Junction tables for many-to-many relationships

4. **Form Handling**:
   - Dynamic form generator component for flexible form creation
   - Zod schemas for runtime validation
   - Integration with React Hook Form for state management

### Testing Strategy
- Unit tests for components using React Testing Library
- Mock Supabase client for testing auth flows
- Coverage thresholds: 80% for all metrics
- Test utilities in jest.setup.js for common mocks

### Important Features

1. **Student Management**:
   - Profile management with photo upload
   - Course enrollment and progress tracking
   - Leave management with approval workflow
   - Hour tracking with deduction rules

2. **Teacher Management**:
   - Availability scheduling
   - Class hour tracking and compensation
   - Performance analytics

3. **Class Scheduling**:
   - AI-powered automatic scheduling
   - 1-on-1 booking system
   - Group classes (max 9 students)
   - Online/offline support

4. **Course Types**:
   - Basic, Everyday A/B, Speak Up, Business English, 1-on-1
   - Different scheduling and booking rules per type

### Development Guidelines

1. **Path Aliases**: Use `@/` for imports from src directory
2. **Component Imports**: Prefer named exports from component index files
3. **Supabase Queries**: Use the singleton client from `@/lib/supabase`
4. **Form Validation**: Always use Zod schemas with React Hook Form
5. **Testing**: Write tests for all new components and utilities. Always test code before marking tasks as complete
6. **Type Safety**: Leverage generated types from Supabase for database operations
7. **Docker Development**: Use `npm run docker:dev` for isolated development environment
8. **Database Migrations**: Keep migrations in `supabase/migrations/` with timestamp prefix

### Git Commit Guidelines

1. **Commit Message Format**: Use conventional commit format with descriptive messages
2. **Feature Commits**: Group related changes by feature for easier review
3. **Claude Code Footer**: Include `🤖 Generated with [Claude Code](https://claude.ai/code)` in commit messages
4. **No Co-Author**: Do not include Co-Authored-By with Claude email addresses

### Environment Setup

1. **Create `.env.local`** with required variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://rgqcbsjucvpffyajrjrc.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   DATABASE_URL=postgresql://postgres:password@host:5432/postgres
   SUPABASE_DB_PASSWORD=your-password
   ```

2. **Database Setup**:
   - Local: `supabase start` (auto-applies migrations)
   - Remote: `supabase db push --linked --password your-password`

3. **Docker Setup**:
   - Development: `npm run docker:dev`
   - Production: `npm run docker:prod`
   - Logs: `npm run docker:logs`
   - Stop: `npm run docker:stop`

## Task Management

This project uses Task Master for task management. Key commands:

```bash
# View all tasks
task-master list

# Show next task to work on
task-master next

# View specific task details
task-master show <id>

# Update task status
task-master set-status --id=<id> --status=<status>

# Research current best practices
task-master research "<query>" --save-to=<task-id>
```

Task Master helps track development progress and manage complex features. Use it to:
- Break down PRD requirements into actionable tasks
- Track task dependencies and completion status
- Research implementation approaches with up-to-date information
- Maintain context across development sessions