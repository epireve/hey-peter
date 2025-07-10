#!/bin/bash

# Script to run the production environment with Docker

echo "🚀 Starting HeyPeter Academy Production Environment..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ Error: .env.local file not found!"
    echo "Please create .env.local with your production credentials"
    exit 1
fi

# Export environment variables from .env.local
export $(cat .env.local | grep -v '^#' | xargs)

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Build the production image
echo "🔨 Building production image..."
docker-compose build

# Start the production container
echo "🚀 Starting production container..."
docker-compose up -d

# Wait for service to be ready
echo "⏳ Waiting for service to be ready..."
sleep 5

# Show container status
echo "📊 Container Status:"
docker-compose ps

echo ""
echo "✅ Production environment is ready!"
echo "🌐 Application: http://localhost:3000"
echo ""
echo "📝 View logs: docker-compose logs -f app"
echo "🛑 Stop: docker-compose down"