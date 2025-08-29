#!/bin/bash

# Sandy Chatbot - Quick Start Script
# This script gets Sandy up and running in Docker with minimal setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="Sandy Chatbot"
REQUIRED_DOCKER_VERSION="20.0.0"
REQUIRED_COMPOSE_VERSION="2.0.0"

print_banner() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════╗"
    echo "║                                              ║"
    echo "║            🌟 Sandy Chatbot 🌟              ║"
    echo "║         Personal Support Assistant          ║"
    echo "║                                              ║"
    echo "╚══════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    echo -e "${GREEN}Welcome to Sandy's Quick Start Setup!${NC}"
    echo -e "${YELLOW}This script will get your personalized support chatbot running in minutes.${NC}"
    echo ""
}

log_step() {
    echo -e "${PURPLE}[STEP]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

check_system() {
    log_step "Checking system requirements..."
    
    # Check if running on supported OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        log_info "Operating System: Linux ✓"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        log_info "Operating System: macOS ✓"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        log_info "Operating System: Windows ✓"
    else
        log_warning "Unknown operating system: $OSTYPE"
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed!"
        echo ""
        echo "Please install Docker first:"
        echo "  • Linux: https://docs.docker.com/engine/install/"
        echo "  • macOS: https://docs.docker.com/desktop/install/mac-install/"
        echo "  • Windows: https://docs.docker.com/desktop/install/windows-install/"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed!"
        echo ""
        echo "Please install Docker Compose:"
        echo "  https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    # Check if Docker daemon is running
    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running!"
        echo ""
        echo "Please start Docker:"
        echo "  • Linux: sudo systemctl start docker"
        echo "  • macOS/Windows: Start Docker Desktop"
        exit 1
    fi
    
    log_success "System requirements check passed"
}

setup_environment() {
    log_step "Setting up environment..."
    
    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        if [ -f ".env.example" ]; then
            cp .env.example .env
            log_success "Created .env file from template"
        else
            log_error ".env.example file not found"
            exit 1
        fi
    else
        log_info ".env file already exists"
    fi
    
    # Generate session secret if needed
    if grep -q "your_secure_session_secret_here" ".env" 2>/dev/null; then
        log_info "Generating secure session secret..."
        if command -v openssl &> /dev/null; then
            SESSION_SECRET=$(openssl rand -hex 32)
        else
            SESSION_SECRET=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 64)
        fi
        sed -i.bak "s/SESSION_SECRET=your_secure_session_secret_here/SESSION_SECRET=$SESSION_SECRET/" .env
        rm -f .env.bak
        log_success "Session secret generated"
    fi
    
    # Create necessary directories
    mkdir -p data logs backups nginx/ssl
    log_success "Created necessary directories"
}

check_api_key() {
    log_step "Checking OpenAI API key..."
    
    if grep -q "your_openai_api_key_here" ".env" 2>/dev/null; then
        echo ""
        log_warning "OpenAI API key not configured!"
        echo ""
        echo -e "${YELLOW}Sandy needs an OpenAI API key to provide AI-powered support.${NC}"
        echo -e "${YELLOW}You can get one from: https://platform.openai.com/api-keys${NC}"
        echo ""
        
        read -p "Do you have an OpenAI API key to add now? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo ""
            echo -e "${BLUE}Please paste your OpenAI API key (it will be hidden):${NC}"
            read -s API_KEY
            if [ -n "$API_KEY" ]; then
                sed -i.bak "s/OPENAI_API_KEY=your_openai_api_key_here/OPENAI_API_KEY=$API_KEY/" .env
                rm -f .env.bak
                log_success "API key configured"
            else
                log_warning "No API key entered. You can add it later to the .env file"
            fi
        else
            log_warning "You can add your API key later by editing the .env file"
        fi
    else
        log_success "OpenAI API key is configured"
    fi
}

build_and_start() {
    log_step "Building and starting Sandy..."
    
    echo ""
    echo -e "${BLUE}This may take a few minutes on first run...${NC}"
    echo ""
    
    # Build the image
    log_info "Building Docker image..."
    docker-compose build
    
    # Start services
    log_info "Starting services..."
    docker-compose up -d
    
    # Wait for services to be ready
    log_info "Waiting for services to start..."
    sleep 10
    
    # Check if services are running
    if docker-compose ps | grep -q "Up"; then
        log_success "Sandy is now running!"
    else
        log_error "Failed to start services"
        log_info "Checking logs..."
        docker-compose logs
        exit 1
    fi
}

