# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Runtime Stage
FROM node:20-alpine

WORKDIR /app

# Copy package.json for production install
COPY package.json package-lock.json ./
# Install only production dependencies
RUN npm ci --omit=dev

# Copy backend code
COPY server ./server

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist

# Create directory for sqlite database and data volume
RUN mkdir -p /app/server && mkdir -p /app/data

# Expose port
EXPOSE 4735
ENV PORT=4735
ENV HOST=0.0.0.0

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4735/api/health || exit 1

# Start server
CMD ["node", "server/index.js"]
