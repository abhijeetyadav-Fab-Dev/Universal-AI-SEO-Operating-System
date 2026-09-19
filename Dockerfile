# ==============================================================================
# OmniSEO-OS Universal AI-Powered SEO Operating System
# Production Multi-Stage Dockerfile (Node.js 20 Slim)
# Security: Non-root user, proper file permissions, healthcheck on /api/health
# ==============================================================================

FROM node:20-bookworm-slim AS production

# Set production environment flags
ENV NODE_ENV=production \
    PORT=4000

# Set container working directory
WORKDIR /app

# Install security updates and curl for container health check probes
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package manifests for deterministic layer caching
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy application assets and source code
COPY . .

# Ensure secure file ownership for the default non-root node user
RUN chown -R node:node /app

# Switch to non-root user (UID 1000) for least-privilege security compliance
USER node

# Expose default HTTP application port
EXPOSE 4000

# Automated Docker Healthcheck targeting the live /api/health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4000/api/health || exit 1

# Launch OmniSEO-OS Server
CMD ["node", "server/index.js"]
