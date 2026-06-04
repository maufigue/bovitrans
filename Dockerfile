# ============================================================
# Dockerfile — BoviTrans Next.js App
# Build multi-stage: builder + runner
# ============================================================

# ─────────────────────────────────────────
# Etapa 1: Dependencias base
# ─────────────────────────────────────────
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app


# ─────────────────────────────────────────
# Etapa 2: Instalar dependencias
# ─────────────────────────────────────────
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci


# ─────────────────────────────────────────
# Etapa 3: Build de producción
# ─────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Evita telemetría de Next.js en build
ENV NEXT_TELEMETRY_DISABLED=1

ENV NEXT_PRIVATE_STANDALONE=true

RUN npm run build


# ─────────────────────────────────────────
# Etapa 4: Runner (imagen final liviana)
# ─────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Usuario no-root por seguridad
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# Copiar artefactos del build
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
