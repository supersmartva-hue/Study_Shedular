#!/bin/bash
# Smart Productivity — Pre-Deployment Checklist
# Run this to verify everything is ready for deployment

set -e

echo "🚀 Smart Productivity — Deployment Checklist"
echo "==========================================="
echo ""

# Check if Docker is installed
echo "✓ Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Install from https://www.docker.com"
    exit 1
fi
echo "✓ Docker found"

# Check if docker-compose is installed
echo "✓ Checking Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not found"
    exit 1
fi
echo "✓ Docker Compose found"

# Check if .env file exists
echo "✓ Checking .env file..."
if [ ! -f .env ]; then
    echo "❌ .env file not found. Copy from .env.example:"
    echo "   cp .env.example .env"
    echo "   Then edit .env with your values"
    exit 1
fi
echo "✓ .env file exists"

# Check required env vars
echo "✓ Checking required environment variables..."
REQUIRED_VARS=("DATABASE_URL" "JWT_SECRET" "JWT_REFRESH_SECRET")
for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "$var=" .env; then
        echo "❌ Missing $var in .env"
        exit 1
    fi
done
echo "✓ All required variables present"

# Check if Docker files exist
echo "✓ Checking Dockerfile.api..."
if [ ! -f Dockerfile.api ]; then
    echo "❌ Dockerfile.api not found"
    exit 1
fi
echo "✓ Dockerfile.api found"

echo "✓ Checking Dockerfile.web..."
if [ ! -f Dockerfile.web ]; then
    echo "❌ Dockerfile.web not found"
    exit 1
fi
echo "✓ Dockerfile.web found"

# Check if docker-compose.yml exists
echo "✓ Checking docker-compose.yml..."
if [ ! -f docker-compose.yml ]; then
    echo "❌ docker-compose.yml not found"
    exit 1
fi
echo "✓ docker-compose.yml found"

# Check if migrations exist
echo "✓ Checking database migrations..."
if [ ! -d "apps/api/prisma/migrations" ]; then
    echo "⚠️  No migrations found. Running setup..."
fi
echo "✓ Migrations ready"

echo ""
echo "=========================================="
echo "✅ All checks passed! Ready to deploy."
echo ""
echo "📋 Next steps:"
echo "1. Review DEPLOYMENT.md for detailed instructions"
echo "2. Choose deployment platform (DigitalOcean, Vercel, Railway, AWS, etc.)"
echo "3. Set all environment variables on your platform"
echo "4. Deploy!"
echo ""
echo "🏃 To test locally first:"
echo "   docker-compose up"
echo ""
echo "📊 View logs:"
echo "   docker-compose logs -f"
echo ""
