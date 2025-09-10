#!/bin/bash

# BS Platform - API Core Docker Build Script
# Usage: ./docker-build.sh [dev|prod|test]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="bs-api-core"
IMAGE_NAME="bs-platform/api-core"
VERSION=${VERSION:-"latest"}
ENVIRONMENT=${1:-"dev"}

echo -e "${BLUE}BS Platform - API Core Docker Build Script${NC}"
echo -e "${BLUE}===========================================${NC}"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Validate environment
case $ENVIRONMENT in
    dev|development)
        COMPOSE_FILE="docker-compose.yml -f docker-compose.dev.yml"
        BUILD_CONFIG="Debug"
        print_status "Building for DEVELOPMENT environment"
        ;;
    prod|production)
        COMPOSE_FILE="docker-compose.yml -f docker-compose.prod.yml"
        BUILD_CONFIG="Release"
        print_status "Building for PRODUCTION environment"
        ;;
    test)
        COMPOSE_FILE="docker-compose.yml"
        BUILD_CONFIG="Release"
        print_status "Building for TEST environment"
        ;;
    *)
        print_error "Invalid environment: $ENVIRONMENT"
        print_error "Usage: $0 [dev|prod|test]"
        exit 1
        ;;
esac

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "docker-compose is not installed. Please install docker-compose and try again."
    exit 1
fi

print_status "Stopping existing containers..."
docker-compose -f $COMPOSE_FILE down --remove-orphans || true

print_status "Building Docker image..."
docker-compose -f $COMPOSE_FILE build --no-cache \
    --build-arg BUILD_CONFIGURATION=$BUILD_CONFIG \
    --build-arg VERSION=$VERSION

print_status "Tagging image..."
docker tag ${APP_NAME}:latest $IMAGE_NAME:$VERSION
docker tag ${APP_NAME}:latest $IMAGE_NAME:latest

if [ "$ENVIRONMENT" = "prod" ] || [ "$ENVIRONMENT" = "production" ]; then
    docker tag ${APP_NAME}:latest $IMAGE_NAME:prod
fi

print_status "Starting services..."
docker-compose -f $COMPOSE_FILE up -d

print_status "Waiting for services to be healthy..."
sleep 10

# Check service health
if docker-compose -f $COMPOSE_FILE ps | grep -q "Up (healthy)"; then
    print_status "Services are running and healthy!"
else
    print_warning "Services are starting. Check logs with: docker-compose logs"
fi

print_status "Build completed successfully!"
print_status "Image: $IMAGE_NAME:$VERSION"
print_status "Access the API at: http://localhost:5000"

echo -e "${BLUE}===========================================${NC}"
echo -e "${GREEN}Useful commands:${NC}"
echo -e "  View logs:     ${YELLOW}docker-compose -f $COMPOSE_FILE logs -f${NC}"
echo -e "  Stop services: ${YELLOW}docker-compose -f $COMPOSE_FILE down${NC}"
echo -e "  View status:   ${YELLOW}docker-compose -f $COMPOSE_FILE ps${NC}"
echo -e "  Shell access:  ${YELLOW}docker-compose -f $COMPOSE_FILE exec bs-api-core sh${NC}"
