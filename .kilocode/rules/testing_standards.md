# Testing Standards

## Unit Testing Requirements

### Mandatory Testing Before Commits
- **ALWAYS** write unit tests for new features and functions
- **ALWAYS** run full test suite before committing code
- **NEVER** commit code without passing tests
- Maintain minimum 80% test coverage for critical components

### Test Organization Structure
```
packages/
├── [package-name]/
│   ├── src/
│   │   ├── __tests__/
│   │   │   ├── setup.ts
│   │   │   ├── [feature].test.ts
│   │   │   └── integration/
│   │   └── [source-files]
│   └── jest.config.js
```

### Test Categories
- **Unit Tests**: Individual function/component testing
- **Integration Tests**: Service and API interaction testing
- **Security Tests**: Authentication, authorization, and access control
- **Performance Tests**: Load and stress testing for critical paths

### Testing Frameworks and Tools
- **Jest**: Primary testing framework for JavaScript/TypeScript
- **Firebase Rules Unit Testing**: `@firebase/rules-unit-testing` for Firestore security rules
- **Supabase Testing**: `@supabase/supabase-js` for Supabase database interactions
- **Cypress**: End-to-end testing for web applications
- **React Testing Library**: Component testing for React applications
- **Supertest**: API endpoint testing

### Test Naming Conventions
```typescript
describe('[Component/Service Name]', () => {
  describe('[Method/Function Name]', () => {
    it('should [expected behavior] when [condition]', () => {
      // Test implementation
    });
  });
});
```

### Test File Standards
- Use `.test.ts` or `.test.tsx` extensions
- Mirror source directory structure in `__tests__/` folder
- Include setup and teardown in `setup.ts` files
- Group related tests in `describe` blocks

### Security Testing Requirements
- Test authentication flows and token validation
- Validate authorization rules and access controls
- Test input sanitization and validation
- Verify data encryption and secure storage

### Performance Testing Guidelines
- Test database query performance
- Validate API response times
- Monitor memory usage in long-running operations
- Test concurrent user scenarios

## Test Execution Commands

### Pre-Commit Testing Sequence
```bash
# Run all tests in package
pnpm test

# Run tests with coverage
pnpm test -- --coverage

# Run specific test file
pnpm test -- [test-file-name]

# Run tests in watch mode during development
pnpm test -- --watch
```

### Continuous Integration
- All tests must pass in CI/CD pipeline
- Automated testing on pull requests
- Coverage reports generated and tracked
- Performance benchmarks monitored