# HeyPeter Academy LMS

A comprehensive Learning Management System (LMS) for HeyPeter Academy, specializing in English language education with support for multiple course types, student management, teacher scheduling, and class bookings.

## 🚀 Features

- **Multi-role Support**: Admin, Teacher, and Student portals
- **Course Management**: Basic, Everyday A/B, Speak Up, Business English, and 1-on-1 sessions
- **Smart Scheduling**: AI-powered automatic class scheduling
- **Hour Tracking**: Student hour management with automatic deduction
- **Attendance System**: Comprehensive attendance tracking with leave management
- **Teacher Dashboard**: Availability management, class tracking, and analytics
- **Real-time Updates**: Built on Supabase for real-time data synchronization
- **Responsive Design**: Mobile-friendly interface using Tailwind CSS

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **State Management**: Zustand + React Query
- **Forms**: React Hook Form + Zod validation
- **Testing**: Jest + React Testing Library
- **Deployment**: Docker + Docker Compose

## 📋 Prerequisites

- Node.js 20+ and npm/yarn/pnpm
- Docker Desktop (for containerized development)
- Supabase account and project

## 🚀 Quick Start

### Option 1: Docker Development (Recommended)

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/hey-peter.git
   cd hey-peter
   ```

2. **Set up environment variables**
   ```bash
   cp .env .env.local
   ```
   
   Update `.env.local` with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   DATABASE_URL=postgresql://postgres:password@host:5432/postgres
   SUPABASE_DB_PASSWORD=your-password
   ```

3. **Start the development environment**
   ```bash
   npm run docker:dev
   ```

4. **Access the application**
   - Application: http://localhost:3000
   - Supabase Studio: http://localhost:54323

### Option 2: Local Development

1. **Clone and install dependencies**
   ```bash
   git clone https://github.com/your-username/hey-peter.git
   cd hey-peter
   npm install
   ```

2. **Set up Supabase**
   ```bash
   # Install Supabase CLI (if not already installed)
   brew install supabase/tap/supabase

   # Start local Supabase
   supabase start

   # Link to your remote project
   supabase link --project-ref your-project-ref

   # Push database migrations
   supabase db push --linked --password your-db-password
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

## 🗄️ Database Setup

### Remote Database (Production)

1. **Get your database credentials from Supabase Dashboard**
   - Go to Settings → Database
   - Copy the connection string (URI format)
   - Copy the database password

2. **Run migrations**
   ```bash
   supabase db push --linked --password your-db-password
   ```

### Local Database (Development)

The local Supabase instance automatically applies migrations when started:

```bash
supabase start  # Migrations are applied automatically
```

To reset the local database:
```bash
supabase db reset
```

## 📁 Project Structure

```
hey-peter/
├── src/
│   ├── app/              # Next.js app router pages
│   │   ├── admin/        # Admin portal
│   │   ├── teacher/      # Teacher portal
│   │   ├── student/      # Student portal
│   │   └── auth/         # Authentication pages
│   ├── components/       # React components
│   │   ├── ui/          # shadcn/ui components
│   │   ├── admin/       # Admin-specific components
│   │   ├── teacher/     # Teacher-specific components
│   │   └── auth/        # Auth components
│   ├── lib/             # Utility functions and helpers
│   ├── hooks/           # Custom React hooks
│   └── types/           # TypeScript type definitions
├── supabase/
│   ├── migrations/      # Database migrations
│   └── config.toml      # Supabase configuration
├── scripts/             # Utility scripts
├── public/              # Static assets
└── docker/              # Docker configuration files
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- src/components/teacher/__tests__/TeacherDashboardLayout.test.tsx
```

## 🐳 Docker Commands

```bash
# Development
npm run docker:dev      # Start development environment
npm run docker:stop     # Stop all containers
npm run docker:logs     # View container logs
npm run docker:build    # Rebuild containers

# Production
npm run docker:prod     # Start production environment
```

## 📚 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run docker:dev` - Start Docker development environment
- `npm run docker:prod` - Start Docker production environment

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes (for migrations) |
| `SUPABASE_DB_PASSWORD` | Database password | Yes (for migrations) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Optional |

### Database Schema

The application uses 19 core tables:

- **User Management**: users, students, teachers
- **Course System**: courses, classes, schedules
- **Operations**: bookings, attendance, leave_requests
- **Resources**: materials, student_materials
- **Communication**: notifications, feedback
- **System**: audit_logs, user_sessions, system_events

## 🚢 Deployment

### Using Docker

1. Build the production image:
   ```bash
   docker build -t heypeter-academy .
   ```

2. Run with environment variables:
   ```bash
   docker run -p 3000:3000 \
     -e NEXT_PUBLIC_SUPABASE_URL=your-url \
     -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key \
     heypeter-academy
   ```

### Using Vercel/Netlify

1. Connect your GitHub repository
2. Set environment variables in the dashboard
3. Deploy

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for your changes
4. Ensure all tests pass (`npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📝 License

This project is proprietary software for HeyPeter Academy.

## 🆘 Support

For support, email support@heypeter.academy or join our Slack channel.

## 🔗 Links

- [Documentation](./CLAUDE.md)
- [Docker Setup](./DOCKER.md)
- [API Documentation](./docs/api.md)
- [Supabase Dashboard](https://supabase.com/dashboard/project/rgqcbsjucvpffyajrjrc)