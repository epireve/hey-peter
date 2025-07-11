# API Documentation

This documentation provides comprehensive information about the HeyPeter Academy Learning Management System APIs, including authentication, endpoints, data models, and integration guidelines.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URLs & Environments](#base-urls--environments)
4. [Common Headers](#common-headers)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [API Endpoints](#api-endpoints)
8. [Data Models](#data-models)
9. [Webhooks](#webhooks)
10. [SDKs & Libraries](#sdks--libraries)
11. [Examples](#examples)
12. [Testing](#testing)

## Overview

The HeyPeter Academy API is built on RESTful principles and uses JSON for data exchange. The API provides access to all core platform functionality including user management, course operations, scheduling, and analytics.

### API Version
- **Current Version**: v1
- **API Type**: REST
- **Data Format**: JSON
- **Authentication**: JWT + Supabase Auth
- **Transport**: HTTPS only

### Key Features
- **User Management**: Students, teachers, and administrators
- **Course Management**: Course creation, enrollment, and tracking
- **Scheduling**: Class booking and calendar management
- **Analytics**: Performance metrics and reporting
- **Real-time Updates**: WebSocket support for live data
- **File Operations**: Upload and download capabilities

## Authentication

### Overview
The API uses Supabase Authentication with JWT tokens for secure access control.

### Authentication Flow

#### 1. User Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "student"
  }
}
```

#### 2. Token Usage
Include the access token in the Authorization header:
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 3. Token Refresh
```http
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### User Roles
- **admin**: Full system access
- **teacher**: Teaching and class management access
- **student**: Learning and booking access

### Protected Endpoints
All API endpoints except authentication require valid JWT tokens. Role-based access control applies to specific endpoints.

## Base URLs & Environments

### Production
```
https://api.heypeter-academy.com/v1
```

### Staging
```
https://staging-api.heypeter-academy.com/v1
```

### Development
```
https://dev-api.heypeter-academy.com/v1
```

### Local Development
```
http://localhost:3000/api
```

## Common Headers

### Required Headers
```http
Content-Type: application/json
Authorization: Bearer {access_token}
```

### Optional Headers
```http
X-Request-ID: unique-request-id
X-Client-Version: 1.0.0
Accept-Language: en-US
```

### Response Headers
```http
Content-Type: application/json
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## Error Handling

### Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    },
    "request_id": "req_12345"
  }
}
```

### HTTP Status Codes
- **200**: Success
- **201**: Created
- **400**: Bad Request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **409**: Conflict
- **422**: Unprocessable Entity
- **429**: Too Many Requests
- **500**: Internal Server Error

### Common Error Codes
- `VALIDATION_ERROR`: Invalid input data
- `AUTHENTICATION_FAILED`: Invalid credentials
- `AUTHORIZATION_DENIED`: Insufficient permissions
- `RESOURCE_NOT_FOUND`: Requested resource doesn't exist
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INSUFFICIENT_HOURS`: Not enough hours for booking
- `SCHEDULE_CONFLICT`: Time slot already booked

## Rate Limiting

### Rate Limits
- **General API**: 1000 requests per hour per user
- **Authentication**: 50 requests per hour per IP
- **File Upload**: 100 requests per hour per user
- **Analytics**: 500 requests per hour per user

### Rate Limit Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

### Handling Rate Limits
When rate limit is exceeded:
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded",
    "retry_after": 3600
  }
}
```

## API Endpoints

### Authentication Endpoints

#### POST /auth/login
Authenticate user and get access token.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "jwt_token",
  "refresh_token": "refresh_token",
  "expires_in": 3600,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "student"
  }
}
```

#### POST /auth/signup
Register new user account.

**Request:**
```json
{
  "email": "new@example.com",
  "password": "password123",
  "full_name": "John Doe",
  "role": "student"
}
```

#### POST /auth/refresh
Refresh access token.

#### POST /auth/logout
Invalidate current session.

### User Management Endpoints

#### GET /users/profile
Get current user profile.

**Response:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "full_name": "John Doe",
  "role": "student",
  "created_at": "2024-01-01T00:00:00Z",
  "profile": {
    "photo_url": "https://example.com/photo.jpg",
    "english_level": 5,
    "learning_goals": ["Speaking", "Business English"]
  }
}
```

#### PUT /users/profile
Update user profile.

#### GET /users (Admin only)
List all users with pagination.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `role`: Filter by user role
- `search`: Search by name or email

### Student Management Endpoints

#### GET /students
List students (Admin/Teacher access).

#### GET /students/{id}
Get specific student details.

#### POST /students
Create new student (Admin only).

#### PUT /students/{id}
Update student information.

#### GET /students/{id}/hours
Get student hour balance and history.

**Response:**
```json
{
  "current_balance": 25.5,
  "total_purchased": 60,
  "total_used": 34.5,
  "packages": [
    {
      "id": "pkg_123",
      "hours": 40,
      "purchased_at": "2024-01-01T00:00:00Z",
      "expires_at": "2024-07-01T00:00:00Z"
    }
  ],
  "usage_history": [
    {
      "date": "2024-01-15T10:00:00Z",
      "hours_used": 1.5,
      "class_name": "Business English A1",
      "teacher": "Jane Smith"
    }
  ]
}
```

### Teacher Management Endpoints

#### GET /teachers
List all teachers.

#### GET /teachers/{id}
Get teacher details and availability.

#### PUT /teachers/{id}/availability
Update teacher availability.

**Request:**
```json
{
  "availability": {
    "monday": [
      {"start": "09:00", "end": "12:00"},
      {"start": "14:00", "end": "17:00"}
    ],
    "tuesday": [
      {"start": "09:00", "end": "17:00"}
    ]
  }
}
```

### Course Management Endpoints

#### GET /courses
List available courses.

**Response:**
```json
{
  "courses": [
    {
      "id": "course_123",
      "title": "Business English Intermediate",
      "course_type": "Business English",
      "duration_minutes": 60,
      "max_students": 9,
      "credit_hours": 1.5,
      "description": "Professional communication skills"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "has_more": false
  }
}
```

#### GET /courses/{id}
Get course details.

#### POST /courses (Admin only)
Create new course.

#### PUT /courses/{id} (Admin only)
Update course information.

### Class Management Endpoints

#### GET /classes
List classes with filters.

**Query Parameters:**
- `course_id`: Filter by course
- `teacher_id`: Filter by teacher
- `start_date`: Classes from date
- `end_date`: Classes until date
- `status`: Filter by class status

#### GET /classes/{id}
Get class details including enrollment.

#### POST /classes/book
Book a class (Student only).

**Request:**
```json
{
  "class_id": "class_123",
  "notes": "Looking forward to this class"
}
```

#### DELETE /classes/{id}/booking
Cancel class booking.

### Scheduling Endpoints

#### GET /schedule/availability
Get available time slots.

**Query Parameters:**
- `teacher_id`: Specific teacher availability
- `course_type`: Filter by course type
- `start_date`: From date
- `end_date`: Until date

#### POST /schedule/book-one-on-one
Book 1-on-1 session.

**Request:**
```json
{
  "teacher_id": "teacher_123",
  "start_time": "2024-01-20T10:00:00Z",
  "duration_minutes": 60,
  "focus_areas": ["Business presentations", "Email writing"],
  "notes": "Prepare for upcoming job interview"
}
```

### Analytics Endpoints

#### GET /analytics/student/progress
Get student learning analytics.

**Response:**
```json
{
  "current_level": 6,
  "skills": {
    "speaking": {"level": 6, "progress": 75},
    "listening": {"level": 7, "progress": 20},
    "reading": {"level": 6, "progress": 90},
    "writing": {"level": 5, "progress": 60}
  },
  "classes_completed": 24,
  "hours_studied": 36,
  "achievements": ["Consistent Learner", "Speaking Champion"]
}
```

#### GET /analytics/teacher/performance
Get teacher performance metrics.

#### GET /analytics/admin/dashboard
Get admin dashboard analytics.

### File Upload Endpoints

#### POST /files/upload
Upload file (profile photos, assignments, etc.).

**Request:** Multipart form data
```
file: [binary file data]
type: "profile_photo" | "assignment" | "resource"
```

**Response:**
```json
{
  "file_id": "file_123",
  "url": "https://storage.example.com/files/file_123.jpg",
  "filename": "profile.jpg",
  "size": 1024000,
  "mime_type": "image/jpeg"
}
```

### Health & Monitoring Endpoints

#### GET /health
System health check.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T10:00:00Z",
  "services": {
    "database": "healthy",
    "auth": "healthy",
    "storage": "healthy"
  }
}
```

#### GET /metrics
System metrics (Admin only).

## Data Models

### User Model
```json
{
  "id": "uuid",
  "email": "string",
  "full_name": "string",
  "role": "admin|teacher|student",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### Student Model
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "student_id": "string",
  "internal_code": "string",
  "photo_url": "string",
  "test_level": "string",
  "english_proficiency_level": "integer",
  "enrollment_date": "date",
  "remaining_hours": "decimal",
  "total_course_hours": "integer"
}
```

### Teacher Model
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "bio": "string",
  "hourly_rate": "decimal",
  "availability": "object",
  "specializations": "array"
}
```

### Course Model
```json
{
  "id": "uuid",
  "title": "string",
  "course_type": "string",
  "duration_minutes": "integer",
  "max_students": "integer",
  "credit_hours": "decimal",
  "description": "string",
  "materials_required": "boolean"
}
```

### Class Model
```json
{
  "id": "uuid",
  "course_id": "uuid",
  "teacher_id": "uuid",
  "class_name": "string",
  "capacity": "integer",
  "current_enrollment": "integer",
  "start_time": "datetime",
  "end_time": "datetime",
  "location": "string",
  "meeting_link": "string"
}
```

### Booking Model
```json
{
  "id": "uuid",
  "student_id": "uuid",
  "class_id": "uuid",
  "booking_time": "datetime",
  "status": "confirmed|cancelled|completed",
  "hours_used": "decimal",
  "notes": "string"
}
```

## Webhooks

### Overview
Webhooks allow real-time notifications of events in the platform.

### Webhook Events
- `user.created`: New user registration
- `booking.created`: New class booking
- `booking.cancelled`: Class booking cancellation
- `class.completed`: Class session completed
- `payment.completed`: Hour package purchase
- `leave.requested`: Student leave request

### Webhook Payload
```json
{
  "event": "booking.created",
  "timestamp": "2024-01-20T10:00:00Z",
  "data": {
    "booking_id": "booking_123",
    "student_id": "student_456",
    "class_id": "class_789",
    "booking_time": "2024-01-20T10:00:00Z"
  },
  "signature": "sha256=abc123..."
}
```

### Webhook Configuration
Configure webhooks in admin panel or via API:

```http
POST /webhooks
{
  "url": "https://your-server.com/webhook",
  "events": ["booking.created", "booking.cancelled"],
  "secret": "your-webhook-secret"
}
```

## SDKs & Libraries

### JavaScript/TypeScript SDK
```bash
npm install @heypeter/api-client
```

```typescript
import { HeyPeterAPI } from '@heypeter/api-client';

const api = new HeyPeterAPI({
  baseURL: 'https://api.heypeter-academy.com/v1',
  apiKey: 'your-api-key'
});

// Get user profile
const profile = await api.users.getProfile();

// Book a class
const booking = await api.classes.book({
  classId: 'class_123',
  notes: 'Excited for this class!'
});
```

### Python SDK
```bash
pip install heypeter-api
```

```python
from heypeter_api import HeyPeterAPI

api = HeyPeterAPI(
    base_url='https://api.heypeter-academy.com/v1',
    api_key='your-api-key'
)

# Get student hours
hours = api.students.get_hours(student_id='student_123')
print(f"Remaining hours: {hours['current_balance']}")
```

## Examples

### Complete Booking Flow
```javascript
// 1. Get available classes
const classes = await api.get('/classes', {
  params: {
    course_type: 'Business English',
    start_date: '2024-01-20',
    available_only: true
  }
});

// 2. Check student hours
const hours = await api.get('/students/me/hours');
if (hours.current_balance < 1.5) {
  throw new Error('Insufficient hours');
}

// 3. Book the class
const booking = await api.post('/classes/book', {
  class_id: classes.data[0].id,
  notes: 'Looking forward to learning!'
});

console.log('Booking confirmed:', booking.id);
```

### Teacher Availability Update
```javascript
// Update weekly availability
const availability = {
  monday: [
    { start: '09:00', end: '12:00' },
    { start: '14:00', end: '17:00' }
  ],
  tuesday: [
    { start: '10:00', end: '16:00' }
  ],
  // ... other days
};

await api.put('/teachers/me/availability', { availability });
```

### Student Progress Tracking
```javascript
// Get comprehensive student analytics
const analytics = await api.get('/analytics/student/progress');

console.log(`Current level: ${analytics.current_level}`);
console.log(`Classes completed: ${analytics.classes_completed}`);
console.log(`Speaking progress: ${analytics.skills.speaking.progress}%`);
```

## Testing

### Test Environment
Use the staging environment for testing:
```
https://staging-api.heypeter-academy.com/v1
```

### Test Credentials
```json
{
  "admin": {
    "email": "admin@test.heypeter.com",
    "password": "TestAdmin123!"
  },
  "teacher": {
    "email": "teacher@test.heypeter.com",
    "password": "TestTeacher123!"
  },
  "student": {
    "email": "student@test.heypeter.com",
    "password": "TestStudent123!"
  }
}
```

### Postman Collection
Download our Postman collection for easy API testing:
[HeyPeter Academy API Collection](https://postman.com/heypeter-academy/collections)

### API Testing Best Practices
1. **Use staging environment** for all testing
2. **Test error scenarios** including invalid inputs
3. **Verify rate limits** don't affect your application
4. **Test authentication flows** including token refresh
5. **Validate data models** match your expectations
6. **Test webhook endpoints** with sample payloads

## Support

### Documentation Updates
This documentation is updated regularly. Check the changelog for recent updates.

### API Support
- **Email**: api-support@heypeter-academy.com
- **Documentation**: https://docs.heypeter-academy.com
- **Status Page**: https://status.heypeter-academy.com
- **GitHub Issues**: https://github.com/heypeter-academy/api-issues

### SLA & Support Levels
- **Production**: 99.9% uptime, 24/7 monitoring
- **Response Time**: < 200ms average API response time
- **Support**: Business hours support (Monday-Friday, 9 AM - 6 PM GMT)
- **Emergency**: 24/7 emergency support for critical issues

---

*This API documentation is version 1.0 and is subject to updates. Always refer to the latest version for accurate information.*