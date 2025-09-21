# Running with Docker (Development)

This document describes how to run the project locally using Docker and Docker Compose. It assumes you have Docker and Docker Compose installed.

Prerequisites
- Docker (Engine) installed and running
- Docker Compose available (either `docker compose` or `docker-compose`)
- A copy of the environment file: `.env` (you can copy from `.env.example`)

Quick-start (recommended)
1. From the repository root, create a local `.env` if you don't have one:
   - `cp .env.example .env`
   - Edit `.env` to set required secrets (for example `OPENAI_API_KEY`) and any overrides.

2. Build and start services:
   - `docker compose up --build`
   - This will build images and start services defined in `docker-compose.yml`. By default the compose setup includes:
     - `frontend` (Next.js) mapped to host port `3000`
     - `backend` (Django) mapped to host port `8000`
     - `db` (Postgres) on `5432`
     - `redis` on `6379`
     - `adminer` (DB GUI) on `8080`

3. Verify:
   - Frontend: http://localhost:3000
   - Backend health: http://localhost:8000/api/health
   - Adminer (DB GUI): http://localhost:8080

Common commands
- Build images only:
  - `docker compose build`
- Bring services up in foreground (useful for debugging):
  - `docker compose up`
- Detach (background):
  - `docker compose up -d`
- Stop and remove containers (keep volumes by default):
  - `docker compose down`
- Stop and remove containers, networks and volumes:
  - `docker compose down -v`
- View logs:
  - `docker compose logs -f` (follow)
  - `docker compose logs backend` (service-specific)
- See running services:
  - `docker compose ps`

Development notes
- The compose configuration mounts source into containers for fast iteration:
  - `backend` volume mounts `./backend:/app` so Python code changes take effect immediately (Django dev server auto-reloads).
  - `frontend` mounts the repo root into `/app` and runs `npm run dev` so Next.js hot reloads.
- If you change dependencies:
  - For the frontend: re-run `npm install` locally or rebuild the `frontend` image: `docker compose build frontend`
  - For the backend: rebuild the backend image: `docker compose build backend`

Database / migrations
- The `backend` service runs migrations on startup by default (in dev compose). If you need to run them manually:
  - `docker compose exec backend python manage.py migrate --noinput`
  - Create a superuser:
    - `docker compose exec backend python manage.py createsuperuser`

Inspecting the database
- Open Adminer: http://localhost:8080
  - Server: `db`
  - Username: `sandy`
  - Password: `sandy`
  - Database: `sandy_db`

Environment variables and Next.js
- For client-side code, use `NEXT_PUBLIC_*` variables (e.g. `NEXT_PUBLIC_API_HOST`).
- In the `.env` file set:
  - `NEXT_PUBLIC_API_HOST=http://localhost:8000`
  - `API_HOST=http://localhost:8000` (server-side)
- If Next.js tries to contact the backend during `npm run build`, ensure `API_HOST` points to a reachable backend.

Debugging tips
- Backend not starting?
  - Check logs: `docker compose logs backend`
  - Confirm DB is healthy: `docker compose logs db` and `docker compose ps`
  - If migrations fail, check that `DATABASE_URL` is correctly set in `.env` or overridden in `docker-compose.yml`.
- Frontend issues:
  - Check `docker compose logs frontend`
  - Ensure `.env` values required by the build are present (especially `NEXT_PUBLIC_API_HOST`).
- Healthchecks:
  - The backend exposes a simple health endpoint at `/api/health`. Use it to check readiness: `curl http://localhost:8000/api/health`

Cleaning up
- Remove all containers, networks and volumes:
  - `docker compose down -v --remove-orphans`
- Remove dangling images:
  - `docker image prune -f`

Production notes (brief)
- The provided compose setup is intended for local development. For production:
  - Use a proper process manager (e.g. `gunicorn` or `daphne` for ASGI) behind an HTTP server (Nginx).
  - Disable Django `DEBUG` and configure appropriate `ALLOWED_HOSTS`.
  - Collect static files and serve them from a CDN or Nginx (`python manage.py collectstatic --noinput`).
  - Use secrets management for sensitive environment variables (do not keep production secrets in `.env`).

If you want, I can add a small `Makefile` or convenience scripts to wrap the most common docker-compose commands (`up`, `down`, `logs`, `migrate`).