show_access_info() {
    echo ""
    echo -e "${GREEN}🎉 Congratulations! Sandy is now running! 🎉${NC}"
    echo ""
    echo -e "${BLUE}Access Sandy at:${NC}"
    echo -e "  🌐 Web Interface: ${GREEN}http://localhost:3000${NC}"
    echo -e "  📊 API Health: ${GREEN}http://localhost:3000/api/health${NC}"
    echo ""
    
    echo -e "${BLUE}Useful commands:${NC}"
    echo -e "  📋 View logs:        ${YELLOW}docker-compose logs -f${NC}"
    echo -e "  🔧 Open shell:       ${YELLOW}docker-compose exec sandy-chatbot /bin/sh${NC}"
    echo -e "  ⏹️  Stop Sandy:       ${YELLOW}docker-compose down${NC}"
    echo -e "  🔄 Restart Sandy:    ${YELLOW}docker-compose restart${NC}"
    echo -e "  🧹 Clean everything: ${YELLOW}docker-compose down -v${NC}"
    echo ""
    
    echo -e "${BLUE}Development:${NC}"
    echo -e "  🔧 Dev script:       ${YELLOW}./scripts/docker-dev.sh${NC}"
    echo -e "  📖 Full docs:        ${YELLOW}cat README.md${NC}"
    echo ""
    
    if grep -q "your_openai_api_key_here" ".env" 2>/dev/null; then
        echo -e "${YELLOW}⚠️  Remember to add your OpenAI API key to the .env file for full functionality!${NC}"
        echo ""
    fi
}

show_next_steps() {
    echo -e "${PURPLE}Next Steps:${NC}"
    echo -e "  1. Open ${GREEN}http://localhost:3000${NC} in your browser"
    echo -e "  2. Start chatting with Sandy!"
    echo -e "  3. Complete your personalized support profile"
    echo -e "  4. Get tailored recommendations based on your needs"
    echo ""
    
    echo -e "${BLUE}What makes Sandy special:${NC}"
    echo -e "  🎯 Personalized support profiles"
    echo -e "  🧠 Empathetic AI conversations"
    echo -e "  📋 Smart adaptive intake forms"
    echo -e "  💡 Actionable recommendations"
    echo -e "  🔒 Privacy-focused design"
    echo ""
    
    echo -e "${GREEN}Sandy is ready to help you! 💚${NC}"
}

cleanup_on_error() {
    if [ $? -ne 0 ]; then
        log_error "Setup failed!"
        echo ""
        echo -e "${YELLOW}Troubleshooting tips:${NC}"
        echo -e "  1. Make sure Docker is running"
        echo -e "  2. Check available disk space"
        echo -e "  3. Ensure port 3000 is not in use"
        echo -e "  4. Check logs: ${BLUE}docker-compose logs${NC}"
        echo ""
        echo -e "Need help? Check the README.md or open an issue on GitHub."
    fi
}

# Set up error handling
trap cleanup_on_error EXIT

main() {
    # Change to script directory
    cd "$(dirname "$0")"
    
    print_banner
    
    check_system
    setup_environment
    check_api_key
    build_and_start
    show_access_info
    show_next_steps
    
    # Reset trap - we succeeded
    trap - EXIT
}

# Handle interruption gracefully
trap 'echo -e "\n${YELLOW}Setup interrupted by user${NC}"; exit 130' INT

# Check if help is requested
if [[ "$1" == "--help" ]] || [[ "$1" == "-h" ]]; then
    echo "Sandy Chatbot Quick Start"
    echo ""
    echo "This script sets up and runs Sandy chatbot in Docker with minimal configuration."
    echo ""
    echo "Usage:"
    echo "  $0              Run quick start setup"
    echo "  $0 --help      Show this help message"
    echo ""
    echo "What this script does:"
    echo "  ✓ Checks system requirements (Docker, Docker Compose)"
    echo "  ✓ Creates .env configuration file"
    echo "  ✓ Generates secure session secrets"
    echo "  ✓ Builds Docker image"
    echo "  ✓ Starts Sandy chatbot services"
    echo "  ✓ Shows access information and next steps"
    echo ""
    echo "Requirements:"
    echo "  • Docker 20.0.0+"
    echo "  • Docker Compose 2.0.0+"
    echo "  • OpenAI API key (for AI functionality)"
    echo ""
    exit 0
fi

# Run main function
main "$@"