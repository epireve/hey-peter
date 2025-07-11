# Post-Deployment Validation Checklist

## Overview
This document provides a comprehensive checklist and procedures for validating the HeyPeter Academy LMS after production deployment. The validation process ensures all systems are functioning correctly and meeting performance standards.

## Validation Timeline

| Phase | Duration | Focus Area | Team Responsible |
|-------|----------|------------|------------------|
| Immediate | 0-30 min | Critical functionality | DevOps + QA |
| Short-term | 30 min-2 hr | Core features | QA + Dev |
| Extended | 2-24 hr | Full system validation | All teams |
| Ongoing | 24-72 hr | Performance & stability | DevOps + Support |

## Immediate Validation (0-30 minutes)

### 1. Infrastructure Health Checks

```bash
#!/bin/bash
# scripts/immediate-validation.sh

echo "=== Infrastructure Health Check ==="

# Check all services are running
services=("nginx" "postgresql" "redis" "pm2")
for service in "${services[@]}"; do
  if systemctl is-active --quiet $service; then
    echo "✅ $service is running"
  else
    echo "❌ $service is NOT running"
    exit 1
  fi
done

# Check application processes
pm2_status=$(pm2 jlist)
if echo "$pm2_status" | jq -r '.[].pm2_env.status' | grep -q "online"; then
  echo "✅ Application processes are online"
else
  echo "❌ Application processes are NOT online"
  exit 1
fi

# Check disk space
disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $disk_usage -lt 80 ]; then
  echo "✅ Disk usage is healthy: ${disk_usage}%"
else
  echo "⚠️  Disk usage is high: ${disk_usage}%"
fi

# Check memory usage
memory_usage=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
if [ $memory_usage -lt 80 ]; then
  echo "✅ Memory usage is healthy: ${memory_usage}%"
else
  echo "⚠️  Memory usage is high: ${memory_usage}%"
fi
```

### 2. Application Endpoints

- [ ] **Health Check Endpoint**
  ```bash
  curl -f https://app.heypeteracademy.com/health
  # Expected: {"status":"healthy","timestamp":"..."}
  ```

- [ ] **API Status**
  ```bash
  curl -f https://app.heypeteracademy.com/api/status
  # Expected: {"api":"online","version":"...","uptime":"..."}
  ```

- [ ] **Database Connectivity**
  ```bash
  curl -f https://app.heypeteracademy.com/api/health/db
  # Expected: {"database":"connected","latency":"...ms"}
  ```

- [ ] **Cache Status**
  ```bash
  curl -f https://app.heypeteracademy.com/api/health/cache
  # Expected: {"cache":"connected","hit_rate":"..."}
  ```

### 3. SSL/Security Validation

```bash
# Check SSL certificate
echo | openssl s_client -servername app.heypeteracademy.com \
  -connect app.heypeteracademy.com:443 2>/dev/null | \
  openssl x509 -noout -dates

# Check security headers
curl -I https://app.heypeteracademy.com | grep -E \
  "(Strict-Transport-Security|X-Frame-Options|X-Content-Type-Options|Content-Security-Policy)"

# Verify HTTPS redirect
curl -I http://app.heypeteracademy.com
# Should return 301 redirect to HTTPS
```

## Short-term Validation (30 minutes - 2 hours)

### 1. Authentication Flow

- [ ] **User Registration**
  - Can create new account
  - Email verification sent
  - Welcome email received
  - Profile creation works

- [ ] **User Login**
  - Email/password login works
  - OAuth providers functional
  - Remember me option works
  - Password reset flow works

- [ ] **Session Management**
  - Sessions persist correctly
  - Logout works properly
  - Multi-device sessions handled
  - Session timeout works

### 2. Core User Journeys

#### Student Journey
```javascript
// Automated test script
describe('Student Core Journey', () => {
  test('Complete student workflow', async () => {
    // 1. Register as student
    const student = await registerStudent({
      email: 'test@example.com',
      password: 'TestPass123!',
      name: 'Test Student'
    });
    
    // 2. Browse courses
    const courses = await getCourses();
    expect(courses.length).toBeGreaterThan(0);
    
    // 3. Enroll in course
    const enrollment = await enrollInCourse(courses[0].id);
    expect(enrollment.status).toBe('active');
    
    // 4. Book a class
    const booking = await bookClass({
      courseId: courses[0].id,
      date: '2025-01-15',
      time: '14:00'
    });
    expect(booking.status).toBe('confirmed');
    
    // 5. Access materials
    const materials = await getCourseMaterials(courses[0].id);
    expect(materials).toBeDefined();
  });
});
```

