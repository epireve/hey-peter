# Documentation Standards

## Documentation Requirements

### Mandatory Documentation for New Features
- **ALWAYS** create documentation before marking tasks as complete
- **ALWAYS** update existing docs when modifying functionality
- Be stingy but effective with documentation - quality over quantity
- Focus on essential information that developers need

### Documentation Structure
```
packages/[package-name]/
├── README.md                    # Main package documentation
├── src/
│   ├── [feature]/
│   │   ├── README.md           # Feature-specific docs
│   │   └── [feature-name].md   # Detailed implementation docs
│   └── __tests__/
│       └── README.md           # Testing documentation
```

### Documentation Types
- **README.md**: Overview, setup, usage examples
- **Implementation Docs**: Technical details, architecture decisions
- **API Documentation**: Function signatures, parameters, return values
- **Deployment Guides**: Step-by-step deployment instructions
- **Troubleshooting**: Common issues and solutions

### Documentation Standards per Task
- **Limit one primary doc per task ID**
- **Additional docs only when absolutely necessary**
- **Ultra-think before creating multiple docs**
- **Consolidate related information when possible**

### Content Guidelines
- Start with clear purpose and scope
- Include practical usage examples
- Document configuration options and parameters
- Provide troubleshooting sections for complex features
- Link to related documentation and external resources

### Technical Documentation Format
```markdown
# Feature Name

## Overview
Brief description of what this feature does and why it exists.

## Usage
Basic usage examples with code snippets.

## Configuration
Configuration options and parameters.

## Examples
Practical implementation examples.

## Troubleshooting
Common issues and solutions.
```

### API Documentation Format
```markdown
## Function Name
Brief description of the function's purpose.

### Parameters
- `param1` (type): Description
- `param2` (type, optional): Description

### Returns
- `returnType`: Description of return value

### Example
```typescript
const result = functionName(param1, param2);
```
```

### Deployment Documentation
- Step-by-step instructions
- Prerequisites and requirements
- Configuration examples
- Verification steps
- Rollback procedures

### Documentation Maintenance
- Update docs immediately when code changes
- Review documentation during code reviews
- Remove outdated information promptly
- Keep examples current and functional