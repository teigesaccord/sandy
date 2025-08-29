#!/bin/bash

# Sandy Chatbot - Docker Development Script
# This script helps manage the Docker development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Default values
COMPOSE_FILE="docker-compose.yml"
SERVICE_NAME="sandy-chatbot"
ENV_FILE=".env"

# Functions
print_usage() {
    echo "Sandy Chatbot Docker Development Helper"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  build       Build the Docker image"
    echo "  start       Start the development environment"
    echo "  stop        Stop all services"
    echo "  restart     Restart services"
    echo "  logs        Show service logs"
    echo "  shell       Open shell in running container"
    echo "  clean       Clean up containers and volumes"
    echo "  setup       Initial setup and environment check"
    echo "  status      Show status of all services"
    echo "  backup      Backup database and user data"
    echo "  restore     Restore from backup"
    echo "  test        Run tests in container"
    echo "  prod        Switch to production mode"
    echo "  dev         Switch to development mode"
    echo ""
    echo "Options:"
    echo "  -f, --file FILE     Docker compose file (default: docker-compose.yml)"
    echo "  -s, --service NAME  Service name (default: sandy-chatbot)"
    echo "  -h, --help         Show this help message"
    echo "  --no-cache         Build without cache"
    echo "  --rebuild          Force rebuild before starting"
    echo "  --detach           Run in detached mode"
    echo ""
    echo "Examples:"
    echo "  $0 setup                    # Initial setup"
    echo "  $0 build --no-cache         # Build without cache"
    echo "  $0 start --rebuild          # Rebuild and start"
    echo "  $0 logs -f                  # Follow logs"
    echo "  $0 shell                    # Open shell in container"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}  Sandy Chatbot - Docker Dev${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
}

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running. Please start Docker first."
        exit 1
    fi
    
    log_info "Dependencies check passed ✓"
}

check_env_file() {
    if [ ! -f "$PROJECT_DIR/$ENV_FILE" ]; then
        log_warn ".env file not found. Creating from template..."
        if [ -f "$PROJECT_DIR/.env.example" ]; then
            cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/$ENV_FILE"
            log_info "Created .env file from template"
            log_warn "Please edit .env file and add your OpenAI API key"
        else
            log_error ".env.example file not found"
            exit 1
        fi
    fi
    
    # Check if OpenAI API key is set
    if grep -q "your_openai_api_key_here" "$PROJECT_DIR/$ENV_FILE" 2>/dev/null; then
        log_warn "OpenAI API key not configured in .env file"
        log_warn "Please edit .env file and add your actual API key"
    fi
}

setup_environment() {
    log_info "Setting up development environment..."
    
    cd "$PROJECT_DIR"
    
    # Check dependencies
    check_dependencies
    
    # Check environment file
    check_env_file
    
    # Create necessary directories
    mkdir -p data logs backups nginx/ssl
    
    # Generate session secret if not exists
    if grep -q "your_secure_session_secret_here" "$ENV_FILE" 2>/dev/null; then
        log_info "Generating session secret..."
        SESSION_SECRET=$(openssl rand -hex 32 2>/dev/null || head /dev/urandom | tr -dc A-Za-z0-9 | head -c 64)
        sed -i "s/SESSION_SECRET=your_secure_session_secret_here/SESSION_SECRET=$SESSION_SECRET/" "$ENV_FILE"
        log_info "Session secret generated ✓"
    fi
    
    log_info "Environment setup complete ✓"
}

build_image() {
    local no_cache=""
    if [ "$1" = "--no-cache" ]; then
        no_cache="--no-cache"
    fi
    
    log_info "Building Docker image..."
    cd "$PROJECT_DIR"
    
    docker-compose -f "$COMPOSE_FILE" build $no_cache "$SERVICE_NAME"
    
    log_info "Build complete ✓"
}

start_services() {
    local rebuild=false
    local detach=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --rebuild)
                rebuild=true
                shift
                ;;
            --detach|-d)
                detach=true
                shift
                ;;
            *)
                shift
                ;;
        esac
    done
    
    cd "$PROJECT_DIR"
    
    if [ "$rebuild" = true ]; then
        log_info "Rebuilding image before starting..."
        build_image
    fi
    
    log_info "Starting services..."
    
    if [ "$detach" = true ]; then
        docker-compose -f "$COMPOSE_FILE" up -d
    else
        docker-compose -f "$COMPOSE_FILE" up
    fi
}

stop_services() {
    log_info "Stopping services..."
    cd "$PROJECT_DIR"
    docker-compose -f "$COMPOSE_FILE" down
    log_info "Services stopped ✓"
}

restart_services() {
    log_info "Restarting services..."
    stop_services
    start_services --detach
}

