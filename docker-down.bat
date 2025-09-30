@echo off
REM ========================================
REM BS Platform - Docker Compose Down Script
REM ========================================

echo Stopping BS Platform Docker Services...
echo.

REM Navigate to project directory
cd /d "D:\OneDrive - oga.co.th\BS_Platform\BS-Platform"

echo Current directory: %CD%
echo.

echo [1/2] Stopping Docker containers...
docker compose down

if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ Failed to stop containers!
    echo Please check the error messages above.
    pause
    exit /b 1
)

echo.
echo [2/2] Checking remaining containers...
docker compose ps

echo.
echo ✅ BS Platform Docker containers have been stopped!
echo.
echo Commands:
echo   - Start again: docker-up.bat
echo   - Rebuild: docker-build.bat
echo   - View images: docker images
echo.
echo Press any key to exit...
pause >nul