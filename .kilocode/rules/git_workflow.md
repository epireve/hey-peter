# Git Workflow Rules

## Systematic Git Commit Organization

### Commit Sequence Requirements
- **ALWAYS** test code before pushing to Git
- **ALWAYS** run unit tests and ensure they pass before committing
- **NEVER** commit broken or untested code
- Organize commits systematically with clear, descriptive messages

### Commit Message Standards
Follow conventional commit format with detailed descriptions:

```
<type>(<scope>): <subject>

- <detailed point 1>
- <detailed point 2>
- <detailed point 3>
- <summary line indicating completion status>
```

#### Commit Types
- `feat`: New feature implementation
- `fix`: Bug fixes
- `test`: Adding or updating tests
- `docs`: Documentation changes
- `chore`: Maintenance tasks, dependency updates
- `refactor`: Code refactoring without feature changes
- `style`: Code formatting, linting fixes

#### Commit Scope Examples
- `firebase`: Firebase-related changes
- `supabase`: Supabase-related changes
- `auth`: Authentication features
- `api`: API client changes
- `ui`: User interface components
- `config`: Configuration updates

### Multi-Commit Task Organization
For complex tasks, organize into systematic commits:

1. **Core Implementation Commit**: Main feature/functionality
2. **Testing Commit**: Comprehensive test suite
3. **Documentation Commit**: README, guides, and documentation
4. **Configuration Commit**: Project config updates, dependencies

### Pre-Commit Checklist
- [ ] Code compiles without errors
- [ ] All existing tests pass
- [ ] New tests written and passing
- [ ] Code follows project standards
- [ ] Documentation updated if needed
- [ ] No sensitive data or credentials included

### Branch Protection
- Test locally before pushing to main branch
- Ensure clean commit history
- Use meaningful commit messages that explain the "why" not just the "what"

## Git Commands Best Practices

### Safe Testing Sequence
```bash
# 1. Run tests first
npm test
# or
pnpm test

# 2. Check git status
git status

# 3. Add files systematically
git add <specific-files>

# 4. Commit with descriptive message
git commit -m "type(scope): description"

# 5. Push only after verification
git push origin main
```

### File Staging Strategy
- Add files in logical groups
- Review changes before committing: `git diff --cached`
- Use specific file paths instead of `git add .` when possible
- Exclude temporary files, logs, and build artifacts