# Official Python slim image - good balance between size and compatibility
FROM python:3.11-slim

# Do not generate .pyc files and make stdout/stderr unbuffered (helpful for logging)
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    POETRY_VERSION=1.4.0

# Install OS-level dependencies required to build many Python packages (psycopg2, pillow, etc.)
# Keep packages minimal for smaller image. Clean apt lists after install.
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        gcc \
        libpq-dev \
        curl \
        gnupg \
        git \
        netcat \
        libjpeg-dev \
        zlib1g-dev \
        libffi-dev \
        libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user to run the application
ARG APP_USER=sandy
ARG APP_UID=1001
RUN groupadd --gid ${APP_UID} ${APP_USER} \
    && useradd --uid ${APP_UID} --gid ${APP_UID} --shell /bin/bash --create-home ${APP_USER}

WORKDIR /app

# Copy only requirements first to leverage Docker layer caching
COPY backend/requirements.txt /app/requirements.txt

# Upgrade pip and install Python dependencies
RUN python -m pip install --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r /app/requirements.txt

# Copy the Django backend source code
# NOTE: copy the entire backend directory so the container has the project layout expected by manage.py
COPY backend/ /app/

# Create directories for runtime artifacts, static files and logs and set ownership
RUN mkdir -p /app/staticfiles /app/media /app/logs \
    && chown -R ${APP_USER}:${APP_USER} /app

# Switch to non-root user
USER ${APP_USER}

# Expose Django default port (the docker-compose.yml maps 8000 to the host)
EXPOSE 8000

# Default environment variables useful for Django
ENV DJANGO_SETTINGS_MODULE=sandy.settings \
    PYTHONPATH=/app

# Healthcheck: simple HTTP check on the expected health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

# Default command:
# - In docker-compose we typically override the command to run migrations then runserver in development.
# - For production you may want to run gunicorn or daphne configured for ASGI.
CMD ["gunicorn", "sandy.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]