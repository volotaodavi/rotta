# infra/

Infraestrutura como código (Dossiê 22, Seção 3.1) — Terraform para os recursos de nuvem da fase de escala nacional (Dossiê 9, Seção 2.8), Dockerfiles compartilhados, configuração de ambientes.

## Estado atual

Apenas a organização de pastas (fase de fundação):

- `docker/` — reservado para Dockerfiles/configuração compartilhada entre `apps/api`, `apps/realtime-gateway` e `apps/worker` quando esses dois últimos forem criados (ver "Próximos passos" da entrega desta fase). Hoje, `apps/api/Dockerfile` é autocontido.
- `terraform/` — reservado para quando a plataforma migrar de Vercel/Railway (fase MVP) para AWS (Dossiê 9, Seção 2.8) — nenhum recurso de nuvem provisionado ainda.

Não confundir com `docker-compose.yml` (raiz do monorepo), que é o ambiente de **desenvolvimento local**, não infraestrutura de produção.
