# Changelog

All notable changes to the HeyPeter Academy LMS project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Teacher Portal components with comprehensive test coverage
  - Teacher Dashboard Layout with responsive navigation
  - Class Hour Tracking with filtering and sorting
  - Availability Scheduler for weekly time slot management
  - Weekly Timetable with multiple view modes (week/day/list)
  - Compensation Display with earnings tracking and bonus management
  - Teacher Analytics Dashboard with performance metrics and charts
  - Export Functionality for data export (CSV, Excel, PDF formats)
  - Bonus Rules Display with eligibility tracking and progress indicators
- Docker support for isolated development environment
  - Development and production Docker configurations
  - Docker Compose orchestration
  - Helper scripts for easy container management
- New UI components for enhanced Teacher Portal functionality
  - Collapsible component for expandable content sections
  - Tooltip component for contextual information display
  - Export utilities with multi-format support (CSV, Excel, PDF)
- Comprehensive documentation
  - Installation guide (INSTALLATION.md)
  - Docker setup guide (DOCKER.md)
  - Updated README with project overview
  - Enhanced CLAUDE.md with Docker commands

### Changed
- Updated Next.js from 14.2.30 to 15.3.5
- Updated React from 18.3.1 to 19.0.0-rc.1
- Updated React DOM from 18.3.1 to 19.0.0-rc.1
- Migrated authentication to use Supabase Auth Helpers
- Updated middleware for proper cookie-based authentication
- Enhanced Next.js config for Docker support (standalone output)

### Fixed
- Login authentication issue - implemented proper Supabase authentication
- Fixed icon passing error in admin dashboard (server/client component boundary)
- Resolved database migration dependencies
- TypeScript errors in admin layout

### Removed
- Removed studio_ prefixed tables from database (belonged to different project)
- Disabled unrelated migration file (studio_schema.sql)

## [0.1.0] - 2025-01-10

### Added
- Database schema implementation with 19 core tables
  - User management (users, students, teachers)
  - Course system (courses, classes, schedules)
  - Booking and attendance tracking
  - Material management
  - Audit logging and system events
- Row Level Security (RLS) policies
- Database views and functions
- Comprehensive indexes for performance

### Fixed
- SQL migration dependency issues
- Database table creation order

## [0.0.1] - 2025-06-21

### Added
- Initial setup of the Next.js project
- Implemented user authentication with Supabase, including login and sign-up forms
- Created a basic admin portal layout with a sidebar and main content area
- Added UI components from shadcn/ui: Button, Card, Input, and Label
- Implemented password reset and update functionality

### Fixed
- Resolved dependency conflicts by downgrading Next.js and other packages
- Fixed development server startup error by removing the `--turbopack` flag
- Corrected import paths for UI components
- Addressed environment variable issues for Supabase integration