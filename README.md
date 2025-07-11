# HeyPeter Academy LMS

<div align="center">
  <img src="public/logo.png" alt="HeyPeter Academy Logo" width="200" />
  <h3>A Modern Learning Management System for English Language Education</h3>
  <p>
    <a href="#-overview">Overview</a> •
    <a href="#-features">Features</a> •
    <a href="#-quick-start">Quick Start</a> •
    <a href="#-documentation">Documentation</a> •
    <a href="#-contributing">Contributing</a> •
    <a href="#-support--contact">Support</a>
  </p>
  <p>
    <img src="https://img.shields.io/badge/Next.js-14-black" alt="Next.js 14" />
    <img src="https://img.shields.io/badge/TypeScript-5.0-blue" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Supabase-2.0-green" alt="Supabase" />
    <img src="https://img.shields.io/badge/License-Proprietary-red" alt="License" />
  </p>
</div>

## 📑 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Technology Stack](#%EF%B8%8F-technology-stack)
- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [Testing](#-testing)
- [Available Scripts](#-available-scripts)
- [Configuration](#-configuration)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)
- [Support & Contact](#-support--contact)
- [Documentation](#-documentation)
- [Acknowledgments](#-acknowledgments)

## 📌 Overview

HeyPeter Academy LMS is a comprehensive learning management system designed specifically for English language education. Built with modern web technologies, it provides a seamless experience for students, teachers, and administrators to manage courses, schedules, and learning progress.

### 🎯 Key Highlights

- **Enterprise-grade architecture** with scalable infrastructure
- **Real-time collaboration** powered by Supabase
- **AI-powered scheduling** for optimal class arrangements
- **Comprehensive analytics** for tracking student progress and teacher performance
- **Mobile-first design** ensuring accessibility across all devices
- **Robust security** with role-based access control and data encryption

## 🚀 Features

### For Students
- **Personal Dashboard**: Track course progress, upcoming classes, and assignments
- **Hour Management**: Monitor available hours and automatic deductions
- **Class Booking**: Easy booking for 1-on-1 and group sessions
- **Leave Management**: Request and track leave applications
- **Learning Materials**: Access course materials and resources
- **Performance Analytics**: View progress reports and achievements

### For Teachers
- **Availability Management**: Set and update teaching schedules
- **Class Management**: View assigned classes and student rosters
- **Attendance Tracking**: Mark attendance and manage class records
- **Performance Dashboard**: Track teaching hours and compensation
- **Student Progress**: Monitor individual student performance
- **Material Distribution**: Share learning resources with students

### For Administrators
- **User Management**: Create and manage student/teacher accounts
- **Course Administration**: Configure courses and class schedules
- **Analytics Dashboard**: Comprehensive insights into academy performance
- **Financial Tracking**: Monitor revenue, expenses, and teacher compensation
- **System Configuration**: Manage academy-wide settings and policies
- **Audit Logs**: Track all system activities for compliance

## 🛠️ Technology Stack

### Frontend
- **Framework**: [Next.js 14](https://nextjs.org/) with App Router
- **Language**: [TypeScript](https://www.typescriptlang.org/) for type safety
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) for utility-first styling
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) built on Radix UI
- **Forms**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) validation
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/) + [TanStack Query](https://tanstack.com/query)

### Backend & Infrastructure
- **Backend**: [Supabase](https://supabase.com/) (PostgreSQL, Auth, Realtime, Storage)
- **Authentication**: Supabase Auth with JWT tokens
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Real-time**: WebSocket connections for live updates
- **File Storage**: Supabase Storage for documents and images
- **Containerization**: Docker & Docker Compose

### Development & Testing
- **Testing**: [Jest](https://jestjs.io/) + [React Testing Library](https://testing-library.com/react)
- **Code Quality**: ESLint, Prettier, TypeScript strict mode
- **CI/CD**: GitHub Actions for automated testing and deployment
- **Documentation**: Comprehensive inline documentation and README files

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 20.0 or higher ([Download](https://nodejs.org/))
- **npm** (comes with Node.js) or **pnpm** for faster installs
- **Docker Desktop** ([Download](https://www.docker.com/products/docker-desktop/))
- **Git** for version control ([Download](https://git-scm.com/))
- **Supabase CLI** (optional, for local development)

You'll also need:
- A **Supabase account** ([Sign up free](https://supabase.com))
- A **GitHub account** for repository access

## 🚀 Quick Start

### Option 1: Docker Development (Recommended)

Docker provides a consistent development environment with all dependencies pre-configured.

1. **Clone the repository**
   ```bash
   git clone https://github.com/heypeter/lms.git
   cd hey-peter
   ```

2. **Set up environment variables**
   ```bash
   # Copy the example environment file
   cp .env.example .env.local
   
   # Edit .env.local with your Supabase credentials
   nano .env.local
   ```

3. **Start the development environment**
   ```bash
   # Install dependencies first
   npm install
   
   # Start Docker containers
   npm run docker:dev
   ```

4. **Access the application**
   - 🌐 **Application**: http://localhost:3000
   - 🗄️ **Supabase Studio**: http://localhost:54323
   - 📧 **Email Testing**: http://localhost:54324
   
5. **Default credentials** (local development)
   - Admin: `admin@heypeter.academy` / `admin123`
   - Teacher: `teacher@heypeter.academy` / `teacher123`
   - Student: `student@heypeter.academy` / `student123`

### Option 2: Local Development

For developers who prefer to run services natively:

1. **Clone and install dependencies**
   ```bash
   git clone https://github.com/heypeter/lms.git
   cd hey-peter
   npm install
   ```

2. **Install and configure Supabase CLI**
   ```bash
   # macOS
   brew install supabase/tap/supabase
   
   # Windows (using scoop)
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase
   
   # Linux
   wget -qO- https://github.com/supabase/cli/releases/download/v1.123.4/supabase_linux_amd64.tar.gz | tar xvz
   ```

3. **Start local Supabase**
   ```bash
   # Initialize Supabase (first time only)
   supabase init
   
   # Start local Supabase services
   supabase start
   ```

4. **Configure environment**
   ```bash
   # Copy example environment file
   cp .env.example .env.local
   
   # The local Supabase URLs will be:
   # NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
   # NEXT_PUBLIC_SUPABASE_ANON_KEY=<shown in supabase start output>
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   - 🌐 **Application**: http://localhost:3000
   - 🗄️ **Supabase Studio**: http://localhost:54323

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
├── src/                      # Source code
│   ├── app/                  # Next.js 14 App Router
│   │   ├── (auth)/          # Authentication routes
│   │   ├── admin/           # Admin portal pages
│   │   ├── teacher/         # Teacher portal pages
│   │   ├── student/         # Student portal pages
│   │   └── api/             # API routes
│   ├── components/          # React components
│   │   ├── ui/              # Base UI components (shadcn/ui)
│   │   ├── admin/           # Admin-specific components
│   │   ├── teacher/         # Teacher-specific components
│   │   ├── student/         # Student-specific components
│   │   ├── auth/            # Authentication components
│   │   └── shared/          # Shared components
│   ├── lib/                 # Core utilities
│   │   ├── supabase/        # Supabase client and helpers
│   │   ├── services/        # Business logic services
│   │   ├── stores/          # Zustand state stores
│   │   └── utils/           # Utility functions
│   ├── hooks/               # Custom React hooks
│   ├── types/               # TypeScript type definitions
│   └── styles/              # Global styles
├── supabase/                # Supabase configuration
│   ├── migrations/          # Database migrations
│   ├── functions/           # Edge functions
│   ├── seed.sql            # Database seed data
│   └── config.toml         # Local config
├── docker/                  # Docker configurations
│   ├── Dockerfile          # Production image
│   ├── Dockerfile.dev      # Development image
│   └── docker-compose.*    # Compose files
├── scripts/                 # Utility scripts
│   ├── docker-*.sh         # Docker helpers
│   └── seed-*.sql          # Data seeding
├── tests/                   # Test configurations
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── e2e/                # End-to-end tests
├── docs/                    # Documentation
└── public/                  # Static assets
```

## 🧪 Testing

Our comprehensive testing strategy ensures code quality and reliability:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run specific test file
npm test -- src/components/teacher/__tests__/TeacherDashboardLayout.test.tsx

# Run tests matching a pattern
npm test -- --testNamePattern="should validate email"

# Run tests for a specific component
npm test -- --testPathPattern=StudentForm
```

### Testing Guidelines
- **Unit Tests**: For components, hooks, and utilities
- **Integration Tests**: For API routes and service layers
- **E2E Tests**: For critical user journeys
- **Coverage Targets**: Minimum 80% for all metrics

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

### Development
```bash
npm run dev              # Start Next.js development server (port 3000)
npm run docker:dev       # Start full development stack in Docker
npm run lint             # Run ESLint to check code quality
npm run lint:fix         # Auto-fix linting issues
npm run type-check       # Run TypeScript compiler checks
```

### Building & Production
```bash
npm run build            # Build production-optimized bundle
npm run start            # Start production server
npm run docker:prod      # Run production stack in Docker
npm run analyze          # Analyze bundle size
```

### Database Management
```bash
supabase start           # Start local Supabase instance
supabase stop            # Stop local Supabase instance
supabase db reset        # Reset local database
supabase db push         # Push migrations to remote
supabase migration new   # Create new migration
```

### Testing
```bash
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
npm run test:ui          # Run tests with UI
```

### Docker Operations
```bash
npm run docker:dev       # Start development environment
npm run docker:prod      # Start production environment
npm run docker:build     # Build Docker images
npm run docker:stop      # Stop all containers
npm run docker:logs      # View container logs
npm run docker:clean     # Remove containers and volumes
```

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Database Configuration (Required for migrations)
DATABASE_URL=postgresql://postgres:password@localhost:54322/postgres
SUPABASE_DB_PASSWORD=your-db-password

# Optional Configuration
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_NAME="HeyPeter Academy"

# Email Configuration (Optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
```

### Database Schema

Our database architecture consists of 19 core tables organized into logical domains:

#### User Management
- **users**: Core user accounts with authentication
- **students**: Student profiles with enrollment details
- **teachers**: Teacher profiles with availability settings

#### Course Management
- **courses**: Course definitions (Basic, Everyday, Speak Up, etc.)
- **classes**: Scheduled class instances
- **schedules**: Recurring class schedules
- **bookings**: Student class registrations

#### Academic Operations
- **attendance**: Class attendance records
- **leave_requests**: Student leave applications
- **student_hours**: Hour tracking and management
- **hour_transactions**: Hour deduction/addition logs

#### Learning Resources
- **materials**: Course materials and resources
- **student_materials**: Material access tracking
- **assignments**: Homework and assessments

#### System & Analytics
- **notifications**: System notifications
- **feedback**: Student/teacher feedback
- **audit_logs**: Comprehensive activity logging
- **user_sessions**: Session management
- **system_events**: System-wide event tracking

## 🚢 Deployment

### Production Deployment with Docker

1. **Build the production image**:
   ```bash
   docker build -f docker/Dockerfile -t heypeter-academy:latest .
   ```

2. **Run with Docker Compose** (recommended):
   ```bash
   # Copy production environment file
   cp .env.production .env.local
   
   # Start production stack
   docker-compose -f docker/docker-compose.prod.yml up -d
   ```

3. **Or run standalone**:
   ```bash
   docker run -d \
     --name heypeter-academy \
     -p 3000:3000 \
     --env-file .env.local \
     --restart unless-stopped \
     heypeter-academy:latest
   ```

### Cloud Deployment Options

#### Vercel (Recommended for Next.js)
1. Fork this repository
2. Import project in [Vercel Dashboard](https://vercel.com/new)
3. Configure environment variables
4. Deploy with automatic CI/CD

#### Railway
1. Connect GitHub repository
2. Add PostgreSQL database
3. Configure environment variables
4. Deploy with one click

#### DigitalOcean App Platform
1. Create new app from GitHub
2. Add managed PostgreSQL database
3. Configure environment variables
4. Deploy with automatic scaling

### Production Checklist

- [ ] Set strong database passwords
- [ ] Configure custom domain and SSL
- [ ] Set up monitoring and alerts
- [ ] Configure backup strategy
- [ ] Review security settings
- [ ] Set up error tracking (Sentry)
- [ ] Configure rate limiting
- [ ] Enable CORS for your domain

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Development Process

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/hey-peter.git
   cd hey-peter
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Write clean, documented code
   - Follow existing code style and conventions
   - Add tests for new functionality
   - Update documentation as needed

4. **Test thoroughly**
   ```bash
   npm test
   npm run lint
   npm run type-check
   ```

5. **Commit with conventional commits**
   ```bash
   git commit -m "feat: add new student analytics dashboard"
   ```

6. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### Contribution Guidelines

- **Code Style**: Follow our ESLint and Prettier configurations
- **Testing**: Maintain or improve test coverage
- **Documentation**: Update README and inline comments
- **Commits**: Use [Conventional Commits](https://www.conventionalcommits.org/)
- **Pull Requests**: Provide clear description and screenshots

### Areas for Contribution

- 🐛 Bug fixes and issue resolution
- ✨ New features and enhancements
- 📚 Documentation improvements
- 🧪 Test coverage expansion
- 🎨 UI/UX improvements
- ⚡ Performance optimizations

## 📄 License

This project is proprietary software owned by HeyPeter Academy. All rights reserved.

For licensing inquiries, please contact: legal@heypeter.academy

## 📞 Support & Contact

### Getting Help

- 📧 **Email**: support@heypeter.academy
- 💬 **Discord**: [Join our community](https://discord.gg/heypeter)
- 🐛 **Issues**: [GitHub Issues](https://github.com/heypeter/lms/issues)
- 📖 **Wiki**: [Project Wiki](https://github.com/heypeter/lms/wiki)

### Commercial Support

For enterprise support and custom development:
- 📧 **Email**: enterprise@heypeter.academy
- 📞 **Phone**: +1 (555) 123-4567

## 📚 Documentation

- 📖 [Developer Guide](./CLAUDE.md) - Detailed development instructions
- 🐳 [Docker Guide](./DOCKER.md) - Container deployment guide
- 🔌 [API Reference](./docs/api.md) - REST API documentation
- 🏗️ [Architecture](./docs/architecture.md) - System design overview
- 🔒 [Security](./docs/security.md) - Security best practices

## 🌟 Acknowledgments

Built with amazing open-source technologies:

- [Next.js](https://nextjs.org/) - The React framework
- [Supabase](https://supabase.com/) - Open source Firebase alternative
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful component library
- [React Hook Form](https://react-hook-form.com/) - Performant forms
- [Zustand](https://zustand-demo.pmnd.rs/) - State management

---

<div align="center">
  <p>Made with ❤️ by the HeyPeter Academy Team</p>
  <p>
    <a href="https://heypeter.academy">Website</a> •
    <a href="https://blog.heypeter.academy">Blog</a> •
    <a href="https://twitter.com/heypeteracademy">Twitter</a>
  </p>
</div>