#### Teacher Journey
- [ ] View assigned classes
- [ ] Mark attendance
- [ ] Upload class materials
- [ ] Submit performance reports
- [ ] View compensation details

#### Admin Journey
- [ ] Access admin dashboard
- [ ] View system metrics
- [ ] Manage users
- [ ] Configure settings
- [ ] Generate reports

### 3. Payment Processing

- [ ] **Payment Gateway Connection**
  ```bash
  curl -X POST https://app.heypeteracademy.com/api/payments/test \
    -H "Authorization: Bearer $ADMIN_TOKEN"
  ```

- [ ] **Test Transactions**
  - Process test payment
  - Verify webhook reception
  - Check payment records
  - Confirm email receipts

### 4. Data Integrity Checks

```sql
-- Check data consistency
SELECT 
  'Users' as table_name,
  COUNT(*) as record_count,
  COUNT(DISTINCT id) as unique_ids,
  MAX(created_at) as latest_record
FROM auth.users
UNION ALL
SELECT 
  'Students',
  COUNT(*),
  COUNT(DISTINCT id),
  MAX(created_at)
FROM public.students
UNION ALL
SELECT 
  'Classes',
  COUNT(*),
  COUNT(DISTINCT id),
  MAX(created_at)
FROM public.classes;

-- Verify foreign key relationships
SELECT 
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY';
```

## Extended Validation (2-24 hours)

### 1. Performance Testing

```javascript
// k6 load test script
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '5m', target: 100 },  // Ramp up
    { duration: '10m', target: 100 }, // Stay at 100 users
    { duration: '5m', target: 200 },  // Ramp up more
    { duration: '10m', target: 200 }, // Stay at 200 users
    { duration: '5m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'],    // Error rate under 10%
  },
};

export default function() {
  // Test homepage
  let res = http.get('https://app.heypeteracademy.com');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'page loaded': (r) => r.body.includes('HeyPeter Academy'),
  });
  
  sleep(1);
  
  // Test API endpoint
  res = http.get('https://app.heypeteracademy.com/api/courses');
  check(res, {
    'API responds': (r) => r.status === 200,
    'returns JSON': (r) => r.headers['Content-Type'].includes('application/json'),
  });
  
  sleep(1);
}
```

### 2. Browser Compatibility

- [ ] **Desktop Browsers**
  - Chrome (latest 2 versions)
  - Firefox (latest 2 versions)
  - Safari (latest 2 versions)
  - Edge (latest 2 versions)

- [ ] **Mobile Browsers**
  - iOS Safari
  - Chrome Mobile
  - Samsung Internet

- [ ] **Responsive Design**
  - Mobile (320px - 768px)
  - Tablet (768px - 1024px)
  - Desktop (1024px+)

### 3. Accessibility Testing

```javascript
// Automated accessibility test
const { AxePuppeteer } = require('@axe-core/puppeteer');
const puppeteer = require('puppeteer');

async function testAccessibility() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://app.heypeteracademy.com');
  
  const results = await new AxePuppeteer(page).analyze();
  
  console.log('Accessibility violations:', results.violations.length);
  results.violations.forEach(violation => {
    console.log(`- ${violation.description}`);
    console.log(`  Impact: ${violation.impact}`);
    console.log(`  Elements: ${violation.nodes.length}`);
  });
  
  await browser.close();
}
```

### 4. Integration Testing

- [ ] **Email Service**
  - Registration emails sent
  - Password reset emails work
  - Class reminders delivered
  - Receipts generated

- [ ] **SMS Notifications**
  - Class reminders sent
  - Urgent notifications work
  - Opt-out respected

- [ ] **Video Platform**
  - Video calls initiate
  - Screen sharing works
  - Recording functionality
  - Bandwidth adaptation

### 5. Backup Verification

```bash
# Verify backup job is running
crontab -l | grep backup

# Check latest backup
ls -la /var/backups/postgres/daily/ | tail -5

# Verify S3 backup upload
aws s3 ls s3://heypeter-academy-backups/daily/ \
  --recursive | tail -5

# Test backup restoration to staging
./scripts/test-backup-restore.sh --env=staging
```

## Ongoing Validation (24-72 hours)

