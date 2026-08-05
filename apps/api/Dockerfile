# Dockerfile da Core API (apps/api) — Dossie 12, Secao 12.1 e Dossie 23, Secao 14.
#
# Build multi-estagio a partir da raiz do monorepo (contexto de build =
# raiz do repositorio, nao apps/api/), usando `turbo prune` para isolar
# apenas os pacotes/apps dos quais apps/api realmente depende antes de
# instalar dependencias — evita reinstalar o workspace inteiro em cada
# imagem (Dossie 22, Secao 2).
#
# Build:  docker build -f apps/api/Dockerfile -t rotta/api .

FROM node:22-slim AS base
RUN corepack enable

# ---------------------------------------------------------------------------
FROM base AS pruner
WORKDIR /app
RUN npm install -g turbo@^2
COPY . .
RUN turbo prune @rotta/api --docker

# ---------------------------------------------------------------------------
FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .
RUN pnpm turbo run build --filter=@rotta/api
RUN pnpm --filter=@rotta/api prisma:generate

# ---------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 rotta && adduser --system --uid 1001 rotta

COPY --from=installer --chown=rotta:rotta /app .

USER rotta
EXPOSE 3333

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3333/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "apps/api/dist/main.js"]
