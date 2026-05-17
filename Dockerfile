# ==========================================
# STAGE 1: Build
# ==========================================
FROM node:20-slim AS builder

WORKDIR /app

# Enable corepack for modern package managers if needed, or stick to npm
# Install dependencies first for better caching
COPY package*.json ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Build the frontend (Vite) and backend (esbuild)
# ensure typescript dependency is available for building
RUN npm run build

# ==========================================
# STAGE 2: Production Runtime
# ==========================================
FROM node:20-slim

WORKDIR /app

# Install production dependencies only to keep image size small
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled assets from builder
COPY --from=builder /app/dist ./dist

# Set production environment variables
ENV NODE_ENV=production
# Cloud Run sets the PORT automatically, default to 8080 if not set
ENV PORT=8080

# Security: Run as non-root user
USER node

# Expose port (Documentation purposes)
EXPOSE 8080

# Start the server (matches 'start' script in package.json)
CMD ["node", "dist/server.cjs"]