### 1. Performance Monitoring

#### Key Metrics Dashboard
```yaml
Application Metrics:
  - Response Time: < 500ms (p95)
  - Error Rate: < 0.1%
  - Throughput: > 100 req/s
  - Apdex Score: > 0.9

Infrastructure Metrics:
  - CPU Usage: < 70%
  - Memory Usage: < 80%
  - Disk I/O: < 80%
  - Network Latency: < 50ms

Business Metrics:
  - User Registrations: Normal range
  - Class Bookings: Normal range
  - Payment Success: > 95%
  - Support Tickets: < 2x baseline
```

### 2. Error Monitoring

```javascript
// Monitor error rates
const errorThresholds = {
  '4xx': 5,  // % of total requests
  '5xx': 0.1,
  'javascript_errors': 1,
  'api_timeouts': 0.5,
};

async function checkErrorRates() {
  const metrics = await getMetrics('1h');
  
  for (const [errorType, threshold] of Object.entries(errorThresholds)) {
    const rate = metrics[errorType] || 0;
    if (rate > threshold) {
      await sendAlert({
        type: 'error_rate_high',
        metric: errorType,
        value: rate,
        threshold: threshold,
      });
    }
  }
}
```

### 3. User Feedback Monitoring

- [ ] **Support Ticket Analysis**
  - Volume compared to baseline
  - Common issue patterns
  - Response time metrics
  - Resolution rates

- [ ] **User Satisfaction**
  - In-app feedback scores
  - Session duration trends
  - Feature usage patterns
  - Churn indicators

### 4. Security Monitoring

```bash
# Check for suspicious activity
grep -E "(SQL injection|XSS|CSRF)" /var/log/nginx/access.log | tail -20

# Monitor failed login attempts
psql $DATABASE_URL -c "
  SELECT 
    email,
    COUNT(*) as attempts,
    MAX(created_at) as last_attempt
  FROM auth.audit_log
  WHERE action = 'login_failed'
    AND created_at > NOW() - INTERVAL '1 hour'
  GROUP BY email
  HAVING COUNT(*) > 5
  ORDER BY attempts DESC;
"

# Check for unusual API usage
./scripts/analyze-api-usage.sh --duration=1h --threshold=1000
```

## Validation Sign-off

### Technical Validation

| Component | Status | Validated By | Time | Notes |
|-----------|--------|--------------|------|-------|
| Infrastructure | ☐ Pass ☐ Fail | | | |
| Application | ☐ Pass ☐ Fail | | | |
| Database | ☐ Pass ☐ Fail | | | |
| Integrations | ☐ Pass ☐ Fail | | | |
| Performance | ☐ Pass ☐ Fail | | | |
| Security | ☐ Pass ☐ Fail | | | |

### Business Validation

| Feature | Status | Validated By | Time | Notes |
|---------|--------|--------------|------|-------|
| User Registration | ☐ Pass ☐ Fail | | | |
| Course Management | ☐ Pass ☐ Fail | | | |
| Class Booking | ☐ Pass ☐ Fail | | | |
| Payment Processing | ☐ Pass ☐ Fail | | | |
| Reporting | ☐ Pass ☐ Fail | | | |
| Communications | ☐ Pass ☐ Fail | | | |

### Final Approval

| Role | Name | Signature | Date | Comments |
|------|------|-----------|------|----------|
| Tech Lead | | | | |
| QA Lead | | | | |
| Product Manager | | | | |
| Operations Manager | | | | |
| CTO | | | | |

## Post-Validation Actions

### If Validation Passes:
1. Update status page to "Operational"
2. Send success notification to stakeholders
3. Archive deployment artifacts
4. Schedule retrospective meeting
5. Update documentation

### If Validation Fails:
1. Assess severity of issues
2. Decide on rollback vs. hotfix
3. Implement fix or rollback
4. Re-run validation suite
5. Document issues and resolution

## Automated Validation Script

```bash
#!/bin/bash
# scripts/run-full-validation.sh

set -e

echo "Starting post-deployment validation..."

# Run all validation checks
./scripts/immediate-validation.sh
./scripts/core-features-test.sh
./scripts/performance-test.sh
./scripts/security-scan.sh

# Generate report
./scripts/generate-validation-report.sh \
  --output=/var/reports/validation-$(date +%Y%m%d-%H%M%S).html

echo "Validation complete. Check report for details."
```