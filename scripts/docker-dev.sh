#!/bin/bash

# Script to run the development environment with Docker

echo "🚀 Starting HeyPeter Academy Development Environment..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  Warning: .env.local file not found!"
    echo "📝 Creating .env.local from .env..."
    cp .env .env.local
    echo "Please update .env.local with your database credentials"
fi

# Export environment variables from .env.local
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Stop any existing containers
echo "🧹 Cleaning up existing containers..."
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down

# Build and start the development environment
echo "🔨 Building development containers..."
docker-compose -f docker-compose.yml -f docker-compose.dev.yml build

echo "🚀 Starting development containers..."
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 5

# Show container status
echo "📊 Container Status:"
docker-compose -f docker-compose.yml -f docker-compose.dev.yml ps

echo ""
echo "✅ Development environment is ready!"
echo "🌐 Next.js App: http://localhost:3000"
echo "🗄️  Database: localhost:5432 (if using local Supabase)"
echo "📊 Supabase Studio: http://localhost:54323 (if enabled)"
echo ""
echo "📝 View logs: docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f app"
echo "🛑 Stop: ./scripts/docker-stop.sh"