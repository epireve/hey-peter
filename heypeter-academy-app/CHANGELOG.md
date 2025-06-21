# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2025-06-21

### Added
- Initial setup of the Next.js project.
- Implemented user authentication with Supabase, including login and sign-up forms.
- Created a basic admin portal layout with a sidebar and main content area.
- Added UI components from shadcn/ui: Button, Card, Input, and Label.
- Implemented password reset and update functionality.

### Fixed
- Resolved dependency conflicts by downgrading Next.js and other packages.
- Fixed development server startup error by removing the `--turbopack` flag.
- Corrected import paths for UI components.
- Addressed environment variable issues for Supabase integration.