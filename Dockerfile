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
EXPOSE 3000

# Start server
CMD ["node", "server/index.js"]
