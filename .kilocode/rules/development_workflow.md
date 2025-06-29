---
description: "Defines the standard development workflow, including documentation, versioning, and version control."
globs: ["**/*"]
alwaysApply: true
---

# Development Workflow

This document outlines the standard process for developing this project.

- **Task-Based Commits**
  - All commits should be associated with a specific task.
  - Commit messages should be clear and concise, and should reference the task ID.

- **Documentation**
  - Before starting a new task, ensure that the previous task is documented.
  - Documentation should be product-focused and explain the feature from a user's perspective.

- **Changelog**
  - Maintain a `CHANGELOG.md` file.
  - After a feature is complete and committed, add an entry to the `CHANGELOG.md` file.
  - The changelog should be versioned, starting with `0.0.1`.