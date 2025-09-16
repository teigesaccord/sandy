# Use the official Node.js 18 slim image (glibc-based) for Next.js SWC compatibility
FROM node:18-slim

# Set the working directory inside the container
WORKDIR /app

# Install system dependencies needed for native modules and Next.js
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install Node.js dependencies (include dev dependencies for development)
RUN npm ci && npm cache clean --force

# Create non-root user for security
RUN groupadd --gid 1001 sandy && \
    useradd --uid 1001 --gid sandy --shell /bin/bash --create-home sandy

# Create necessary directories with proper permissions
RUN mkdir -p data logs public src scripts .next && \
    chown -R sandy:sandy /app

# Copy application code
COPY --chown=sandy:sandy . .

# Create .env file from example if it doesn't exist
RUN if [ ! -f .env ]; then cp .env.example .env; fi

# Switch to non-root user
USER sandy

# Expose the port the app runs on
EXPOSE 3000

# Health check to ensure the application is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health/ || exit 1

# Set environment variables
ENV NODE_ENV=development
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

# Run the setup script and start the application
CMD ["sh", "-c", "node scripts/setup.js && npm run dev"]
