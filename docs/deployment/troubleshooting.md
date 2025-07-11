# Troubleshooting Guide - HeyPeter Academy LMS

This comprehensive guide helps diagnose and resolve common issues encountered during deployment and operation of HeyPeter Academy LMS.

## 📋 Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Common Issues](#common-issues)
3. [Application Issues](#application-issues)
4. [Database Issues](#database-issues)
5. [Authentication Issues](#authentication-issues)
6. [Performance Issues](#performance-issues)
7. [Docker Issues](#docker-issues)
8. [Deployment Issues](#deployment-issues)
9. [Monitoring & Logging](#monitoring--logging)
10. [Emergency Procedures](#emergency-procedures)

## 🏃 Quick Diagnostics

### Health Check Script

```bash
#!/bin/bash
# scripts/health-check.sh

echo "🔍 Running HeyPeter Academy Health Check..."

# Check application
echo -n "App Status: "
if curl -f http://localhost:3000/api/health &>/dev/null; then
  echo "✅ Running"
else
  echo "❌ Down"
fi

# Check database
echo -n "Database: "
if psql $DATABASE_URL -c "SELECT 1" &>/dev/null; then
  echo "✅ Connected"
else
  echo "❌ Disconnected"
fi

# Check Redis
echo -n "Redis: "
if redis-cli ping &>/dev/null; then
  echo "✅ Connected"
else
  echo "❌ Disconnected"
fi

# Check disk space
echo -n "Disk Space: "
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -lt 80 ]; then
  echo "✅ ${DISK_USAGE}% used"
else
  echo "⚠️  ${DISK_USAGE}% used"
fi

# Check memory
echo -n "Memory: "
MEM_USAGE=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
if [ $MEM_USAGE -lt 80 ]; then
  echo "✅ ${MEM_USAGE}% used"
else
  echo "⚠️  ${MEM_USAGE}% used"
fi
```

### Quick Debug Commands

```bash
# View application logs
docker logs heypeter-app --tail 100 -f

# Check running processes
docker ps | grep heypeter

# Test database connection
npx supabase status

# Check environment variables
docker exec heypeter-app env | grep SUPABASE

# Monitor resource usage
docker stats
```

## 🐛 Common Issues

### Issue: Application Won't Start

**Symptoms:**
- 502 Bad Gateway error
- "Cannot connect to server"
- Container keeps restarting

**Solutions:**

1. **Check logs:**
   ```bash
   docker logs heypeter-app --tail 200
   npm run docker:logs
   ```

2. **Verify environment variables:**
   ```bash
   # Check if all required vars are set
   ./scripts/validate-env.sh
   
   # Debug specific variable
   docker exec heypeter-app printenv | grep SUPABASE
   ```

3. **Check port availability:**
   ```bash
   # Check if port 3000 is in use
   lsof -i :3000
   netstat -tulpn | grep 3000
   ```

4. **Restart services:**
   ```bash
   docker-compose restart
   # or
   docker-compose down && docker-compose up -d
   ```

### Issue: Database Connection Failed

**Symptoms:**
- "ECONNREFUSED" errors
- "password authentication failed"
- "database does not exist"

**Solutions:**

1. **Test connection:**
   ```bash
   # Direct connection test
   psql $DATABASE_URL -c "SELECT version();"
   
   # Via Supabase CLI
   npx supabase db remote status
   ```

2. **Check credentials:**
   ```bash
   # Verify DATABASE_URL format
   echo $DATABASE_URL | sed 's/:[^:]*@/:****@/'
   
   # Test with explicit credentials
   PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME
   ```

3. **Network connectivity:**
   ```bash
   # Ping database host
   ping -c 4 $(echo $DATABASE_URL | grep -oP '(?<=@)[^:]+')
   
   # Test port connectivity
   nc -zv database-host 5432
   ```

### Issue: Build Failures

**Symptoms:**
- "Module not found" errors
- TypeScript compilation errors
- Out of memory during build

**Solutions:**

1. **Clean build:**
   ```bash
   # Remove all caches
   rm -rf .next node_modules package-lock.json
   
   # Fresh install and build
   npm install
   npm run build
   ```

2. **Memory issues:**
   ```bash
   # Increase Node memory
   export NODE_OPTIONS="--max-old-space-size=4096"
   npm run build
   ```

3. **TypeScript errors:**
   ```bash
   # Check types without building
   npx tsc --noEmit
   
   # Generate fresh types
   npx supabase gen types typescript --local > src/types/supabase.ts
   ```

## 💻 Application Issues

### Next.js Specific Issues

#### Hydration Errors

**Problem:** "Text content does not match server-rendered HTML"

```typescript
// ❌ Problematic code
<div>{new Date().toLocaleString()}</div>

// ✅ Solution
<div suppressHydrationWarning>{new Date().toLocaleString()}</div>

// Or use useEffect
const [date, setDate] = useState<string>('');
useEffect(() => {
  setDate(new Date().toLocaleString());
}, []);
```

#### API Route Errors

**Problem:** API routes return 404

```typescript
// Check file structure
// ✅ Correct: app/api/health/route.ts
// ❌ Wrong: app/api/health.ts

// Ensure correct exports
export async function GET(request: Request) {
  return Response.json({ status: 'ok' });
}
```

### Static Generation Issues

**Problem:** "Error occurred prerendering page"

```typescript
// Add error handling in getStaticProps
export async function getStaticProps() {
  try {
    const data = await fetchData();
    return { props: { data }, revalidate: 60 };
  } catch (error) {
    console.error('Static generation error:', error);
    return { props: { data: null }, revalidate: 5 };
  }
}
```

## 🗄️ Database Issues

### Migration Failures

**Problem:** "Migration failed to apply"

```bash
# Check migration status
npx supabase migration list

# Fix migration issues
npx supabase db reset --local
npx supabase db push

# Manual migration
psql $DATABASE_URL -f supabase/migrations/20250110_fix.sql
```

### Connection Pool Exhausted

**Problem:** "too many connections for role"

```sql
-- Check current connections
SELECT count(*) FROM pg_stat_activity;

-- View connection details
SELECT pid, usename, application_name, client_addr, state
FROM pg_stat_activity
WHERE datname = 'heypeter';

-- Kill idle connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'heypeter'
  AND state = 'idle'
  AND state_change < NOW() - INTERVAL '10 minutes';
```

### Slow Queries

**Problem:** Database queries timing out

```sql
-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check missing indexes
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY schemaname, tablename;

-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_students_email 
ON students(email);
```

## 🔐 Authentication Issues

### Login Failures

**Problem:** Users cannot log in

```typescript
// Debug auth flow
// 1. Check Supabase auth settings
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
});

if (error) {
  console.error('Auth error:', error.message);
  // Common errors:
  // - "Invalid login credentials"
  // - "Email not confirmed"
  // - "User not found"
}

// 2. Verify JWT secret
console.log('JWT Secret exists:', !!process.env.SUPABASE_JWT_SECRET);

// 3. Check auth middleware
export async function middleware(request: NextRequest) {
  const { data: { session } } = await supabase.auth.getSession();
  console.log('Session:', session);
}
```

### Session Issues

**Problem:** Users logged out unexpectedly

```typescript
// Check session configuration
// lib/supabase.ts
export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// Debug session storage
console.log('Session:', localStorage.getItem('supabase.auth.token'));
```

## ⚡ Performance Issues

### Slow Page Loads

**Diagnosis:**
```bash
# Analyze bundle size
npm run build:analyze

# Check lighthouse scores
npx lighthouse https://heypeter-academy.com

# Monitor Core Web Vitals
npm install web-vitals
```

**Solutions:**

1. **Optimize images:**
   ```typescript
   import Image from 'next/image';
   
   <Image
     src="/hero.jpg"
     width={1200}
     height={600}
     priority
     placeholder="blur"
     blurDataURL={blurDataUrl}
   />
   ```

2. **Enable caching:**
   ```typescript
   // API route caching
   export async function GET() {
     const data = await fetchData();
     
     return new Response(JSON.stringify(data), {
       headers: {
         'Content-Type': 'application/json',
         'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59'
       }
     });
   }
   ```

3. **Lazy load components:**
   ```typescript
   const HeavyComponent = dynamic(
     () => import('@/components/HeavyComponent'),
     { 
       loading: () => <Skeleton />,
       ssr: false 
     }
   );
   ```

### High Memory Usage

**Diagnosis:**
```bash
# Monitor memory
docker stats heypeter-app

# Check for memory leaks
node --inspect server.js
# Then use Chrome DevTools Memory Profiler
```

**Solutions:**

1. **Limit concurrent operations:**
   ```typescript
   import pLimit from 'p-limit';
   const limit = pLimit(5);
   
   const results = await Promise.all(
     items.map(item => limit(() => processItem(item)))
   );
   ```

2. **Clear caches periodically:**
   ```typescript
   // Clear module cache
   delete require.cache[require.resolve('./module')];
   
   // Clear Redis cache
   await redis.flushdb();
   ```

## 🐳 Docker Issues

### Container Crashes

**Problem:** Container exits immediately

```bash
# Check exit code
docker ps -a | grep heypeter

# View detailed logs
docker logs heypeter-app --details

# Debug interactively
docker run -it --entrypoint /bin/sh heypeter-app
```

### Build Failures

**Problem:** Docker build fails

```dockerfile
# Add debugging to Dockerfile
RUN echo "Node version:" && node --version
RUN echo "NPM version:" && npm --version
RUN ls -la

# Build with no cache
docker build --no-cache -t heypeter-app .

# Build with verbose output
docker build --progress=plain -t heypeter-app .
```

### Network Issues

**Problem:** Containers cannot communicate

```bash
# List networks
docker network ls

# Inspect network
docker network inspect heypeter-network

# Test connectivity
docker exec heypeter-app ping redis

# Recreate network
docker-compose down
docker network prune
docker-compose up -d
```

## 🚀 Deployment Issues

### Vercel Deployment Failures

**Problem:** Build fails on Vercel

```bash
# Check build logs
vercel logs --follow

# Test build locally with Vercel CLI
vercel build

# Debug environment
vercel env pull
vercel dev
```

### SSL Certificate Issues

**Problem:** SSL certificate errors

```bash
# Check certificate expiry
echo | openssl s_client -connect heypeter-academy.com:443 2>/dev/null | openssl x509 -noout -dates

# Renew Let's Encrypt
certbot renew --force-renewal

# Test SSL configuration
curl -vI https://heypeter-academy.com
```

## 📊 Monitoring & Logging

### Enable Debug Logging

```typescript
// Enable all debug logs
DEBUG=* npm start

// Enable specific namespaces
DEBUG=app:*,supabase:* npm start

// Custom debug logger
import debug from 'debug';
const log = debug('app:api');

log('Processing request: %O', request);
```

### Structured Logging

```typescript
// lib/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    }),
    new winston.transports.File({
      filename: 'error.log',
      level: 'error'
    })
  ]
});

// Usage
logger.error('Database connection failed', { 
  error: error.message,
  stack: error.stack,
  userId: session?.user?.id 
});
```

### Performance Monitoring

```typescript
// lib/monitoring.ts
export function measurePerformance(name: string, fn: Function) {
  return async (...args: any[]) => {
    const start = performance.now();
    try {
      const result = await fn(...args);
      const duration = performance.now() - start;
      
      logger.info(`Performance: ${name}`, { duration });
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      logger.error(`Performance: ${name} failed`, { duration, error });
      throw error;
    }
  };
}
```

## 🚨 Emergency Procedures

### Site Down - Recovery Steps

1. **Immediate Actions:**
   ```bash
   # Check if app is running
   curl -I https://heypeter-academy.com
   
   # Quick restart
   docker-compose restart
   
   # Check logs
   docker logs heypeter-app --tail 100
   ```

2. **Rollback if needed:**
   ```bash
   # Rollback to previous version
   docker pull heypeter-app:previous
   docker tag heypeter-app:previous heypeter-app:latest
   docker-compose up -d
   ```

3. **Database recovery:**
   ```bash
   # Restore from backup
   aws s3 cp s3://heypeter-backups/latest.sql.gz .
   gunzip -c latest.sql.gz | psql $DATABASE_URL
   ```

### Data Corruption

1. **Stop writes:**
   ```sql
   -- Set database to read-only
   ALTER DATABASE heypeter SET default_transaction_read_only = on;
   ```

2. **Assess damage:**
   ```sql
   -- Check data integrity
   SELECT COUNT(*) FROM students WHERE created_at > NOW() - INTERVAL '1 hour';
   ```

3. **Restore from backup:**
   ```bash
   # Point-in-time recovery
   pg_restore -d $DATABASE_URL backup.dump --clean --if-exists
   ```

### Security Breach

1. **Immediate lockdown:**
   ```bash
   # Block all traffic except admin
   iptables -I INPUT -p tcp --dport 443 -j DROP
   iptables -I INPUT -s admin.ip.address -j ACCEPT
   ```

2. **Rotate credentials:**
   ```bash
   # Generate new secrets
   openssl rand -base64 32
   
   # Update all API keys
   vercel env rm SUPABASE_SERVICE_ROLE_KEY production
   vercel env add SUPABASE_SERVICE_ROLE_KEY production
   ```

3. **Audit logs:**
   ```sql
   -- Check for suspicious activity
   SELECT * FROM audit_logs 
   WHERE created_at > NOW() - INTERVAL '24 hours'
   ORDER BY created_at DESC;
   ```

## 📞 Getting Help

### Support Channels

1. **Internal Resources:**
   - Documentation: `/docs`
   - Runbooks: `/docs/runbooks`
   - Team Wiki: `wiki.heypeter.com`

2. **External Support:**
   - Supabase: support@supabase.io
   - Vercel: support@vercel.com
   - GitHub Issues: github.com/your-org/heypeter/issues

3. **Emergency Contacts:**
   - On-call Engineer: +1-XXX-XXX-XXXX
   - DevOps Lead: devops@heypeter.com
   - CTO: emergency@heypeter.com

### Useful Resources

- [Supabase Troubleshooting](https://supabase.com/docs/guides/troubleshooting)
- [Next.js Error Reference](https://nextjs.org/docs/messages)
- [Docker Debugging Guide](https://docs.docker.com/config/containers/logging/)
- [PostgreSQL Wiki](https://wiki.postgresql.org/wiki/Main_Page)

---

*Last updated: January 2025*