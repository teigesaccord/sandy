# Backend Dockerfile for Django (development friendly)
# This Dockerfile is intended to be built with the build context set to the `backend/` directory.
# Example (docker-compose): context: ./backend, dockerfile: Dockerfile

FROM python:3.11-slim

# Prevent Python from writing .pyc files and ensure stdout/stderr are unbuffered (useful for logs)
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install minimal system dependencies required to build common Python packages and talk to Postgres
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    libpq-dev \
    curl \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user for running the app
ARG APP_USER=sandy
ARG APP_UID=1001
RUN groupadd --gid ${APP_UID} ${APP_USER} \
    && useradd --uid ${APP_UID} --gid ${APP_UID} --shell /bin/bash --create-home ${APP_USER}

WORKDIR /app

# Copy only requirements first to leverage Docker layer caching
COPY requirements.txt /app/requirements.txt

# Upgrade pip and install Python dependencies
RUN python -m pip install --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r /app/requirements.txt

# Copy the application code. When building with context=./backend this will copy the project files.
COPY . /app

# Create runtime directories and set permissions
# This is crucial for Django logging and static files
RUN mkdir -p /app/staticfiles /app/media /app/logs /app/data \
    && chown -R ${APP_USER}:${APP_USER} /app

# Use non-root user
USER ${APP_USER}

# Expose Django port
EXPOSE 8000

# Helpful default environment variables for local development
ENV DJANGO_SETTINGS_MODULE=sandy.settings \
    PYTHONPATH=/app

# Simple healthcheck hitting the backend health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -fsS http://localhost:8000/api/health || exit 1

# Dev-friendly default command:
# - run migrations (non-interactive) then start the Django development server listening on all interfaces
# In production you should replace this with a proper WSGI/ASGI server (gunicorn/daphne) and supervise static collection.
CMD ["sh", "-c", "python manage.py migrate --noinput && python manage.py runserver 0.0.0.0:8000"]