show_logs() {
    cd "$PROJECT_DIR"
    if [ "$1" = "-f" ] || [ "$1" = "--follow" ]; then
        docker-compose -f "$COMPOSE_FILE" logs -f "$SERVICE_NAME"
    else
        docker-compose -f "$COMPOSE_FILE" logs "$SERVICE_NAME"
    fi
}

open_shell() {
    log_info "Opening shell in $SERVICE_NAME container..."
    cd "$PROJECT_DIR"
    
    # Check if container is running
    if ! docker-compose -f "$COMPOSE_FILE" ps | grep -q "$SERVICE_NAME.*Up"; then
        log_error "Service $SERVICE_NAME is not running"
        log_info "Starting service first..."
        start_services --detach
        sleep 5
    fi
    
    docker-compose -f "$COMPOSE_FILE" exec "$SERVICE_NAME" /bin/sh
}

clean_environment() {
    log_warn "This will remove all containers, networks, and volumes"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Cleaning up environment..."
        cd "$PROJECT_DIR"
        docker-compose -f "$COMPOSE_FILE" down -v --remove-orphans
        docker system prune -f
        log_info "Environment cleaned ✓"
    else
        log_info "Cleanup cancelled"
    fi
}

show_status() {
    log_info "Service status:"
    cd "$PROJECT_DIR"
    docker-compose -f "$COMPOSE_FILE" ps
    
    echo ""
    log_info "Resource usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}" 2>/dev/null || true
}

backup_data() {
    local backup_dir="$PROJECT_DIR/backups"
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="sandy_backup_$timestamp.tar.gz"
    
    log_info "Creating backup..."
    mkdir -p "$backup_dir"
    
    cd "$PROJECT_DIR"
    
    # Create backup of data directory
    if [ -d "data" ]; then
        tar -czf "$backup_dir/$backup_file" data/
        log_info "Backup created: $backup_file ✓"
    else
        log_warn "No data directory found to backup"
    fi
}

restore_data() {
    local backup_dir="$PROJECT_DIR/backups"
    
    log_info "Available backups:"
    ls -la "$backup_dir"/*.tar.gz 2>/dev/null || {
        log_error "No backups found in $backup_dir"
        exit 1
    }
    
    echo ""
    read -p "Enter backup filename to restore: " backup_file
    
    if [ ! -f "$backup_dir/$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        exit 1
    fi
    
    log_warn "This will overwrite existing data"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Restoring from backup..."
        cd "$PROJECT_DIR"
        tar -xzf "$backup_dir/$backup_file"
        log_info "Restore complete ✓"
    else
        log_info "Restore cancelled"
    fi
}

run_tests() {
    log_info "Running tests in container..."
    cd "$PROJECT_DIR"
    docker-compose -f "$COMPOSE_FILE" exec "$SERVICE_NAME" npm test
}

switch_to_prod() {
    log_info "Switching to production mode..."
    COMPOSE_FILE="docker-compose.prod.yml"
    
    if [ ! -f "$PROJECT_DIR/$COMPOSE_FILE" ]; then
        log_error "Production compose file not found: $COMPOSE_FILE"
        exit 1
    fi
    
    log_warn "Make sure to configure production environment variables"
    log_info "Production mode enabled. Use other commands with -f $COMPOSE_FILE"
}

switch_to_dev() {
    log_info "Switching to development mode..."
    COMPOSE_FILE="docker-compose.yml"
    log_info "Development mode enabled ✓"
}

# Main script logic
main() {
    print_header
    
    # Parse global options
    while [[ $# -gt 0 ]]; do
        case $1 in
            -f|--file)
                COMPOSE_FILE="$2"
                shift 2
                ;;
            -s|--service)
                SERVICE_NAME="$2"
                shift 2
                ;;
            -h|--help)
                print_usage
                exit 0
                ;;
            *)
                break
                ;;
        esac
    done
    
    # Get command
    COMMAND="$1"
    shift || true
    
    # Execute command
    case $COMMAND in
        build)
            build_image "$@"
            ;;
        start)
            start_services "$@"
            ;;
        stop)
            stop_services
            ;;
        restart)
            restart_services
            ;;
        logs)
            show_logs "$@"
            ;;
        shell|sh)
            open_shell
            ;;
        clean)
            clean_environment
            ;;
        setup)
            setup_environment
            ;;
        status)
            show_status
            ;;
        backup)
            backup_data
            ;;
        restore)
            restore_data
            ;;
        test)
            run_tests
            ;;
        prod)
            switch_to_prod
            ;;
        dev)
            switch_to_dev
            ;;
        *)
            log_error "Unknown command: $COMMAND"
            echo ""
            print_usage
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"