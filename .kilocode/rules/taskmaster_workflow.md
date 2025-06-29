# TaskMaster AI Workflow Standards

## Task Management Requirements

### TaskMaster Integration Standards
- **ALWAYS** use TaskMaster AI for complex project task management
- **ALWAYS** update task status immediately upon completion
- **ALWAYS** run unit tests before marking tasks as "done"
- Maintain systematic task organization with clear dependencies

### Task Organization Structure
```
.taskmaster/
├── tasks/
│   ├── tasks.json              # Main task database
│   ├── task_[ID].txt           # Individual task files
│   └── [feature-tasks]/        # Feature-specific task groups
├── docs/
│   ├── prd.txt                 # Product Requirements Document
│   └── research/               # Research documentation
└── reports/
    └── task-complexity-report.json
```

### Task Implementation Workflow
1. **Task Analysis**: Review task details, dependencies, and complexity
2. **Implementation**: Write code following established standards
3. **Testing**: Create comprehensive unit tests (minimum 80% coverage)
4. **Documentation**: Create focused, essential documentation
5. **Systematic Commits**: Organize commits logically
6. **Status Update**: Mark task as "done" in TaskMaster

### Subtask Management
- Expand complex tasks (complexity score > 7) into subtasks
- Use TaskMaster `expand_task` for systematic subtask generation
- Complete subtasks in dependency order
- Update parent task status based on subtask completion

### Task Documentation Standards
- **Limit one primary doc per task ID**
- Create implementation docs for complex features
- Include usage examples and configuration guides
- Focus on developer-essential information only

## Engineering Workflow Integration

### Pre-Implementation Phase
```bash
# 1. Check current task
taskmaster get-task [id]

# 2. Review dependencies
taskmaster get-tasks --status pending

# 3. Analyze complexity if needed
taskmaster analyze-project-complexity
```

### Implementation Phase
```bash
# 4. Run existing tests
pnpm test

# 5. Implement feature with tests
# [Development work]

# 6. Run tests before commit
pnpm test

# 7. Systematic Git commits
git add [files]
git commit -m "feat(scope): implementation"
git commit -m "test(scope): comprehensive test suite"
git commit -m "docs(scope): documentation"
git commit -m "chore: configuration updates"
```

### Post-Implementation Phase
```bash
# 8. Update task status
taskmaster set-task-status [id] done

# 9. Check next task
taskmaster next-task

# 10. Push to repository
git push origin main
```

### Task Complexity Guidelines
- **Score 1-3**: Simple implementation, minimal testing
- **Score 4-6**: Standard implementation with unit tests
- **Score 7-8**: Complex implementation, expand into subtasks
- **Score 9-10**: High complexity, mandatory subtask expansion

### Research Integration
- Use TaskMaster research capabilities for complex features
- Save research results to specific tasks when relevant
- Include research context in implementation decisions
- Document research findings in task details

## Project Standards Compliance

### Firebase/Supabase Integration Tasks
- Implement security rules with comprehensive testing
- Create hybrid RBAC/ABAC access control systems
- Test authentication flows and authorization rules
- Document deployment procedures and configurations

### Monorepo Package Management
- Follow package-specific testing requirements
- Update package.json dependencies systematically
- Test package integration across monorepo
- Maintain consistent TypeScript configurations

### Performance and Security Standards
- Implement rate limiting for API endpoints
- Use proper error handling with specific error types
- Test security rules with edge cases and boundary conditions
- Monitor query performance and optimize as needed

### Documentation Requirements per Task Type
- **Authentication Features**: Security model, usage examples, deployment
- **Database Integration**: Schema design, access patterns, security rules
- **API Development**: Endpoint documentation, request/response formats
- **UI Components**: Component API, styling guidelines, accessibility

## Quality Assurance Integration

### Automated Testing Requirements
- Unit tests for all new functions and components
- Integration tests for service interactions
- Security tests for authentication and authorization
- Performance tests for critical data paths

### Code Review Standards
- Review security implications of database rules
- Validate test coverage meets minimum requirements
- Ensure documentation completeness before task completion
- Check for proper error handling and input validation

### Deployment Readiness Checklist
- [ ] All tests passing
- [ ] Security rules validated
- [ ] Documentation complete
- [ ] Task status updated in TaskMaster
- [ ] Git commits organized systematically
- [ ] Performance benchmarks within acceptable limits