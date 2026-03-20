# syntax=docker/dockerfile:1

# ── Stage 1: Install dependencies ──
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json ./
RUN npm install

# ── Stage 2: Build ──
FROM node:22-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ── Stage 3: Production ──
FROM node:22-alpine AS production
WORKDIR /app

# Create non-root user
RUN addgroup -S brilion && adduser -S brilion -G brilion

# Copy only the build output (self-contained Nitro server)
COPY --from=build /app/.output ./.output

# Create uploads directory with proper permissions
RUN mkdir -p /app/uploads && chown -R brilion:brilion /app

USER brilion

# Railway injects PORT; Nitro reads it automatically
EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
