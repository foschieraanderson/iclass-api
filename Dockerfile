# ── Stage 1: production dependencies ──────────────────────────────
FROM node:20-alpine AS prod-deps
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# ── Stage 2: full build ────────────────────────────────────────────
FROM node:20-alpine AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm exec prisma generate --schema=database/schema.prisma
RUN pnpm build

# ── Stage 3: runner ────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 fastify

COPY --from=prod-deps --chown=fastify:nodejs /app/node_modules            ./node_modules
COPY --from=builder   --chown=fastify:nodejs /app/dist                    ./dist
COPY --from=builder   --chown=fastify:nodejs /app/src/database/generated  ./src/database/generated
COPY --chown=fastify:nodejs package.json          ./
COPY --chown=fastify:nodejs database/schema.prisma ./database/schema.prisma

RUN mkdir -p uploads && chown fastify:nodejs uploads

USER fastify
EXPOSE 3000
CMD ["node", "dist/server.js"]
