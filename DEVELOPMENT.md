# Development setup

This document contains step-by-step instructions to run the project locally (backend and frontend). It assumes you have Docker and Docker Compose installed, and Python 3.12+ and Node.js 18+.

1) Backend — Python / Django

- Create and activate a virtual environment inside `backend/`:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt
```

- Create `.env` or set environment variables. You can copy `env.example` and edit values. Minimum values needed for local dev:

```env
# Django
SECRET_KEY=unsafe-dev-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (when using local Docker postgres below)
DATABASE_URL=postgresql://sandy:sandy@localhost:5432/sandy_db

# Redis for channels/celery
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# OpenAI (optional for local dev)
OPENAI_API_KEY=
OPENAI_MODEL=gpt-3.5-turbo
```

- Start a local Postgres (recommended via Docker). Example:

```bash
# Run Postgres container (one-time)
docker run -d --name sandy-postgres \
  -e POSTGRES_USER=sandy \
  -e POSTGRES_PASSWORD=sandy \
  -e POSTGRES_DB=sandy_db \
  -p 5432:5432 \
  -v "$(pwd)/postgres-data:/var/lib/postgresql/data" \
  postgres:15
```

- Wait until Postgres is healthy, then run migrations and create a superuser:

```bash
source .venv/bin/activate
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
```

- Run the backend server:

```bash
python manage.py runserver 0.0.0.0:8000
```

2) Frontend — Next.js

- Install and run:

```bash
cd src
npm install
cp ../env.example .env.local  # adjust if needed
npm run dev
```

3) Services used (summary)

- PostgreSQL: data persistence for backend. (Container recommended in development.)
- Redis: Channels layer and Celery broker.
- Celery + Redis: Background jobs (optional for dev, but useful).
- OpenAI: AI features (requires API key).

4) Running tests

- Backend tests (Django/PyTest)

```bash
cd backend
source .venv/bin/activate
pytest
```

- Frontend tests

```bash
cd src
npm test
```

5) Troubleshooting notes

- If migrations fail because Postgres is not reachable, confirm container is running and `DATABASE_URL` is correct.
- Create the `logs/` directory in `backend/` if Django logging complains about missing log files.
- If you need a quick local-only development DB, set `DATABASE_URL=sqlite:///../data/dev.sqlite3` in the backend `.env`.

6) Local dev tips

- Use `docker-compose` to manage Postgres + Redis together. A basic `docker-compose.yml` is helpful and can be added to the repo.
- Use `python manage.py migrate --run-syncdb` only in emergencies.

If you want, I can add a `docker-compose.yml` (Postgres + Redis) and a basic `Makefile` with commands to start everything.
