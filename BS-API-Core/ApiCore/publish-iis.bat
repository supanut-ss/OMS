@echo off
echo ============================================
echo Building API Core for IIS Deployment
echo ============================================
echo.

echo Cleaning previous publish folder...
if exist "publish\iis\" (
    rmdir /s /q "publish\iis"
    echo Previous publish folder removed.
)
echo.

echo Publishing API Core to publish/iis...
dotnet publish -c Release -o publish/iis

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================
    echo Build completed successfully!
    echo Output: publish\iis\
    echo ============================================
) else (
    echo.
    echo ============================================
    echo Build failed with error code: %ERRORLEVEL%
    echo ============================================
    exit /b %ERRORLEVEL%
)

echo.
pause
