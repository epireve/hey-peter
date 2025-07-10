#!/bin/bash

# Script to stop Docker containers

echo "🛑 Stopping HeyPeter Academy containers..."

# Stop containers
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down

# Optional: Remove volumes (uncomment if you want to clear data)
# docker-compose -f docker-compose.yml -f docker-compose.dev.yml down -v

echo "✅ All containers stopped successfully!"