@echo off
REM ========================================
REM BS Platform - Docker Compose Up Script
REM ========================================

echo Starting BS Platform Docker Services...
echo.

REM Navigate to project directory
cd /d "D:\OneDrive - oga.co.th\BS_Platform\BS-Platform"

echo Current directory: %CD%
echo.

echo [1/2] Starting Docker containers...
docker compose up -d

if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ Docker containers failed to start!
    echo Please check the error messages above.
    echo.
    echo You may need to build the images first using docker-build.bat
    pause
    exit /b 1
)

echo.
echo [2/2] Checking container status...
docker compose ps

echo.
echo ✅ BS Platform Docker containers are now running!
echo.
echo Services available at:
echo   🌐 API Gateway: http://localhost:8080
echo   🔐 Auth API: http://localhost:8080/auth
echo   📊 Core API: http://localhost:8080/api
echo.
echo Commands:
echo   - View logs: docker compose logs -f
echo   - Stop services: docker compose down
echo   - Restart: docker compose restart
echo.
echo Press any key to exit...
pause >nul