#!/usr/bin/env bash
#
# Quick start for Sandy (local development)
#
# This script prepares a complete local development environment:
#  - Detects docker compose command
#  - Prepares .env from .env.example (generates secrets, sets service hosts)
#  - Starts Postgres and Redis and waits for readiness
#  - Builds images, runs Django migrations and optional createsuperuser
#  - Starts frontend and backend (hot-reload development mode)
#
# Usage:
#   ./quick-start.sh        # interactive, recommended
#   ./quick-start.sh -y     # non-interactive: accept defaults and skip prompts
#   ./quick-start.sh --help
#

set -euo pipefail

# Colors
RED='\033[0;31m' ; GREEN='\033[0;32m' ; YELLOW='\033[1;33m' ; BLUE='\033[0;34m' ; NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR}"   # script is at repository root
ENV_FILE="${PROJECT_ROOT}/.env"
ENV_EXAMPLE="${PROJECT_ROOT}/.env.example"
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.yml"

NONINTERACTIVE=false
FORCE_RECREATE=false
WAIT_TIMEOUT=180    # seconds to wait for DB/Redis readiness

usage() {
  cat <<EOF
Sandy Quick Start - sets up a complete local development environment.

Usage:
  $0 [options]

Options:
  -y, --yes           Non-interactive; accept defaults and don't prompt
  -f, --force         Recreate containers (passes --build and --force-recreate to compose up)
  -h, --help          Show this help
EOF
}

