# BS Platform - API Core Docker Build Script (PowerShell)
# Usage: .\docker-build.ps1 [dev|prod|test]

param(
    [string]$Environment = "dev",
    [string]$Version = "latest",
    [switch]$NoBuild = $false,
    [switch]$Help = $false
)

# Configuration
$AppName = "bs-api-core"
$ImageName = "bs-platform/api-core"

# Colors
$ColorInfo = "Green"
$ColorWarn = "Yellow"
$ColorError = "Red"
$ColorTitle = "Cyan"

function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $ColorInfo
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor $ColorWarn
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $ColorError
}

function Write-Title {
    param([string]$Message)
    Write-Host $Message -ForegroundColor $ColorTitle
}

# Show help
if ($Help) {
    Write-Title "BS Platform - API Core Docker Build Script"
    Write-Host ""
    Write-Host "Usage: .\docker-build.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Environment [dev|prod|test]  Target environment (default: dev)"
    Write-Host "  -Version [string]             Image version tag (default: latest)"
    Write-Host "  -NoBuild                      Skip building, just start services"
    Write-Host "  -Help                         Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\docker-build.ps1 dev"
    Write-Host "  .\docker-build.ps1 -Environment prod -Version 1.0.0"
    Write-Host "  .\docker-build.ps1 -NoBuild"
    exit 0
}

Write-Title "BS Platform - API Core Docker Build Script"
Write-Title "==========================================="

# Validate environment
switch ($Environment.ToLower()) {
    "dev" {
        $ComposeFile = "docker-compose.yml", "docker-compose.dev.yml"
        $BuildConfig = "Debug"
        Write-Status "Building for DEVELOPMENT environment"
    }
    "development" {
        $ComposeFile = "docker-compose.yml", "docker-compose.dev.yml"
        $BuildConfig = "Debug"
        Write-Status "Building for DEVELOPMENT environment"
    }
    "prod" {
        $ComposeFile = "docker-compose.yml", "docker-compose.prod.yml"
        $BuildConfig = "Release"
        Write-Status "Building for PRODUCTION environment"
    }
    "production" {
        $ComposeFile = "docker-compose.yml", "docker-compose.prod.yml"
        $BuildConfig = "Release"
        Write-Status "Building for PRODUCTION environment"
    }
    "test" {
        $ComposeFile = "docker-compose.yml"
        $BuildConfig = "Release"
        Write-Status "Building for TEST environment"
    }
    default {
        Write-Error "Invalid environment: $Environment"
        Write-Error "Valid options: dev, prod, test"
        exit 1
    }
}

# Check if Docker is running
try {
    $null = docker info 2>$null
}
catch {
    Write-Error "Docker is not running. Please start Docker Desktop and try again."
    exit 1
}

# Check if docker-compose is available
try {
    $null = docker-compose version 2>$null
}
catch {
    Write-Error "docker-compose is not available. Please install Docker Desktop and try again."
    exit 1
}

# Build compose file arguments
$ComposeArgs = @()
foreach ($file in $ComposeFile) {
    $ComposeArgs += "-f"
    $ComposeArgs += $file
}

try {
    Write-Status "Stopping existing containers..."
    & docker-compose @ComposeArgs down --remove-orphans 2>$null

    if (-not $NoBuild) {
        Write-Status "Building Docker image..."
        & docker-compose @ComposeArgs build --no-cache `
            --build-arg BUILD_CONFIGURATION=$BuildConfig `
            --build-arg VERSION=$Version

        if ($LASTEXITCODE -ne 0) {
            Write-Error "Docker build failed"
            exit 1
        }

        Write-Status "Tagging image..."
        & docker tag "${AppName}:latest" "${ImageName}:${Version}"
        & docker tag "${AppName}:latest" "${ImageName}:latest"

        if ($Environment -eq "prod" -or $Environment -eq "production") {
            & docker tag "${AppName}:latest" "${ImageName}:prod"
        }
    }

    Write-Status "Starting services..."
    & docker-compose @ComposeArgs up -d

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to start services"
        exit 1
    }

    Write-Status "Waiting for services to be healthy..."
    Start-Sleep -Seconds 10

    # Check service health
    $services = & docker-compose @ComposeArgs ps
    if ($services -match "Up.*healthy") {
        Write-Status "Services are running and healthy!"
    }
    else {
        Write-Warning "Services are starting. Check logs with: docker-compose logs"
    }

    Write-Status "Build completed successfully!"
    Write-Status "Image: ${ImageName}:${Version}"
    Write-Status "Access the API at: http://localhost:5000"

    Write-Title "==========================================="
    Write-Host "Useful commands:" -ForegroundColor $ColorInfo
    Write-Host "  View logs:     " -NoNewline; Write-Host "docker-compose $(($ComposeArgs -join ' ')) logs -f" -ForegroundColor $ColorWarn
    Write-Host "  Stop services: " -NoNewline; Write-Host "docker-compose $(($ComposeArgs -join ' ')) down" -ForegroundColor $ColorWarn
    Write-Host "  View status:   " -NoNewline; Write-Host "docker-compose $(($ComposeArgs -join ' ')) ps" -ForegroundColor $ColorWarn
    Write-Host "  Shell access:  " -NoNewline; Write-Host "docker-compose $(($ComposeArgs -join ' ')) exec bs-api-core sh" -ForegroundColor $ColorWarn
}
catch {
    Write-Error "An error occurred: $($_.Exception.Message)"
    exit 1
}
