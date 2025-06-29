# Kilo Code Custom Rules

This directory contains project-specific custom rules that define our engineering workflow and standards. These rules ensure consistent development practices, code quality, and systematic project management.

## Rule Files

### Core Workflow Rules
- **[git_workflow.md](./git_workflow.md)** - Git commit standards and systematic organization
- **[testing_standards.md](./testing_standards.md)** - Unit testing requirements and test organization
- **[documentation_standards.md](./documentation_standards.md)** - Documentation standards and guidelines
- **[code_quality.md](./code_quality.md)** - Code quality, security, and performance standards
- **[taskmaster_workflow.md](./taskmaster_workflow.md)** - TaskMaster AI integration and task management
- **[release_management.md](./release_management.md)** - Product-focused release management and changelog standards

## Rule Structure

Each rule file follows a consistent Markdown format with:
- **ALWAYS/NEVER** statements for critical requirements
- Code examples and templates
- Best practices and guidelines
- Tool-specific configurations and commands

## Key Principles

### Quality Assurance
- **ALWAYS** test code before committing
- **ALWAYS** write unit tests for new features
- **NEVER** commit broken or untested code
- Maintain minimum 80% test coverage for critical components

### Systematic Organization
- Use conventional commit format with detailed descriptions
- Organize commits into logical groups (implementation, testing, docs, config)
- Follow consistent file naming and directory structure
- Update TaskMaster task status immediately upon completion

### Documentation Standards
- **Limit one primary doc per task ID**
- Be stingy but effective with documentation
- Focus on essential developer information
- Update docs immediately when code changes

### Security and Performance
- **NEVER** hardcode credentials or secrets
- **ALWAYS** validate user permissions before data access
- Implement rate limiting for API endpoints
- Use proper error handling with specific error types

## Integration with AI Tools

These rules are automatically loaded by Kilo Code AI to ensure consistent behavior across all development sessions. The AI will:
- Follow systematic Git workflow patterns
- Enforce testing requirements before commits
- Apply code quality standards automatically
- Integrate with TaskMaster for task management
- Generate documentation according to established standards

## Rule Maintenance

- Update rules when new best practices are established
- Review rules during major project changes
- Ensure rules remain current with technology updates
- Document rule changes in commit messages