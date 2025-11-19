@echo off
REM ========================================
REM BS Platform - Docker Compose Build Script
REM ========================================

echo Starting BS Platform Docker Build Process...
echo.

REM Navigate to project directory
cd /d "D:\OneDrive - oga.co.th\BS_Platform\BS-Platform"

echo Current directory: %CD%
echo.

REM Stop existing containers
echo [1/4] Stopping existing containers...
docker compose down
echo.

REM Remove old images (optional - uncomment if needed)
REM echo [2/4] Removing old images...
REM docker rmi bs-platform-api_gateway:latest bs-platform-auth_api:latest bs-platform-bs_core_api:latest 2>nul
REM echo.

echo [2/4] Building Docker images (no cache)...
docker compose build --no-cache

if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ Docker build failed!
    echo Please check the error messages above.
    pause
    exit /b 1
)

echo.
echo [3/4] Starting containers...
docker compose up -d

if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ Docker containers failed to start!
    echo Please check the error messages above.
    pause
    exit /b 1
)

echo.
echo [4/4] Checking container status...
docker compose ps

echo.
echo ✅ BS Platform Docker containers are now running!
echo.
echo Services available at:
echo   🌐 API Gateway: http://localhost:8080
echo   🔐 Auth API: http://localhost:8080/auth
echo   📊 Core API: http://localhost:8080/api
echo.
echo Press any key to exit...
pause >nul