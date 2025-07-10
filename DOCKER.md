# Docker Setup for HeyPeter Academy

This project is dockerized to provide isolation from other projects and ensure consistent environments.

## Prerequisites

- Docker Desktop installed and running
- `.env.local` file with your Supabase credentials

## Quick Start

### Development Environment

```bash
# Start development environment with hot reloading
./scripts/docker-dev.sh

# View logs
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f app

# Stop all containers
./scripts/docker-stop.sh
```

### Production Environment

```bash
# Start production environment
./scripts/docker-prod.sh

# View logs
docker-compose logs -f app

# Stop production
docker-compose down
```

## Services

### Development Mode
- **Next.js App**: http://localhost:3000 (with hot reloading)
- **Supabase DB**: localhost:5432 (optional local database)
- **Supabase Studio**: http://localhost:54323 (optional database UI)

### Production Mode
- **Next.js App**: http://localhost:3000 (optimized build)

## Configuration

### Environment Variables
Create a `.env.local` file with:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
DATABASE_URL=postgresql://postgres:password@host:5432/postgres
SUPABASE_DB_PASSWORD=your-password
```

### Using Remote Supabase (Recommended)
The default setup connects to your remote Supabase instance. This is recommended for most use cases.

### Using Local Supabase (Optional)
To use a fully local Supabase instance, uncomment the `supabase-db` and `supabase-studio` services in `docker-compose.dev.yml`.

## Docker Commands

### Build Images
```bash
# Development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml build

# Production
docker-compose build
```

### Container Management
```bash
# View running containers
docker ps

# View logs for specific service
docker-compose logs -f app

# Execute commands in container
docker-compose exec app npm run test

# Remove all containers and volumes
docker-compose down -v
```

### Troubleshooting

#### Port Already in Use
If port 3000 is already in use:
```bash
# Find process using port
lsof -i :3000

# Kill the process
kill -9 <PID>
```

#### Clean Docker Resources
```bash
# Remove all stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove all unused resources
docker system prune -a
```

## Benefits

1. **Isolation**: No conflicts with other projects
2. **Consistency**: Same environment everywhere
3. **Easy Setup**: One command to start
4. **Resource Control**: Better memory/CPU management
5. **Multi-Project**: Run multiple projects simultaneously

## Network Architecture

The Docker setup creates an isolated network (`heypeter-network`) that:
- Prevents conflicts with other Docker projects
- Allows services to communicate internally
- Provides secure isolation from host network

## Performance Tips

1. **Allocate Docker Resources**: In Docker Desktop settings, allocate at least 4GB RAM
2. **Use .dockerignore**: Excludes unnecessary files from build context
3. **Volume Mounts**: Development uses selective mounts for faster rebuilds
4. **Standalone Build**: Production uses Next.js standalone mode for smaller images