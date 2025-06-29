# Code Quality Standards

## General Code Quality Requirements

### Code Structure and Organization
- **ALWAYS** follow consistent file naming conventions
- **ALWAYS** organize code in logical directory structures
- **ALWAYS** use TypeScript for type safety in JavaScript projects
- **NEVER** leave commented-out code in production commits
- Maintain clean, readable, and self-documenting code

### File Naming Conventions
- Use kebab-case for directories: `api-client`, `auth-service`
- Use camelCase for TypeScript/JavaScript files: `authService.ts`, `userProfile.tsx`
- Use PascalCase for React components: `UserProfile.tsx`, `AuthContext.tsx`
- Use descriptive names that indicate purpose: `firebase-auth.test.ts`

### Code Formatting Standards
- Use Prettier for consistent code formatting
- Configure ESLint for code quality enforcement
- Maintain consistent indentation (2 spaces)
- Remove trailing whitespace and ensure final newlines
- Use semicolons consistently in TypeScript/JavaScript

### TypeScript Best Practices
- **ALWAYS** use strict TypeScript configuration
- **ALWAYS** define explicit types for function parameters and returns
- **NEVER** use `any` type unless absolutely necessary
- Prefer interfaces over type aliases for object shapes
- Use proper generic types for reusable components

### Error Handling Standards
```typescript
// Proper error handling with specific error types
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  if (error instanceof SpecificError) {
    // Handle specific error
  }
  throw new ApplicationError('Operation failed', { cause: error });
}
```

### Import Organization
```typescript
// 1. Node modules
import React from 'react';
import { NextPage } from 'next';

// 2. Internal packages
import { Button } from '@mysakinah/ui';
import { validateUser } from '@mysakinah/utils';

// 3. Relative imports
import { AuthContext } from '../context/AuthContext';
import './styles.css';
```

### Function and Variable Naming
- Use descriptive, intention-revealing names
- Use verbs for functions: `getUserProfile`, `validateInput`
- Use nouns for variables: `userProfile`, `authToken`
- Use boolean naming conventions: `isValid`, `hasPermission`, `canAccess`

### Code Comments Guidelines
- Write comments for complex business logic
- Explain "why" not "what" in comments
- Use JSDoc for function documentation
- Remove TODO comments before committing
- Keep comments up-to-date with code changes

## Security Code Standards

### Authentication and Authorization
- **NEVER** hardcode credentials or secrets
- **ALWAYS** validate user permissions before data access
- **ALWAYS** sanitize user inputs
- Use environment variables for sensitive configuration
- Implement proper session management

### Data Validation
```typescript
// Input validation example
const validateUserInput = (input: unknown): UserInput => {
  const schema = z.object({
    email: z.string().email(),
    name: z.string().min(1).max(100),
  });
  
  return schema.parse(input);
};
```

### Secure API Practices
- Implement rate limiting for API endpoints
- Use HTTPS for all external communications
- Validate and sanitize all API inputs
- Implement proper CORS policies
- Log security-relevant events

## Performance Standards

### Database Queries
- Use indexed fields for query optimization
- Implement proper pagination for large datasets
- Avoid N+1 query problems
- Use connection pooling for database connections
- Monitor query performance in production

### Frontend Performance
- Implement code splitting for large applications
- Use lazy loading for non-critical components
- Optimize images and static assets
- Minimize bundle sizes
- Implement proper caching strategies

### Memory Management
- Dispose of event listeners and subscriptions
- Avoid memory leaks in long-running processes
- Use proper garbage collection practices
- Monitor memory usage in production environments