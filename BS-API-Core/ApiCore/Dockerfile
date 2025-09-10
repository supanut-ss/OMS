# BS Platform - API Core Service
# Multi-stage Docker build for optimized production deployment

# Build arguments for flexibility
ARG BUILD_CONFIGURATION=Release
ARG DOTNET_VERSION=9.0
ARG APP_NAME=ApiCore

# =============================================================================
# Base Runtime Stage
# =============================================================================
FROM mcr.microsoft.com/dotnet/aspnet:${DOTNET_VERSION}-alpine AS base

# Install required packages for Alpine
RUN apk add --no-cache \
    tzdata \
    ca-certificates \
    && update-ca-certificates

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -G appgroup -u 1001

# Set up working directory
WORKDIR /app

# Create necessary directories with proper permissions
RUN mkdir -p /app/logs /app/data && \
    chown -R appuser:appgroup /app

# Configure ports
EXPOSE 8080
EXPOSE 8081

# Set timezone (can be overridden)
ENV TZ=Asia/Bangkok

# =============================================================================
# Build Stage
# =============================================================================
FROM mcr.microsoft.com/dotnet/sdk:${DOTNET_VERSION}-alpine AS build

# Install build dependencies
RUN apk add --no-cache git

ARG BUILD_CONFIGURATION
WORKDIR /src

# Copy project file first for better layer caching
COPY ["ApiCore.csproj", "./"]

# Restore dependencies
RUN dotnet restore "./ApiCore.csproj" \
    --runtime alpine-x64 \
    --no-cache \
    --verbosity minimal

# Copy source code
COPY . .

# Build application with optimizations
RUN dotnet build "./ApiCore.csproj" \
    -c $BUILD_CONFIGURATION \
    -o /app/build \
    --no-restore \
    --verbosity minimal

# =============================================================================
# Publish Stage
# =============================================================================
FROM build AS publish

ARG BUILD_CONFIGURATION

# Publish application with optimizations
RUN dotnet publish "./ApiCore.csproj" \
    -c $BUILD_CONFIGURATION \
    -o /app/publish \
    --no-build \
    --no-restore \
    --runtime alpine-x64 \
    --self-contained false \
    /p:UseAppHost=false \
    /p:PublishTrimmed=false \
    /p:PublishSingleFile=false

# =============================================================================
# Final Production Stage
# =============================================================================
FROM base AS final

# Labels for image metadata
LABEL maintainer="BS Platform Team" \
    version="1.0" \
    description="BS Platform API Core Service" \
    org.opencontainers.image.source="https://github.com/phayungsakp/BS-Platform" \
    org.opencontainers.image.title="BS-API-Core" \
    org.opencontainers.image.description="Dynamic API service for BS Platform"

WORKDIR /app

# Copy published application
COPY --from=publish --chown=appuser:appgroup /app/publish .

# Copy environment configuration (if exists)
COPY --chown=appuser:appgroup .env* ./

# Set production environment variables
ENV ASPNETCORE_ENVIRONMENT=Production \
    ASPNETCORE_URLS=http://+:8080 \
    DOTNET_RUNNING_IN_CONTAINER=true \
    DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false \
    DOTNET_USE_POLLING_FILE_WATCHER=true \
    NUGET_XMLDOC_MODE=skip \
    ASPNETCORE_HTTP_PORTS=8080 \
    ASPNETCORE_HTTPS_PORTS=8081

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Switch to non-root user for security
USER appuser

# Set entrypoint
ENTRYPOINT ["dotnet", "ApiCore.dll"]