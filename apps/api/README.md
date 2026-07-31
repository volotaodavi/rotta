# @rotta/api — Core API

Monólito modular NestJS da Rotta (Dossiê 12). Nenhuma regra de negócio implementada ainda — esta é a fase de fundação (Dossiê 22/23).

## Rodando localmente

```bash
# Na raiz do monorepo
cp .env.example .env
cp apps/api/.env.example apps/api/.env
docker compose up -d postgres redis
pnpm --filter @rotta/api prisma:generate
pnpm dev:api
```

A API sobe em `http://localhost:3333`, com documentação OpenAPI em `/v1/docs` e health check em `/health` e `/health/ready`.

## Estrutura

Ver Dossiê 12, Seção 3, para a explicação completa de cada pasta:

- `src/modules/*` — os 22 módulos de domínio do Dossiê 13 (todos vazios nesta fase)
- `src/common/*` — guards, interceptors, filters, pipes e decorators transversais
- `src/infra/*` — Prisma, Redis, BullMQ, logger estruturado
- `src/config/*` — configuração validada de ambiente
- `prisma/schema.prisma` — apenas datasource/generator; nenhuma tabela ainda (ver Dossiê 8)

## Próximos passos

Ver seção "Próximos passos" da entrega desta fase no histórico de commits — o primeiro módulo a ganhar implementação real deve ser `auth` (Dossiê 15), pois todos os demais dependem dele para autenticação/autorização end-to-end.
