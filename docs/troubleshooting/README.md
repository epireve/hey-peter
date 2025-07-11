# Troubleshooting and FAQ Guide

This comprehensive troubleshooting guide helps you resolve common issues and provides answers to frequently asked questions about the HeyPeter Academy Learning Management System.

## Table of Contents

1. [Common Technical Issues](#common-technical-issues)
2. [Authentication Problems](#authentication-problems)
3. [Database Issues](#database-issues)
4. [Performance Problems](#performance-problems)
5. [Deployment Issues](#deployment-issues)
6. [User Interface Problems](#user-interface-problems)
7. [API Integration Issues](#api-integration-issues)
8. [Mobile App Problems](#mobile-app-problems)
9. [Frequently Asked Questions](#frequently-asked-questions)
10. [Emergency Procedures](#emergency-procedures)
11. [Support Resources](#support-resources)

## Common Technical Issues

### Login and Authentication Issues

#### Problem: Cannot log in to the platform
**Symptoms:**
- Login page shows "Invalid credentials" error
- Page redirects back to login after entering credentials
- "Something went wrong" error message

**Solutions:**
1. **Check credentials:**
   ```bash
   # Verify email and password are correct
   # Check for caps lock or special characters
   ```

2. **Clear browser cache:**
   ```bash
   # Chrome: Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
   # Firefox: Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
   # Safari: Develop > Empty Caches
   ```

3. **Try different browser:**
   - Test with Chrome, Firefox, Safari, or Edge
   - Disable browser extensions temporarily
   - Try incognito/private browsing mode

4. **Reset password:**
   ```javascript
   // Use the forgot password feature
   // Check email spam folder for reset link
   // Follow the reset instructions completely
   ```

5. **Check account status:**
   - Contact administrator to verify account is active
   - Ensure email is verified
   - Check if account has been locked due to failed attempts

#### Problem: Session expires frequently
**Symptoms:**
- Logged out after short periods of inactivity
- Need to log in multiple times per day
- "Session expired" messages

**Solutions:**
1. **Check browser settings:**
   ```javascript
   // Enable cookies in browser settings
   // Disable "Clear cookies on exit"
   // Add site to trusted sites list
   ```

2. **Update browser:**
   ```bash
   # Ensure browser is latest version
   # Clear browser data and restart
   ```

3. **Check system time:**
   ```bash
   # Ensure system date/time is correct
   # Sync with internet time server
   ```

### Loading and Performance Issues

#### Problem: Pages load slowly or don't load
**Symptoms:**
- Long loading times (>10 seconds)
- Blank pages or loading spinners
- Timeout errors

**Solutions:**
1. **Check internet connection:**
   ```bash
   # Test internet speed: speedtest.net
   # Try loading other websites
   # Restart router/modem if needed
   ```

2. **Clear browser cache:**
   ```bash
   # Clear all cached data
   # Restart browser completely
   ```

3. **Disable browser extensions:**
   ```bash
   # Temporarily disable all extensions
   # Test if issue persists
   # Re-enable one by one to identify problematic extension
   ```

4. **Check browser compatibility:**
   ```javascript
   // Supported browsers:
   // Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
   ```

#### Problem: Features not working properly
**Symptoms:**
- Buttons don't respond to clicks
- Forms don't submit
- JavaScript errors in console

**Solutions:**
1. **Check JavaScript:**
   ```javascript
   // Enable JavaScript in browser settings
   // Check browser console for errors (F12)
   // Refresh page after enabling JavaScript
   ```

2. **Update browser:**
   ```bash
   # Update to latest browser version
   # Clear all browser data after update
   ```

3. **Check ad blockers:**
   ```javascript
   // Temporarily disable ad blockers
   // Add site to ad blocker whitelist
   // Test functionality with ad blocker disabled
   ```

## Authentication Problems

### Supabase Authentication Issues

#### Problem: Authentication errors with Supabase
**Symptoms:**
- "Invalid JWT" errors
- Authentication redirect loops
- "User not found" errors

**Solutions:**
1. **Check environment variables:**
   ```env
   # Verify Supabase URL and keys are correct
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

2. **Verify Supabase project status:**
   ```bash
   # Check Supabase dashboard for project health
   # Ensure database is running
   # Check for any service outages
   ```

3. **Test authentication flow:**
   ```javascript
   // Test basic auth functions
   const { data, error } = await supabase.auth.signInWithPassword({
     email: 'test@example.com',
     password: 'password'
   })
   console.log('Auth result:', data, error)
   ```

#### Problem: Role-based access not working
**Symptoms:**
- Users can access unauthorized pages
- Admin features visible to non-admin users
- Permission errors

**Solutions:**
1. **Check RLS policies:**
   ```sql
   -- Verify Row Level Security policies
   SELECT * FROM pg_policies WHERE tablename = 'users';
   
   -- Test policy with specific user
   SET ROLE TO authenticated;
   SELECT * FROM users WHERE id = 'user-id';
   ```

2. **Verify user roles:**
   ```sql
   -- Check user role assignment
   SELECT id, email, role FROM users WHERE email = 'user@example.com';
   
   -- Update role if incorrect
   UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
   ```

3. **Check middleware:**
   ```javascript
   // Verify authentication middleware is working
   // Check route protection logic
   // Test role-based redirects
   ```

### Session Management Issues

#### Problem: Session persistence problems
**Symptoms:**
- Users logged out when closing browser
- Session not maintained across tabs
- Random logouts during use

**Solutions:**
1. **Check session configuration:**
   ```javascript
   // Verify session settings in auth config
   const { data, error } = await supabase.auth.getSession()
   console.log('Current session:', data.session)
   ```

2. **Browser storage issues:**
   ```javascript
   // Check localStorage and sessionStorage
   console.log('LocalStorage:', localStorage.getItem('supabase.auth.token'))
   
   // Clear and refresh if corrupted
   localStorage.clear()
   sessionStorage.clear()
   ```

3. **Cookie settings:**
   ```javascript
   // Check if cookies are enabled
   document.cookie = "test=1"
   console.log('Cookies enabled:', document.cookie.indexOf('test=1') !== -1)
   ```

## Database Issues

### Connection Problems

#### Problem: Database connection failures
**Symptoms:**
- "Connection refused" errors
- "Database not found" errors
- Timeout errors during database operations

**Solutions:**
1. **Check database status:**
   ```bash
   # Test database connection
   supabase status
   
   # Check connection string
   psql $DATABASE_URL -c "SELECT version();"
   ```

2. **Verify connection limits:**
   ```sql
   -- Check current connections
   SELECT count(*) FROM pg_stat_activity;
   
   -- Check connection limit
   SHOW max_connections;
   
   -- Kill idle connections if needed
   SELECT pg_terminate_backend(pid) 
   FROM pg_stat_activity 
   WHERE state = 'idle' AND state_change < now() - interval '1 hour';
   ```

3. **Check firewall and network:**
   ```bash
   # Test network connectivity
   telnet your-database-host 5432
   
   # Check DNS resolution
   nslookup your-database-host
   ```

### Migration Issues

#### Problem: Database migration failures
**Symptoms:**
- Migration errors during deployment
- Schema inconsistencies
- Foreign key constraint errors

**Solutions:**
1. **Check migration status:**
   ```bash
   # Check current migration status
   supabase migration list
   
   # Check for failed migrations
   supabase db reset --debug
   ```

2. **Fix migration conflicts:**
   ```sql
   -- Check for existing objects
   SELECT tablename FROM pg_tables WHERE schemaname = 'public';
   
   -- Drop conflicting objects if safe
   DROP TABLE IF EXISTS conflicting_table CASCADE;
   ```

3. **Manual migration repair:**
   ```bash
   # Create new migration for fixes
   supabase migration new fix_migration_issue
   
   # Apply specific migration
   supabase db push
   ```

### Data Integrity Issues

#### Problem: Data inconsistencies
**Symptoms:**
- Missing or corrupted data
- Foreign key violations
- Duplicate records

**Solutions:**
1. **Check data integrity:**
   ```sql
   -- Check for orphaned records
   SELECT * FROM bookings b 
   LEFT JOIN students s ON b.student_id = s.id 
   WHERE s.id IS NULL;
   
   -- Check for duplicate records
   SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1;
   ```

2. **Fix data issues:**
   ```sql
   -- Remove orphaned records
   DELETE FROM bookings WHERE student_id NOT IN (SELECT id FROM students);
   
   -- Merge duplicate records
   UPDATE bookings SET student_id = 'correct-id' WHERE student_id = 'duplicate-id';
   DELETE FROM students WHERE id = 'duplicate-id';
   ```

3. **Add constraints:**
   ```sql
   -- Add missing constraints
   ALTER TABLE bookings ADD CONSTRAINT fk_booking_student 
   FOREIGN KEY (student_id) REFERENCES students(id);
   
   -- Add unique constraints
   ALTER TABLE users ADD CONSTRAINT unique_email UNIQUE (email);
   ```

## Performance Problems

### Slow Page Loading

#### Problem: Application responds slowly
**Symptoms:**
- Page load times >3 seconds
- API responses take too long
- Database queries timeout

**Solutions:**
1. **Analyze performance:**
   ```javascript
   // Use browser dev tools to identify bottlenecks
   // Check Network tab for slow requests
   // Monitor Memory usage
   
   // Add performance monitoring
   console.time('page-load')
   // ... page content loads
   console.timeEnd('page-load')
   ```

2. **Optimize database queries:**
   ```sql
   -- Analyze slow queries
   EXPLAIN ANALYZE SELECT * FROM students WHERE email = 'user@example.com';
   
   -- Add missing indexes
   CREATE INDEX CONCURRENTLY idx_students_email ON students(email);
   CREATE INDEX CONCURRENTLY idx_bookings_student_id ON bookings(student_id);
   ```

3. **Implement caching:**
   ```javascript
   // Add React Query for data caching
   import { useQuery } from '@tanstack/react-query'
   
   const { data, isLoading } = useQuery({
     queryKey: ['students'],
     queryFn: fetchStudents,
     staleTime: 5 * 60 * 1000, // 5 minutes
   })
   ```

### Memory Issues

#### Problem: High memory usage or memory leaks
**Symptoms:**
- Browser becomes unresponsive
- "Out of memory" errors
- Performance degrades over time

**Solutions:**
1. **Identify memory leaks:**
   ```javascript
   // Use browser dev tools Memory tab
   // Take heap snapshots before and after actions
   // Look for detached DOM nodes
   
   // Check for event listener leaks
   window.addEventListener('resize', handler)
   // Always cleanup: window.removeEventListener('resize', handler)
   ```

2. **Optimize React components:**
   ```javascript
   // Use React.memo for expensive components
   const ExpensiveComponent = React.memo(({ data }) => {
     return <div>{data}</div>
   })
   
   // Cleanup effects
   useEffect(() => {
     const timer = setInterval(callback, 1000)
     return () => clearInterval(timer)
   }, [])
   ```

3. **Limit data loading:**
   ```javascript
   // Implement pagination
   const [page, setPage] = useState(1)
   const limit = 20
   
   const { data } = useQuery({
     queryKey: ['students', page],
     queryFn: () => fetchStudents({ page, limit })
   })
   ```

## Deployment Issues

### Build Failures

#### Problem: Application fails to build
**Symptoms:**
- Build process stops with errors
- TypeScript compilation errors
- Missing dependencies

**Solutions:**
1. **Check build logs:**
   ```bash
   # Run build locally to see full error
   npm run build
   
   # Check for TypeScript errors
   npx tsc --noEmit
   
   # Check for ESLint errors
   npm run lint
   ```

2. **Fix common build issues:**
   ```bash
   # Clear build cache
   rm -rf .next
   rm -rf node_modules
   npm install
   
   # Update dependencies
   npm update
   
   # Check for circular dependencies
   npx madge --circular src/
   ```

3. **Environment variable issues:**
   ```bash
   # Ensure all required env vars are set
   echo $NEXT_PUBLIC_SUPABASE_URL
   
   # Check for missing variables in build
   # Add to deployment platform (Vercel, Netlify, etc.)
   ```

### Deployment Configuration

#### Problem: Application works locally but fails in production
**Symptoms:**
- Different behavior between local and production
- Environment-specific errors
- Missing features in production

**Solutions:**
1. **Check environment differences:**
   ```javascript
   // Compare environment variables
   console.log('Environment:', process.env.NODE_ENV)
   console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
   
   // Check for hardcoded localhost URLs
   // Ensure all URLs use environment variables
   ```

2. **Verify build configuration:**
   ```javascript
   // Check next.config.js for production settings
   module.exports = {
     output: 'standalone', // For Docker deployments
     experimental: {
       optimizeCss: true, // Only in production
     }
   }
   ```

3. **Test production build locally:**
   ```bash
   # Build and run production locally
   npm run build
   npm start
   
   # Or use production Docker image
   docker build -t app .
   docker run -p 3000:3000 app
   ```

## User Interface Problems

### Layout and Styling Issues

#### Problem: UI elements not displaying correctly
**Symptoms:**
- Broken layouts on mobile devices
- Missing or incorrect styling
- Components overlapping

**Solutions:**
1. **Check responsive design:**
   ```css
   /* Ensure proper viewport meta tag */
   <meta name="viewport" content="width=device-width, initial-scale=1" />
   
   /* Test different screen sizes */
   /* Use browser dev tools device simulation */
   ```

2. **Fix CSS conflicts:**
   ```css
   /* Check for CSS specificity issues */
   /* Use browser inspector to find conflicting styles */
   
   /* Add !important only as last resort */
   .component {
     display: flex !important;
   }
   ```

3. **Tailwind CSS issues:**
   ```javascript
   // Ensure Tailwind is properly configured
   // Check tailwind.config.js
   module.exports = {
     content: [
       './pages/**/*.{js,ts,jsx,tsx}',
       './components/**/*.{js,ts,jsx,tsx}',
     ],
   }
   
   // Purge and rebuild styles
   npm run build
   ```

### Component Functionality

#### Problem: Interactive components not working
**Symptoms:**
- Buttons don't respond to clicks
- Forms don't submit
- Dropdowns don't open

**Solutions:**
1. **Check JavaScript errors:**
   ```javascript
   // Open browser console (F12)
   // Look for JavaScript errors
   // Fix any console errors before testing
   ```

2. **Event handler issues:**
   ```javascript
   // Ensure event handlers are properly bound
   const handleClick = useCallback(() => {
     console.log('Button clicked')
   }, [])
   
   // Check for event propagation issues
   const handleClick = (e) => {
     e.preventDefault()
     e.stopPropagation()
     // Handle click
   }
   ```

3. **State management issues:**
   ```javascript
   // Check component state updates
   const [isLoading, setIsLoading] = useState(false)
   
   // Debug state changes
   useEffect(() => {
     console.log('State changed:', isLoading)
   }, [isLoading])
   ```

## API Integration Issues

### API Request Failures

#### Problem: API calls failing or returning errors
**Symptoms:**
- Network errors in browser console
- API returns 4xx or 5xx status codes
- Timeout errors

**Solutions:**
1. **Check API endpoint:**
   ```javascript
   // Verify API URL is correct
   console.log('API Base URL:', process.env.NEXT_PUBLIC_API_URL)
   
   // Test API endpoint directly
   curl -X GET "https://api.example.com/health" -H "Authorization: Bearer token"
   ```

2. **Authentication issues:**
   ```javascript
   // Check if token is included in requests
   const token = await supabase.auth.getSession()
   console.log('Auth token:', token.data.session?.access_token)
   
   // Verify token format
   // Ensure token is not expired
   ```

3. **CORS issues:**
   ```javascript
   // Check for CORS errors in console
   // Verify API server allows your domain
   
   // Add to API server:
   app.use(cors({
     origin: ['https://yourdomain.com', 'http://localhost:3000']
   }))
   ```

### Data Synchronization Issues

#### Problem: Data not syncing properly between client and server
**Symptoms:**
- Stale data displayed
- Changes not persisting
- Inconsistent data across tabs

**Solutions:**
1. **Check caching strategy:**
   ```javascript
   // Implement proper cache invalidation
   import { useQueryClient } from '@tanstack/react-query'
   
   const queryClient = useQueryClient()
   
   // Invalidate cache after mutations
   queryClient.invalidateQueries({ queryKey: ['students'] })
   ```

2. **Real-time updates:**
   ```javascript
   // Implement Supabase real-time subscriptions
   useEffect(() => {
     const subscription = supabase
       .channel('students')
       .on('postgres_changes', 
         { event: '*', schema: 'public', table: 'students' },
         (payload) => {
           console.log('Change received!', payload)
           // Update local state
         }
       )
       .subscribe()
   
     return () => subscription.unsubscribe()
   }, [])
   ```

3. **Optimistic updates:**
   ```javascript
   // Implement optimistic UI updates
   const updateStudent = useMutation({
     mutationFn: updateStudentAPI,
     onMutate: async (newStudent) => {
       // Cancel outgoing refetches
       await queryClient.cancelQueries({ queryKey: ['students'] })
       
       // Snapshot previous value
       const previousStudents = queryClient.getQueryData(['students'])
       
       // Optimistically update to new value
       queryClient.setQueryData(['students'], old => [...old, newStudent])
       
       return { previousStudents }
     },
     onError: (err, newStudent, context) => {
       // Rollback on error
       queryClient.setQueryData(['students'], context.previousStudents)
     },
   })
   ```

## Mobile App Problems

### Installation Issues

#### Problem: Mobile app won't install or update
**Symptoms:**
- App store installation fails
- Update process stops midway
- "App not compatible" errors

**Solutions:**
1. **Check device compatibility:**
   ```javascript
   // Minimum requirements:
   // iOS 12.0+ / Android 8.0+
   // 2GB RAM minimum
   // 500MB available storage
   ```

2. **Clear app store cache:**
   ```bash
   # iOS: Settings > General > iPhone Storage > App Store > Offload App
   # Android: Settings > Apps > Google Play Store > Storage > Clear Cache
   ```

3. **Check network connection:**
   ```bash
   # Ensure stable internet connection
   # Try switching between WiFi and mobile data
   # Restart network settings if needed
   ```

### App Performance Issues

#### Problem: Mobile app runs slowly or crashes
**Symptoms:**
- App takes long time to start
- Frequent crashes or freezes
- Features not responding

**Solutions:**
1. **Restart the app:**
   ```bash
   # iOS: Double-tap home button, swipe up on app
   # Android: Use recent apps button, swipe away app
   ```

2. **Clear app data:**
   ```bash
   # iOS: Settings > General > iPhone Storage > HeyPeter Academy > Offload App
   # Android: Settings > Apps > HeyPeter Academy > Storage > Clear Data
   ```

3. **Update app and OS:**
   ```bash
   # Check for app updates in app store
   # Update device operating system
   # Restart device after updates
   ```

## Frequently Asked Questions

### General Questions

#### Q: What browsers are supported?
**A:** The platform supports:
- Chrome 90 and later
- Firefox 88 and later
- Safari 14 and later
- Edge 90 and later
- Mobile browsers on iOS Safari and Chrome Android

#### Q: How do I reset my password?
**A:** 
1. Go to the login page
2. Click "Forgot Password"
3. Enter your email address
4. Check your email for reset instructions
5. Follow the link to create a new password

#### Q: Can I use the platform offline?
**A:** Limited offline functionality is available:
- Downloaded course materials can be viewed offline
- Progress syncs when connection is restored
- Class booking requires internet connection
- Live classes require stable internet

### Account and Profile Questions

#### Q: How do I update my profile information?
**A:**
1. Log in to your account
2. Go to Profile Settings
3. Edit the information you want to change
4. Save your changes
5. Verify email if you changed your email address

#### Q: Why can't I see all features mentioned in documentation?
**A:** Feature availability depends on:
- Your user role (student, teacher, admin)
- Your subscription level
- Platform configuration settings
- Geographic restrictions (rare)

#### Q: How do I change my user role?
**A:** User roles can only be changed by administrators:
1. Contact your academy administrator
2. Provide justification for role change
3. Wait for approval and processing
4. Log out and log back in after change

### Class and Booking Questions

#### Q: Why can't I book a class?
**A:** Common reasons:
- Insufficient hour balance
- Class is already full
- Booking window has closed
- Your account has restrictions
- Technical issues with the booking system

#### Q: How do I cancel a booking?
**A:**
1. Go to your dashboard
2. Find the booking in your schedule
3. Click "Cancel" if within cancellation window
4. Confirm cancellation
5. Check if hours are refunded based on policy

#### Q: What happens if I miss a class?
**A:** Depending on academy policy:
- Hours may be deducted for no-shows
- Make-up classes might be available
- Some policies allow hour preservation for emergencies
- Contact your teacher or administrator for options

### Technical Questions

#### Q: How do I join an online class?
**A:**
1. Check your email for class details
2. Click the meeting link 5 minutes before class
3. Allow camera and microphone permissions
4. Test your audio/video before class starts
5. Contact support if technical issues arise

#### Q: What should I do if I can't hear the teacher?
**A:**
1. Check your device volume settings
2. Ensure headphones/speakers are connected properly
3. Test audio with other applications
4. Try refreshing the browser/app
5. Use the chat feature to inform the teacher

#### Q: How do I download class recordings?
**A:**
1. Go to your dashboard after class
2. Look for "Recordings" or "Past Classes"
3. Click download link next to the class
4. Wait for download to complete
5. Note: Not all classes are recorded

### Hour Management Questions

#### Q: How do hours expire?
**A:** Hour expiration depends on:
- Package type purchased
- Academy policy (typically 6-12 months)
- Leave requests may extend expiration
- Check your hour balance for specific dates

#### Q: Can I transfer hours to another student?
**A:** Hour transfers are limited:
- Usually only allowed within same family
- Requires administrator approval
- May incur transfer fees
- Contact support for specific requests

#### Q: Why were hours deducted when I cancelled early?
**A:** Hour deduction policies:
- Cancellations within 24 hours may incur charges
- No-shows typically result in full hour deduction
- Late arrivals may be charged for full class
- Check academy policies for specific rules

## Emergency Procedures

### Critical System Issues

#### Complete System Outage
1. **Immediate Response:**
   - Check status page for known issues
   - Try accessing from different devices/networks
   - Clear browser cache and try again

2. **If Issue Persists:**
   - Report outage to support immediately
   - Document error messages and screenshots
   - Note time and circumstances of outage

3. **Workaround Options:**
   - Use mobile app if web platform is down
   - Contact teachers directly for urgent matters
   - Check social media for status updates

#### Data Loss or Corruption
1. **Stop all activities** that might cause further data loss
2. **Document the issue** with screenshots and error messages
3. **Contact emergency support** immediately
4. **Do not attempt** to fix data issues yourself
5. **Preserve evidence** of what happened

#### Security Incidents
1. **Change passwords** immediately if account is compromised
2. **Contact support** to report security issues
3. **Document suspicious activity** with timestamps
4. **Review account activity** for unauthorized actions
5. **Enable two-factor authentication** if available

### Contact Information

#### Emergency Support
- **Phone**: +1-XXX-XXX-XXXX (24/7 for critical issues)
- **Email**: emergency@heypeter-academy.com
- **Live Chat**: Available 9 AM - 6 PM GMT

#### General Support
- **Help Desk**: support@heypeter-academy.com
- **Technical Issues**: tech-support@heypeter-academy.com
- **Account Issues**: accounts@heypeter-academy.com

## Support Resources

### Self-Help Resources
- **Knowledge Base**: Searchable help articles
- **Video Tutorials**: Step-by-step visual guides
- **Community Forum**: User community support
- **Status Page**: Real-time system status

### Direct Support Options
- **Live Chat**: Real-time assistance during business hours
- **Email Support**: Detailed help via email
- **Phone Support**: Direct phone assistance for urgent issues
- **Screen Sharing**: Remote assistance for complex problems

### Response Times
- **Critical Issues**: Within 1 hour
- **High Priority**: Within 4 hours
- **Normal Issues**: Within 24 hours
- **Low Priority**: Within 48 hours

### Best Practices for Getting Help
1. **Be specific** about the problem
2. **Include screenshots** or error messages
3. **Describe steps** that led to the issue
4. **Mention your browser** and operating system
5. **Try basic troubleshooting** before contacting support

---

*This troubleshooting guide is updated regularly based on common issues and user feedback. If you encounter an issue not covered here, please contact our support team.*