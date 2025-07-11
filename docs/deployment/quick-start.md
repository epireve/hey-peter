# Quick Start Guide - HeyPeter Academy LMS

This guide will help you get HeyPeter Academy LMS up and running quickly for development or testing purposes.

## 🎯 5-Minute Setup

### Prerequisites Check

```bash
# Check Node.js version (18+ required)
node --version

# Check npm/pnpm
npm --version

# Check Docker (optional)
docker --version

# Check Git
git --version
```

### Step 1: Clone and Setup

```bash
# Clone the repository
git clone https://github.com/your-org/hey-peter.git
cd hey-peter

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

### Step 2: Configure Supabase

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note your project URL and anon key

2. **Update `.env.local`**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

### Step 3: Initialize Database

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Push database schema
supabase db push
```

### Step 4: Start Development Server

```bash
# Start the application
npm run dev

# Open in browser
open http://localhost:3000
```

## 🐳 Docker Quick Start

### Using Docker Compose

```bash
# Start all services
npm run docker:dev

# View logs
npm run docker:logs

# Stop services
npm run docker:stop
```

### Docker Environment Variables

Create `.env.docker`:
```bash
# Copy from .env.local
cp .env.local .env.docker

# Update database URL for Docker
DATABASE_URL=postgresql://postgres:password@db:5432/postgres
```

## 🚀 Quick Deploy to Cloud

### Deploy to Vercel (Easiest)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Set Environment Variables**
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   ```

### Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

### Deploy to Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)

## 🧪 Quick Testing

### Run Tests

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

### Test Database Connection

```bash
# Test Supabase connection
npx supabase status

# Test with curl
curl http://localhost:3000/api/health
```

## 📱 Quick Mobile Testing

### Using ngrok

```bash
# Install ngrok
npm install -g ngrok

# Start local server
npm run dev

# Expose to internet
ngrok http 3000
```

### Using Local Network

```bash
# Find your IP
ifconfig | grep inet

# Start server on all interfaces
HOST=0.0.0.0 npm run dev

# Access from mobile
# http://your-ip:3000
```

## 🔧 Quick Fixes

### Common Issues

#### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

#### Database Connection Failed
```bash
# Check Supabase status
supabase status

# Restart Supabase
supabase stop
supabase start
```

#### Module Not Found
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 🎮 Quick Commands Reference

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm run start           # Start production server

# Database
supabase start          # Start local Supabase
supabase db reset       # Reset database
supabase db push        # Push migrations

# Docker
npm run docker:dev      # Start with Docker
npm run docker:logs     # View logs
npm run docker:stop     # Stop containers

# Testing
npm test                # Run tests
npm run lint            # Run linter
npm run type-check      # Check types
```

## 🔐 Quick Security Setup

### Generate Secrets

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate API keys
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Basic Security Headers

Already configured in `next.config.mjs`:
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy
- Permissions-Policy

## 📊 Quick Monitoring

### Enable Basic Monitoring

1. **Vercel Analytics** (if using Vercel)
   ```bash
   npm install @vercel/analytics
   ```

2. **Custom Analytics**
   ```javascript
   // In _app.tsx
   import { Analytics } from '@vercel/analytics/react';
   
   <Analytics />
   ```

3. **Health Endpoint**
   ```bash
   curl http://localhost:3000/api/health
   ```

## 🎯 Next Steps

1. **Customize Configuration**
   - Update `next.config.mjs`
   - Configure authentication providers
   - Set up email service

2. **Add Sample Data**
   ```bash
   npm run seed:dev
   ```

3. **Deploy to Staging**
   ```bash
   ./deployment/scripts/deploy-staging.sh
   ```

4. **Read Full Documentation**
   - [Environment Configuration](environment-configuration.md)
   - [Production Deployment](production-deployment.md)
   - [Docker Deployment](docker-deployment.md)

## 🆘 Getting Help

- **Documentation**: `/docs` directory
- **Issues**: GitHub Issues
- **Community**: Discord/Slack
- **Email**: support@heypeter-academy.com

---

*Happy coding! 🚀*