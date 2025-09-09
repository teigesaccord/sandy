# Sandy - Personalized Support Chatbot

A compassionate AI assistant providing personalized support for daily challenges, built with Next.js, TypeScript, and OpenAI.

## 🌟 Features
```markdown
# Sandy — Personalized Support Chatbot

A full-stack application with a Next.js (TypeScript) frontend and a Django REST Framework backend. Sandy uses OpenAI for AI responses and a standard production stack (Postgres, Redis, Channels, Celery).

This README covers the most common developer workflows: local development, build, and quick smoke checks. For deeper developer notes see `DEVELOPMENT.md`.

Highlights
- Frontend: Next.js + TypeScript (in `src/`)
- Backend: Django 5 + Django REST Framework (in `backend/`)
- Database: PostgreSQL
- Caching / Channels: Redis
- Background tasks: Celery (Redis broker)
- Auth: JWT (djangorestframework-simplejwt)
- AI: OpenAI API

Repository layout (high level)
- `src/` — Next.js frontend application
- `backend/` — Django backend project
- `public/`, `data/`, `logs/` — assets & runtime data

Quick start (local development)

1) Start local infra (Postgres + Redis)

```bash
# from repository root
docker compose up -d db redis
```

2) Backend (Django)

```bash
# create/activate a virtualenv in backend/ (optional: the repo may provide .venv)
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
# run migrations
cd backend
python manage.py migrate
# start dev server (accessible at http://localhost:8000)
python manage.py runserver 0.0.0.0:8000
```

3) Frontend (Next.js)

```bash
# from repository root
npm install
# development
npm run dev
# or build for production
npm run build && npm start
```

Environment variables
- Copy `.env.example` to `.env` and fill secrets (OpenAI key, etc.).
- Optional overrides for frontend → backend requests:
  - `NEXT_PUBLIC_API_HOST` (browser): e.g. `http://localhost:8000`
  - `API_HOST` (server-side): e.g. `http://localhost:8000`

Quick verification / smoke checks
- Health endpoint (when Django is running):

```bash
curl -sS http://localhost:8000/api/health/ | jq .
```

- Frontend build should succeed when Django is reachable from the build host. If you see network errors during `npm run build`, ensure `API_HOST` is set to `http://localhost:8000` (or the correct backend URL) so server-side fetches don't attempt HTTPS against a plain HTTP dev server.

API overview (selected)
- `POST /api/auth/register/` — create user
- `POST /api/auth/login/` — obtain JWT / authentication cookie
- `POST /api/auth/logout/` — logout
- `GET  /api/auth/me/` — current user
- `GET/PUT/DELETE /api/users/<userId>/profile/` — profile CRUD
- `GET/POST /api/users/<userId>/chat/` — conversation messages
- `GET  /api/users/<userId>/recommendations/` — recommendations

Developer notes
- The frontend uses a thin HTTP proxy at `src/services/PostgreSQLService.ts` to forward DB/API calls to the Django backend. Keep that proxy in-sync with backend endpoints when you change API shapes.
- If you need to run background workers (Celery), start Redis and run `celery -A sandy worker -l info` from the `backend/` virtualenv.

Troubleshooting
- If Next's static export fails due to a fetch SSL error (ERR_SSL_WRONG_VERSION_NUMBER), check that `API_HOST`/`NEXT_PUBLIC_API_HOST` is `http://...` not `https://` for local dev.
- If Django imports fail on startup, ensure the Python virtualenv is active and `backend/requirements.txt` is installed.

Where to go next
- `DEVELOPMENT.md` for deeper contribution and docker/dev workflows.
- `MIGRATION_SUMMARY.md` for notes about schema and migration history.

License
- MIT

````