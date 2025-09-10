# BS Platform - API Core Makefile
# Simple commands for Docker operations

.PHONY: help build dev prod test clean logs status shell stop restart

# Configuration
APP_NAME := bs-api-core
IMAGE_NAME := bs-platform/api-core
VERSION := latest

# Colors
BLUE := \033[34m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
NC := \033[0m

# Default target
help: ## Show this help message
	@echo "$(BLUE)BS Platform - API Core Docker Commands$(NC)"
	@echo "$(BLUE)=====================================$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "$(YELLOW)%-15s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build and start development environment
	@echo "$(GREEN)Building development environment...$(NC)"
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml down --remove-orphans
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml build --no-cache
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
	@echo "$(GREEN)Development environment is running at http://localhost:5000$(NC)"

dev: ## Quick start development environment (no rebuild)
	@echo "$(GREEN)Starting development environment...$(NC)"
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
	@echo "$(GREEN)Development environment is running at http://localhost:5000$(NC)"

prod: ## Build and start production environment
	@echo "$(GREEN)Building production environment...$(NC)"
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml down --remove-orphans
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache \
		--build-arg BUILD_CONFIGURATION=Release
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
	@echo "$(GREEN)Production environment is running at http://localhost:5000$(NC)"

test: ## Build and start test environment
	@echo "$(GREEN)Building test environment...$(NC)"
	docker-compose down --remove-orphans
	docker-compose build --no-cache --build-arg BUILD_CONFIGURATION=Release
	docker-compose up -d
	@echo "$(GREEN)Test environment is running at http://localhost:5000$(NC)"

clean: ## Stop all services and clean up
	@echo "$(YELLOW)Cleaning up...$(NC)"
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml down --remove-orphans -v
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml down --remove-orphans -v
	docker-compose down --remove-orphans -v
	docker system prune -f
	@echo "$(GREEN)Cleanup completed$(NC)"

logs: ## Show logs for all services
	docker-compose logs -f

logs-api: ## Show logs for API service only
	docker-compose logs -f bs-api-core

logs-db: ## Show logs for database service only
	docker-compose logs -f sqlserver

status: ## Show status of all services
	@echo "$(BLUE)Service Status:$(NC)"
	docker-compose ps

shell: ## Open shell in API container
	docker-compose exec bs-api-core sh

shell-db: ## Open SQL shell in database container
	docker-compose exec sqlserver /opt/mssql-tools/bin/sqlcmd -S localhost -U sa

stop: ## Stop all services
	@echo "$(YELLOW)Stopping services...$(NC)"
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml down
	docker-compose down

restart: ## Restart all services
	@echo "$(YELLOW)Restarting services...$(NC)"
	docker-compose restart

restart-api: ## Restart API service only
	docker-compose restart bs-api-core

health: ## Check health of services
	@echo "$(BLUE)Health Check:$(NC)"
	@docker-compose exec bs-api-core wget --no-verbose --tries=1 --spider http://localhost:8080/health 2>/dev/null && echo "$(GREEN)API: Healthy$(NC)" || echo "$(RED)API: Unhealthy$(NC)"
	@docker-compose exec sqlserver /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P YourStrong@Passw0rd -Q "SELECT 1" 2>/dev/null && echo "$(GREEN)Database: Healthy$(NC)" || echo "$(RED)Database: Unhealthy$(NC)"

# Advanced targets
rebuild: ## Force rebuild all images
	@echo "$(YELLOW)Force rebuilding all images...$(NC)"
	docker-compose build --no-cache --pull

push: ## Push images to registry (requires login)
	docker tag $(IMAGE_NAME):latest $(IMAGE_NAME):$(VERSION)
	docker push $(IMAGE_NAME):$(VERSION)
	docker push $(IMAGE_NAME):latest

pull: ## Pull latest images
	docker-compose pull

backup-db: ## Backup database
	@echo "$(YELLOW)Creating database backup...$(NC)"
	docker-compose exec sqlserver /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P YourStrong@Passw0rd -Q "BACKUP DATABASE [master] TO DISK = N'/var/opt/mssql/backup/bs-platform.bak'"
	@echo "$(GREEN)Database backup completed$(NC)"

restore-db: ## Restore database (requires backup file)
	@echo "$(YELLOW)Restoring database...$(NC)"
	docker-compose exec sqlserver /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P YourStrong@Passw0rd -Q "RESTORE DATABASE [master] FROM DISK = N'/var/opt/mssql/backup/bs-platform.bak'"
	@echo "$(GREEN)Database restore completed$(NC)"
