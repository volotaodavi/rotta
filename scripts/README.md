# scripts/

Automações que não são nem um `app` nem um `package` (Dossiê 22, Seção 3.1): geração de código a partir de templates, scripts de migração/seed de banco de desenvolvimento, scripts de corte de release.

## Estado atual

Vazio (fase de fundação) — nenhum script criado ainda, já que não há schema de banco (`apps/api/prisma/schema.prisma`) nem processo de release a automatizar.

Candidatos previstos para quando a implementação avançar:

- `seed.ts` — popular o banco de desenvolvimento com dado fictício, quando o schema Prisma existir (Dossiê 8)
- `generate-module.ts` — scaffolding de um novo módulo de backend seguindo o padrão do Dossiê 12, Seção 2
