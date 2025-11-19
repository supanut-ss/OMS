@echo off
REM ========================================
REM BS Platform - Docker Logs Viewer
REM ========================================

echo BS Platform Docker Logs Viewer
echo.

REM Navigate to project directory
cd /d "D:\OneDrive - oga.co.th\BS_Platform\BS-Platform"

echo Current directory: %CD%
echo.

echo Available services:
echo [1] All services
echo [2] API Gateway
echo [3] Auth API
echo [4] BS Core API
echo [5] Exit
echo.

set /p choice="Select service to view logs (1-5): "

if "%choice%"=="1" (
    echo Viewing logs for all services...
    echo Press Ctrl+C to stop viewing logs
    echo.
    docker compose logs -f
) else if "%choice%"=="2" (
    echo Viewing logs for API Gateway...
    echo Press Ctrl+C to stop viewing logs
    echo.
    docker compose logs -f api_gateway
) else if "%choice%"=="3" (
    echo Viewing logs for Auth API...
    echo Press Ctrl+C to stop viewing logs
    echo.
    docker compose logs -f auth_api
) else if "%choice%"=="4" (
    echo Viewing logs for BS Core API...
    echo Press Ctrl+C to stop viewing logs
    echo.
    docker compose logs -f bs_core_api
) else if "%choice%"=="5" (
    echo Exiting...
    exit /b 0
) else (
    echo Invalid choice. Please select 1-5.
    pause
    goto :eof
)

echo.
echo Press any key to exit...
pause >nul