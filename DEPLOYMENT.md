# Deployment Guide

This guide covers deploying the HeyPeter Academy LMS to various platforms.

## 🚀 Vercel Deployment (Recommended)

### Prerequisites
- Vercel account
- GitHub repository (for automatic deployments)
- Supabase project with database set up

### Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Fhey-peter)

### Manual Deployment Steps

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Build and test locally**:
   ```bash
   pnpm install
   pnpm build
   pnpm start
   ```

3. **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```

### Environment Variables for Vercel

Set these environment variables in your Vercel dashboard:

**Required Variables:**
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXTAUTH_SECRET=your_nextauth_secret_32_chars_minimum
```

**Optional Variables:**
```bash
VERCEL_ANALYTICS_ID=your_vercel_analytics_id
NODE_ENV=production
```

### Automatic Deployments

1. Connect your GitHub repository to Vercel
2. Configure build settings:
   - **Framework Preset**: Next.js
   - **Build Command**: `pnpm build`
   - **Install Command**: `pnpm install --frozen-lockfile`
   - **Output Directory**: `.next` (auto-detected)

3. Set environment variables in Vercel dashboard
4. Deploy automatically on git push

## 🐳 Docker Deployment

### Build Docker Image
```bash
# Build for standalone mode
BUILD_STANDALONE=true pnpm build

# Build Docker image
docker build -t heypeter-academy .

# Run container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=your_url \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key \
  heypeter-academy
```

### Docker Compose
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=your_url
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
      - SUPABASE_SERVICE_ROLE_KEY=your_service_key
      - NEXTAUTH_SECRET=your_secret
```

## 🏗️ Build Configuration

### Build Commands
```bash
# Development build
pnpm dev

# Production build (Vercel-optimized)
pnpm build

# Production build (Docker-optimized)
BUILD_STANDALONE=true pnpm build

# Start production server
pnpm start

# Start standalone server (Docker)
node .next/standalone/server.js
```

### Build Outputs
- **Vercel**: Standard Next.js build in `.next`
- **Docker**: Standalone build in `.next/standalone`
- **Static**: Set `output: 'export'` for static sites

## 🔧 Configuration Files

### vercel.json
Optimized for Vercel deployment with security headers and proper routing.

### next.config.mjs
- Automatic output mode selection (standalone for Docker, default for Vercel)
- TypeScript and ESLint configured for production
- Supabase image optimization
- Webpack optimizations for client-side packages

### package.json Scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

## 🗄️ Database Setup

### Supabase Configuration
1. Create a Supabase project
2. Run migrations from `supabase/migrations/`
3. Set up Row Level Security policies
4. Configure authentication providers
5. Set environment variables

### Migration Commands
```bash
# Apply migrations
supabase db push

# Reset database (development only)
supabase db reset

# Generate TypeScript types
supabase gen types typescript --local > src/types/supabase.ts
```

## 🔒 Security Considerations

### Environment Variables
- Never commit `.env.local` or `.env`
- Use Vercel/platform environment variables for production
- Rotate keys regularly
- Use different Supabase projects for development/production

### Security Headers
The `vercel.json` includes security headers:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: origin-when-cross-origin`

### Authentication
- Configure Supabase RLS policies
- Set up proper user roles and permissions
- Use secure JWT secrets

## 📊 Monitoring and Analytics

### Vercel Analytics
```typescript
import { Analytics } from '@vercel/analytics/react';

export default function App() {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}
```

### Error Monitoring
Consider integrating:
- Sentry for error tracking
- LogRocket for session replay
- Vercel Analytics for performance monitoring

## 🚨 Troubleshooting

### Common Build Issues

1. **TypeScript errors**:
   - Temporarily disabled in `next.config.mjs`
   - Run `npx tsc --noEmit` to check types locally

2. **Supabase connection**:
   - Verify environment variables
   - Check Supabase project status
   - Validate RLS policies

3. **Package manager conflicts**:
   - Use `pnpm` consistently
   - Delete `package-lock.json` if present
   - Run `pnpm install --frozen-lockfile`

4. **Memory issues during build**:
   - Increase Node.js memory: `NODE_OPTIONS="--max-old-space-size=4096"`
   - Use Vercel Pro for more build resources

### Deployment Checklist

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] Build completes without errors
- [ ] Security headers configured
- [ ] SSL certificate configured
- [ ] Domain configured (if custom)
- [ ] Analytics configured (optional)
- [ ] Error monitoring configured (optional)

## 📚 Additional Resources

- [Next.js Deployment Documentation](https://nextjs.org/docs/deployment)
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Docker Next.js Guide](https://nextjs.org/docs/deployment#docker-image)