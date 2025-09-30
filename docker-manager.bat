@echo off
REM ========================================
REM BS Platform - Docker Management Menu
REM ========================================

:menu
cls
echo.
echo ╔══════════════════════════════════════════════╗
echo ║            BS Platform Docker Manager        ║
echo ╠══════════════════════════════════════════════╣
echo ║                                              ║
echo ║  [1] 🔨 Build and Start (Full Rebuild)      ║
echo ║  [2] ▶️  Start Services                      ║
echo ║  [3] ⏹️  Stop Services                       ║
echo ║  [4] 📋 View Logs                           ║
echo ║  [5] 📊 Container Status                    ║
echo ║  [6] 🔄 Restart Services                    ║
echo ║  [7] 🗑️  Clean Up (Remove Images)           ║
echo ║  [8] 💾 Export Images                       ║
echo ║  [9] ❌ Exit                                ║
echo ║                                              ║
echo ╚══════════════════════════════════════════════╝
echo.

set /p choice="Select option (1-9): "

if "%choice%"=="1" goto build
if "%choice%"=="2" goto up
if "%choice%"=="3" goto down
if "%choice%"=="4" goto logs
if "%choice%"=="5" goto status
if "%choice%"=="6" goto restart
if "%choice%"=="7" goto cleanup
if "%choice%"=="8" goto export
if "%choice%"=="9" goto exit

echo Invalid choice. Please select 1-9.
pause
goto menu

:build
echo.
echo 🔨 Building and starting BS Platform...
call docker-build.bat
pause
goto menu

:up
echo.
echo ▶️ Starting BS Platform services...
call docker-up.bat
pause
goto menu

:down
echo.
echo ⏹️ Stopping BS Platform services...
call docker-down.bat
pause
goto menu

:logs
echo.
echo 📋 Opening logs viewer...
call docker-logs.bat
pause
goto menu

:status
echo.
echo 📊 Container Status:
cd /d "D:\OneDrive - oga.co.th\BS_Platform\BS-Platform"
docker compose ps
echo.
echo Docker Images:
docker images | findstr bs-platform
pause
goto menu

:restart
echo.
echo 🔄 Restarting BS Platform services...
cd /d "D:\OneDrive - oga.co.th\BS_Platform\BS-Platform"
docker compose restart
echo ✅ Services restarted!
pause
goto menu

:cleanup
echo.
echo 🗑️ Cleaning up Docker images...
cd /d "D:\OneDrive - oga.co.th\BS_Platform\BS-Platform"
echo Warning: This will remove all BS Platform Docker images!
set /p confirm="Are you sure? (y/n): "
if /i "%confirm%"=="y" (
    docker compose down
    docker rmi bs-platform-api_gateway:latest bs-platform-auth_api:latest bs-platform-bs_core_api:latest 2>nul
    echo ✅ Cleanup completed!
) else (
    echo ❌ Cleanup cancelled.
)
pause
goto menu

:export
echo.
echo 💾 Exporting Docker images...
cd /d "D:\OneDrive - oga.co.th\BS_Platform\BS-Platform"
echo Exporting bs-platform images...
docker save bs-platform-api_gateway:latest -o api_gateway.tar
docker save bs-platform-auth_api:latest -o auth_api.tar
docker save bs-platform-bs_core_api:latest -o bs_core_api.tar
echo ✅ Images exported successfully!
pause
goto menu

:exit
echo.
echo 👋 Goodbye!
exit /b 0