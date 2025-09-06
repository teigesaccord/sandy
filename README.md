# Sandy - Personalized Support Chatbot

A compassionate AI assistant providing personalized support for daily challenges, built with Next.js, TypeScript, and OpenAI.

## 🌟 Features
```markdown
# Sandy — Personalized Support Chatbot

A full-stack application: a Next.js (TypeScript) frontend and a Django REST Framework backend. Sandy uses OpenAI for AI responses and a standard production stack (Postgres, Redis, Channels, Celery).

This README high-levels what the project uses and how to get a local development environment running. For more detailed developer steps see `DEVELOPMENT.md`.

Key services used
- Frontend: Next.js + TypeScript (in `src/`)
- Backend: Django 5 + Django REST Framework (in `backend/`)
- Database: PostgreSQL
- Caching / Channels: Redis (Channels + channels_redis)
- Background tasks: Celery (Redis broker)
- Auth: JWT (djangorestframework-simplejwt)
- AI: OpenAI API

Repository layout (high level)

- `src/` — Next.js frontend application
- `backend/` — Django backend project
- `public/`, `data/`, `logs/` — assets & runtime data

Quick development checklist

1. Backend: create and activate Python venv, install requirements, start Postgres, run migrations, run server.
2. Frontend: install npm dependencies and start Next.js dev server.

See `DEVELOPMENT.md` for exact commands and environment variables.

API overview
- Auth: `/api/auth/` (JWT token endpoints)
- Profiles: `/api/profiles/` (DRF viewset)
- Health & docs: `/api/schema/`, `/api/docs/`

Contributing

1. Fork and create a feature branch
2. Run tests and linters locally
3. Open a pull request with a clear description

License

MIT.

``` 