log()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }
warn()   { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()    { echo -e "${RED}[ERROR]${NC} $*"; }

detect_compose() {
  # Prefer `docker compose` plugin if available, fall back to `docker-compose`
  if docker compose version >/dev/null 2>&1; then
    DCMD="docker compose"
  elif command -v docker-compose >/dev/null 2>&1; then
    DCMD="docker-compose"
  else
    err "Docker Compose not found. Install Docker Compose or use Docker Desktop (which provides 'docker compose')."
    exit 1
  fi
  log "Using compose command: ${DCMD}"
}

ensure_docker_running() {
  if ! docker info >/dev/null 2>&1; then
    err "Docker daemon does not appear to be running. Start Docker and retry."
    exit 1
  fi
  success "Docker is running"
}

ensure_compose_file() {
  if [ ! -f "${COMPOSE_FILE}" ]; then
    err "docker-compose.yml not found at project root (${COMPOSE_FILE}). Aborting."
    exit 1
  fi
}

create_env_file() {
  if [ -f "${ENV_FILE}" ]; then
    log ".env already exists; leaving it intact"
    return
  fi

  if [ ! -f "${ENV_EXAMPLE}" ]; then
    err ".env.example not found; cannot create .env automatically."
    exit 1
  fi

  cp "${ENV_EXAMPLE}" "${ENV_FILE}"
  success "Copied .env.example -> .env"

  # Generate SESSION_SECRET if placeholder exists
  if grep -q "your_secure_session_secret_here" "${ENV_FILE}" 2>/dev/null || ! grep -q "^SESSION_SECRET=" "${ENV_FILE}" 2>/dev/null; then
    if command -v openssl >/dev/null 2>&1; then
      SESSION_SECRET="$(openssl rand -hex 32)"
    else
      SESSION_SECRET="$(head -c 64 /dev/urandom | tr -dc 'A-Za-z0-9' | head -c 64)"
    fi
    sed -i.bak "s|SESSION_SECRET=.*|SESSION_SECRET=${SESSION_SECRET}|" "${ENV_FILE}" || true
    rm -f "${ENV_FILE}.bak"
    success "Generated SESSION_SECRET"
  fi

  # Ensure DATABASE_URL, REDIS_HOST/PORT and NEXT_PUBLIC_API_HOST / API_HOST are present and set to sensible defaults
  # Use container service hostnames for containers: db and redis. For browser-facing NEXT_PUBLIC_API_HOST use http://localhost:8000
  if ! grep -q "^DATABASE_URL=" "${ENV_FILE}" 2>/dev/null; then
    echo "DATABASE_URL=postgresql://sandy:sandy@db:5432/sandy_db" >> "${ENV_FILE}"
  else
    # replace existing database url to ensure docker service host works for containers
    sed -i.bak "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://sandy:sandy@db:5432/sandy_db|" "${ENV_FILE}" || true
    rm -f "${ENV_FILE}.bak"
  fi

  if ! grep -q "^REDIS_HOST=" "${ENV_FILE}" 2>/dev/null; then
    echo "REDIS_HOST=redis" >> "${ENV_FILE}"
  else
    sed -i.bak "s|^REDIS_HOST=.*|REDIS_HOST=redis|" "${ENV_FILE}" || true
    rm -f "${ENV_FILE}.bak"
  fi
  if ! grep -q "^REDIS_PORT=" "${ENV_FILE}" 2>/dev/null; then
    echo "REDIS_PORT=6379" >> "${ENV_FILE}"
  else
    sed -i.bak "s|^REDIS_PORT=.*|REDIS_PORT=6379|" "${ENV_FILE}" || true
    rm -f "${ENV_FILE}.bak"
  fi

  # Client-side host (for browser) should point to localhost:8000
  if ! grep -q "^NEXT_PUBLIC_API_HOST=" "${ENV_FILE}" 2>/dev/null; then
    echo "NEXT_PUBLIC_API_HOST=http://localhost:8000" >> "${ENV_FILE}"
  else
    sed -i.bak "s|^NEXT_PUBLIC_API_HOST=.*|NEXT_PUBLIC_API_HOST=http://localhost:8000|" "${ENV_FILE}" || true
    rm -f "${ENV_FILE}.bak"
  fi

  # Server-side API_HOST (used during SSR/build) – pointing at backend container or localhost is acceptable for dev
  if ! grep -q "^API_HOST=" "${ENV_FILE}" 2>/dev/null; then
    echo "API_HOST=http://localhost:8000" >> "${ENV_FILE}"
  else
    sed -i.bak "s|^API_HOST=.*|API_HOST=http://localhost:8000|" "${ENV_FILE}" || true
    rm -f "${ENV_FILE}.bak"
  fi

  success "Ensured .env contains core defaults (DATABASE_URL, REDIS_HOST/PORT, NEXT_PUBLIC_API_HOST, API_HOST)"
}

prompt_openai_key() {
  # If placeholder present, optionally prompt user to enter a key
  if grep -q "your_openai_api_key_here" "${ENV_FILE}" 2>/dev/null; then
    warn "OpenAI API key not configured in .env (some features will be limited)."
    if [ "${NONINTERACTIVE}" = true ]; then
      warn "Non-interactive mode: leaving placeholder in place."
      return
    fi
    read -p "Do you want to paste your OpenAI API key now? (y/N): " -r
    if [[ "$REPLY" =~ ^[Yy]$ ]]; then
      echo "Enter API key (input will be hidden):"
      read -s API_KEY
      echo
      if [ -n "${API_KEY}" ]; then
        sed -i.bak "s|OPENAI_API_KEY=.*|OPENAI_API_KEY=${API_KEY}|" "${ENV_FILE}" || true
        rm -f "${ENV_FILE}.bak"
        success "OpenAI API key stored in .env"
      else
        warn "Empty key entered: leaving placeholder in place."
      fi
    else
      warn "You can add the key later to .env (OPENAI_API_KEY=... )"
    fi
  else
    success "OpenAI API key present in .env"
  fi
}

compose_up_db_redis() {
  log "Starting Postgres and Redis with compose (in detached mode)..."
  if [ "${FORCE_RECREATE}" = true ]; then
    ${DCMD} up -d --build db redis
  else
    ${DCMD} up -d db redis
  fi
  success "Requested db & redis to start"
}

wait_for_postgres() {
  log "Waiting for Postgres to become available (timeout ${WAIT_TIMEOUT}s)..."
  local start ts elapsed
  start=$(date +%s)
  while true; do
    # Use docker exec into db container and pg_isready
    if ${DCMD} ps --services --filter "status=running" | grep -q "^db$"; then
      if ${DCMD} exec db pg_isready -U sandy -d sandy_db >/dev/null 2>&1; then
        success "Postgres is ready"
        return 0
      fi
    fi
    ts=$(date +%s)
    elapsed=$((ts - start))
    if [ "${elapsed}" -gt "${WAIT_TIMEOUT}" ]; then
      err "Timed out waiting for Postgres (waited ${elapsed}s)"
      ${DCMD} logs db --no-color || true
      return 1
    fi
    sleep 2
  done
}

wait_for_redis() {
  log "Waiting for Redis to respond (timeout ${WAIT_TIMEOUT}s)..."
  local start ts elapsed
  start=$(date +%s)
  while true; do
    if ${DCMD} ps --services --filter "status=running" | grep -q "^redis$"; then
      if ${DCMD} exec redis redis-cli ping >/dev/null 2>&1; then
        # redis-cli ping returns "PONG" but exit code 0 is sufficient
        success "Redis is ready"
        return 0
      fi
    fi
    ts=$(date +%s)
    elapsed=$((ts - start))
    if [ "${elapsed}" -gt "${WAIT_TIMEOUT}" ]; then
      err "Timed out waiting for Redis (waited ${elapsed}s)"
      ${DCMD} logs redis --no-color || true
      return 1
    fi
    sleep 1
  done
}

build_and_start_services() {
  log "Building backend and frontend images (if required) and starting services..."
  if [ "${FORCE_RECREATE}" = true ]; then
    ${DCMD} up -d --build backend frontend
  else
    ${DCMD} up -d backend frontend
  fi
  success "Requested backend & frontend to start"
}

run_migrations() {
  log "Running Django migrations inside backend container..."
  ${DCMD} exec -T backend python manage.py migrate --noinput
  success "Migrations completed"
}

maybe_create_superuser() {
  if [ "${NONINTERACTIVE}" = true ]; then
    log "Non-interactive mode: skipping interactive superuser creation"
    return
  fi

  echo
  read -p "Create a Django superuser now? (y/N): " -r
  if [[ "$REPLY" =~ ^[Yy]$ ]]; then
    log "Launching createsuperuser (interactive) inside backend container. Follow prompts."
    ${DCMD} exec -it backend python manage.py createsuperuser
    success "createsuperuser finished"
  else
    log "Skipping createsuperuser"
  fi
}

check_backend_health() {
  log "Checking backend health endpoint (/api/health)..."
  # Attempt an HTTP request to localhost:8000/api/health
  local attempts=0
  local max=30
  until curl -fsS http://localhost:8000/api/health >/dev/null 2>&1 || [ "${attempts}" -ge "${max}" ]; do
    attempts=$((attempts + 1))
    sleep 1
  done
  if curl -fsS http://localhost:8000/api/health >/dev/null 2>&1; then
    success "Backend health endpoint is responding"
  else
    warn "Backend health endpoint did not respond in time"
    ${DCMD} logs backend --no-color || true
  fi
}

print_access_info() {
  echo
  echo -e "${GREEN}Sandy is (or is being) started:${NC}"
  echo -e "  Frontend: ${BLUE}http://localhost:3000${NC}"
  echo -e "  Backend:  ${BLUE}http://localhost:8000${NC}"
  echo -e "  Adminer (DB GUI): ${BLUE}http://localhost:8080${NC}"
  echo
  echo -e "${YELLOW}Useful commands:${NC}"
  echo -e "  ${BLUE}${DCMD} ps${NC}                - show running services"
  echo -e "  ${BLUE}${DCMD} logs -f backend${NC} - follow backend logs"
  echo -e "  ${BLUE}${DCMD} exec -it backend /bin/sh${NC} - open shell in backend container"
  echo -e "  ${BLUE}${DCMD} down -v${NC}            - stop and remove containers and volumes"
  echo
}

main() {
  # parse args
  while [ $# -gt 0 ]; do
    case "$1" in
      -y|--yes) NONINTERACTIVE=true; shift ;;
      -f|--force) FORCE_RECREATE=true; shift ;;
      -h|--help) usage; exit 0 ;;
      *) echo "Unknown arg: $1"; usage; exit 1 ;;
    esac
  done

  log "Starting quick start in project root: ${PROJECT_ROOT}"

  detect_compose
  ensure_docker_running
  ensure_compose_file
  create_env_file
  prompt_openai_key

  # Start DB and Redis first (so migrations can run)
  compose_up_db_redis

  # Wait for Postgres and Redis to be ready
  if ! wait_for_postgres; then
    err "Postgres did not start correctly; aborting"
    exit 1
  fi
  if ! wait_for_redis; then
    err "Redis did not start correctly; aborting"
    exit 1
  fi

  # Build and start backend & frontend
  build_and_start_services

  # Run migrations
  run_migrations

  # Optional createsuperuser
  maybe_create_superuser

  # Check backend health quickly
  check_backend_health

  print_access_info

  success "Quick start finished. If you need help, consult README.md or run the helper script in ./scripts/"
}

# trap to catch errors and nicely print guidance
trap 'err "An error occurred during quick start. Check docker logs (${DCMD} logs) and consult README.md"; exit 1' ERR

main "$@"
