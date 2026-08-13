# Meridian Relief Network — Cloud Run single container
# Stage 1: build React (Vite) → Stage 2: Node 20 Express serves /api + SPA
# Cloud Run injects PORT (default 8080); the server binds to 0.0.0.0:$PORT

# ---------------------------------------------------------------------------
# Stage 1 — frontend build
# ---------------------------------------------------------------------------
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2 — production runtime (Express + static SPA)
# ---------------------------------------------------------------------------
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production \
    PORT=8080 \
    FRONTEND_DIST=/app/frontend/dist

# Backend dependencies (production only)
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --omit=dev

# Application code + built frontend
COPY backend/ ./backend/
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

WORKDIR /app/backend

# Cloud Run sends traffic to $PORT (8080 by default)
EXPOSE 8080

CMD ["node", "src/index.js"]
