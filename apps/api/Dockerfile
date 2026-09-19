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

# Corrigido em 18/09/2026, investigando "a conta do transportador nao
# esta entrando" + "demorando muito". Este healthcheck NUNCA passou, por
# dois motivos somados:
#
#  1. Batia em `/health`, que e 404. A aplicacao registra um prefixo
#     global (`app.setGlobalPrefix(config.apiPrefix)`, main.ts), entao o
#     caminho real e `/v1/health` — confirmado contra producao: `/health`
#     devolve 404 e `/v1/health` devolve 200.
#  2. Fixava a porta 3333, que e so o default local. Em producao quem
#     manda e a env `PORT` (`app.config.ts`), injetada pelo Render.
#
# Um healthcheck que nunca passa e pior que nenhum: o orquestrador
# conclui que o container esta doente e reinicia — e num plano com cold
# start lento isso vira um ciclo de reinicio, exatamente o sintoma
# relatado. Forma shell (nao exec) de proposito: e o shell que expande
# `${PORT}`/`${API_PREFIX}` em tempo de execucao.
# `--start-period=90s` porque a porta so abre depois de migrate + seed
# (ver o CMD abaixo) — com 10s o container era declarado doente antes de
# terminar de subir.
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||3333)+'/'+(process.env.API_PREFIX||'v1')+'/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Migra o schema ANTES de subir o processo — nunca servir trafego sobre
# um banco fora de versao. O `&&` e deliberado: migration falhou, nao
# sobe.
#
# 19/09/2026 — o `prisma db seed` SAIU daqui, e o `pnpm` tambem. Porque:
#
# No plano gratuito do Render o container dorme e e RECRIADO a cada
# acordada, entao tudo que roda antes de `node main.js` e pago de novo
# a cada cold start. Media: a API levava mais de 90 segundos para
# devolver o primeiro byte (`curl: (28) timed out after 90s with 0
# bytes received`, em 15 das 20 ultimas execucoes do keep-warm), e o
# app do celular desistia antes — era a origem da tela azul travada que
# os transportadores viam.
#
# O trabalho de banco do seed era trivial (11 upserts). O caro era o
# BOOT DE FERRAMENTA: dois `pnpm` resolvendo workspace, o CLI do Prisma,
# e o `ts-node` compilando TypeScript em tempo de execucao.
#
# O seed agora acontece dentro da propria aplicacao, no boot, onde o
# Node e o Prisma Client ja estao de pe:
#   - catalogo de planos: `CompaniesService.onModuleInit` (ja fazia)
#   - documentos legais:  `LegalDocumentsService.onModuleInit` (novo)
# `pnpm prisma:seed` continua funcionando para dev local e banco novo.
#
# A migration continua aqui, mas chamando o binario direto em vez de
# passar pelo `pnpm`. Os fallbacks existem porque nao da para testar
# build de imagem Docker no ambiente onde isto foi escrito: se o layout
# do `turbo prune` colocar o binario em outro lugar, cai no caminho
# alternativo e, por ultimo, no `pnpm` de antes. Escolha de caminho nao
# pode ser o motivo de a API nao subir.
CMD ["sh", "-c", "P=apps/api/node_modules/.bin/prisma; [ -x \"$P\" ] || P=node_modules/.bin/prisma; if [ -x \"$P\" ]; then \"$P\" migrate deploy --schema apps/api/prisma/schema.prisma; else echo '[boot] binario do prisma nao encontrado, usando pnpm'; pnpm --filter=@rotta/api prisma:migrate:deploy; fi && node apps/api/dist/main.js"]
