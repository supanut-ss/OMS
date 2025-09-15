# BS Platform API Core - Docker Guide

This guide provides comprehensive instructions for containerizing and deploying the BS Platform API Core service using Docker.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Docker Files Overview](#docker-files-overview)
- [Build and Run](#build-and-run)
- [Environment Configurations](#environment-configurations)
- [Database Setup](#database-setup)
- [Monitoring and Logging](#monitoring-and-logging)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

## 🚀 Prerequisites

Before you begin, ensure you have the following installed:

- **Docker Desktop** (Windows/Mac) or **Docker Engine** (Linux)
- **Docker Compose** v2.0 or higher
- **Git** for cloning the repository
- **PowerShell** (Windows) or **Bash** (Linux/Mac)

### System Requirements

- **RAM**: Minimum 4GB (8GB recommended)
- **Storage**: At least 10GB free space
- **Network**: Internet access for downloading base images

## ⚡ Quick Start

### Option 1: Using PowerShell Script (Recommended for Windows)

```powershell
# Development environment
.\docker-build.ps1 dev

# Production environment
.\docker-build.ps1 prod

# Show help
.\docker-build.ps1 -Help
```

### Option 2: Using Makefile (Linux/Mac/Windows with Make)

```bash
# Development environment
make build

# Production environment
make prod

# Show all available commands
make help
```

### Option 3: Using Docker Compose Directly

```bash
# Development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build

# Production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

## 📁 Docker Files Overview

| File                      | Purpose                                              |
| ------------------------- | ---------------------------------------------------- |
| `Dockerfile`              | Multi-stage build configuration for the API          |
| `.dockerignore`           | Files and directories to exclude from Docker context |
| `docker-compose.yml`      | Base compose configuration                           |
| `docker-compose.dev.yml`  | Development environment overrides                    |
| `docker-compose.prod.yml` | Production environment overrides                     |
| `docker-build.ps1`        | PowerShell build script                              |
| `docker-build.sh`         | Bash build script                                    |
| `Makefile`                | Simplified command interface                         |

## 🏗️ Build and Run

### Development Environment

The development environment includes:

- Hot reload capabilities
- Debug configuration
- Development database with test data
- Relaxed security settings
- Detailed logging

```powershell
# Start development environment
.\docker-build.ps1 dev

# Or using make
make dev

# Check status
docker-compose ps

# View logs
docker-compose logs -f bs-api-core
```

### Production Environment

The production environment includes:

- Optimized builds
- Security hardening
- Resource limits
- Health checks
- Nginx reverse proxy

```powershell
# Start production environment
.\docker-build.ps1 prod

# Or using make
make prod
```

## 🌍 Environment Configurations

### Environment Variables

Create a `.env` file in the project root:

```env
# Database Configuration
SQL_SA_PASSWORD=YourStrong@Passw0rd
SQL_DATABASE=BSPlatform
SQL_TRUSTED_CONNECTION=false

# Redis Configuration
REDIS_PASSWORD=YourRedisPassword
REDIS_CONNECTION_STRING=localhost:6379

# Application Settings
ASPNETCORE_ENVIRONMENT=Development
JWT_SECRET_KEY=YourJwtSecretKey
JWT_ISSUER=BSPlatform
JWT_AUDIENCE=BSPlatformAPI

# Logging
LOG_LEVEL=Information
LOG_FILE_PATH=/app/logs

# CORS Settings
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### Service Ports

| Service    | Development | Production     |
| ---------- | ----------- | -------------- |
| API Core   | 5000:8080   | 80:80, 443:443 |
| SQL Server | 1433:1433   | 1433:1433      |
| Redis      | 6379:6379   | 6379:6379      |

## 🗄️ Database Setup

### Automatic Setup

The Docker Compose configuration automatically sets up SQL Server with:

- Initial database creation
- Sample data loading (development)
- Backup and restore capabilities

### Manual Database Operations

```bash
# Connect to database
docker-compose exec sqlserver /opt/mssql-tools/bin/sqlcmd -S localhost -U sa

# Backup database
make backup-db

# Restore database
make restore-db

# Run SQL scripts
docker-compose exec sqlserver /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -i /path/to/script.sql
```

## 📊 Monitoring and Logging

### Health Checks

Health checks are configured for all services:

```bash
# Check service health
make health

# View detailed status
docker-compose ps
```

### Logging

```bash
# View all logs
make logs

# View API logs only
make logs-api

# View database logs
make logs-db

# Follow logs in real-time
docker-compose logs -f
```

### Log Locations

- **API Logs**: `/app/logs` (mounted to `./logs`)
- **Database Logs**: Docker container logs
- **Nginx Logs**: `/var/log/nginx` (production)

## 🚀 Production Deployment

### Prerequisites for Production

1. **SSL Certificates**: Place SSL certificates in `./nginx/ssl/`
2. **Environment Variables**: Configure production `.env` file
3. **Database**: Set up production database credentials
4. **Monitoring**: Configure external monitoring solutions

### Production Checklist

- [ ] SSL certificates configured
- [ ] Environment variables set
- [ ] Database backups scheduled
- [ ] Monitoring configured
- [ ] Log aggregation set up
- [ ] Resource limits configured
- [ ] Security scanning completed

### Deployment Steps

```bash
# 1. Build production images
make prod

# 2. Verify health
make health

# 3. Run tests (if available)
make test

# 4. Monitor deployment
make logs
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Port Already in Use

```bash
# Check what's using the port
netstat -ano | findstr :5000

# Stop conflicting services
docker-compose down
```

#### 2. Database Connection Issues

```bash
# Check database status
docker-compose exec sqlserver /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -Q "SELECT 1"

# Restart database service
docker-compose restart sqlserver
```

#### 3. Build Failures

```bash
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache
```

#### 4. Memory Issues

```bash
# Check resource usage
docker stats

# Increase Docker memory limits in Docker Desktop settings
```

### Debugging Commands

```bash
# Shell access to API container
make shell

# Check container logs
docker logs bs-api-core

# Inspect container
docker inspect bs-api-core

# Check network connectivity
docker-compose exec bs-api-core wget -O- http://sqlserver:1433
```

### Performance Optimization

1. **Resource Limits**: Adjust CPU and memory limits in production compose
2. **Image Optimization**: Use multi-stage builds and Alpine base images
3. **Cache Optimization**: Configure Redis for session and data caching
4. **Database Optimization**: Tune SQL Server performance settings

## 📚 Additional Resources

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Docker Compose File Reference](https://docs.docker.com/compose/compose-file/)
- [ASP.NET Core Docker Guide](https://docs.microsoft.com/en-us/aspnet/core/host-and-deploy/docker/)
- [SQL Server Docker Guide](https://docs.microsoft.com/en-us/sql/linux/sql-server-linux-docker-container-deployment)

## 🆘 Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review Docker and application logs
3. Consult the project documentation
4. Contact the development team

---

**BS Platform Team** | Version 1.0 | Last Updated: September 2025
