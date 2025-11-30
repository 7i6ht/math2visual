# Multi-stage Dockerfile for Math2Visual Application
# Stage 1: Build frontend
FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci

# Copy frontend source code
COPY frontend/ ./

# Build frontend for production
# Note: VITE_BACKEND_URL can be set via build arg if needed
# If not set, frontend will use window.location.origin (same origin)
ARG VITE_BACKEND_URL
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}

# Build for production
RUN npm run build

# Stage 2: Backend with frontend static files
FROM python:3.12-slim AS backend

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libmagic1 \
    libxml2-dev \
    libxslt1-dev \
    && rm -rf /var/lib/apt/lists/*

# Create app user for security
RUN useradd -m -u 1000 appuser && \
    mkdir -p /app /app/logs /app/static && \
    chown -R appuser:appuser /app

# Set working directory
WORKDIR /app

# Switch to app user
USER appuser

# Copy requirements first for better layer caching
COPY --chown=appuser:appuser backend/requirements.txt .

# Install Python dependencies
RUN pip install --user --no-cache-dir -r requirements.txt && \
    pip install --user gunicorn

# Add user's local bin to PATH
ENV PATH=/home/appuser/.local/bin:$PATH

# Copy backend application code
COPY --chown=appuser:appuser backend/ .

# Copy built frontend from frontend-builder stage
COPY --from=frontend-builder --chown=appuser:appuser /app/frontend/dist ./static

# Expose port
EXPOSE 5000

# Health check (checks if the server port is listening)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import socket; s = socket.socket(); s.settimeout(2); result = s.connect_ex(('127.0.0.1', 5000)); s.close(); exit(0 if result == 0 else 1)"

# Default command (can be overridden)
CMD ["gunicorn", "--config", "gunicorn.conf.py", "wsgi:app"]

