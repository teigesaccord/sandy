# Use the official Node.js 18 Alpine image as base
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Install system dependencies needed for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite \
    curl

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Create non-root user for security
RUN addgroup -g 1001 -S sandy && \
    adduser -S sandy -u 1001

# Create necessary directories with proper permissions
RUN mkdir -p data logs public src scripts && \
    chown -R sandy:sandy /app

# Copy application code
COPY --chown=sandy:sandy . .

# Create .env file from example if it doesn't exist
RUN if [ ! -f .env ]; then cp .env.example .env; fi

# Ensure the database directory exists and has proper permissions
RUN mkdir -p /app/data && chown sandy:sandy /app/data

# Switch to non-root user
USER sandy

# Expose the port the app runs on
EXPOSE 3000

# Health check to ensure the application is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Run the setup script and start the application
CMD ["sh", "-c", "node scripts/setup.js && npm run dev"]
