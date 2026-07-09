FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
RUN npm ci --ignore-scripts

COPY src/ ./src/
RUN npm run build

FROM node:20-alpine AS dashboard-builder

WORKDIR /dashboard

COPY dashboard/package.json dashboard/package-lock.json dashboard/tsconfig.json dashboard/vite.config.ts ./
COPY dashboard/index.html ./
COPY dashboard/src/ ./src/

RUN npm ci --ignore-scripts && npm run build

FROM node:20-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 appuser

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=dashboard-builder /dashboard/dist ./public

RUN mkdir -p logs && chown -R appuser:appgroup logs

USER appuser

EXPOSE 3000

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/healthz || exit 1

CMD ["node", "dist/index.js"]
