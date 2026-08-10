# Dossiê 33 — Infraestrutura, DevOps e Preparação para Produção (Prompt 23)

> Origem: quinto "Prompt" da sequência original pedida pelo usuário —
> "Infraestrutura, DevOps e Preparação para Produção": múltiplos
> ambientes, Docker, CI/CD, gestão de segredos, backups automáticos,
> observabilidade/monitoramento completos, alertas, cache Redis, filas
> BullMQ, arquitetura de storage, processamento de upload, hardening de
> segurança (HTTPS/rate-limit/Helmet/CORS/CSRF/XSS/SQLi/força bruta),
> ferramental LGPD, planejamento de escala (5M responsáveis, 500K
> empresas, 1M motoristas, 50M viagens), preparo para loja de
> aplicativos, subdomínios próprios, página pública de status e
> atualização de documentação — **evoluir, nunca reconstruir** o que já
> existe.

## 1. Diagnóstico — o que já existia (auditoria real, não suposição)

A maior parte da lista do Prompt 23 já estava resolvida em entregas
anteriores (Dossiês 12, 22, 23, 31, 32) — confirmado lendo o código, não
assumido:

| Item pedido            | Situação encontrada                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Docker                 | `apps/api/Dockerfile` (multi-estágio) + `docker-compose.yml` (Postgres/PostGIS, Redis, API) já existentes                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| CI/CD                  | `.github/workflows/ci.yml` — lint, typecheck, testes unitários, testes E2E contra Postgres real, build, auditoria de dependências (`pnpm audit`), tudo por Turborepo com filtro de afetados                                                                                                                                                                                                                                                                                                                                                               |
| Cache Redis            | `RedisModule`/`RedisService` (`@Global()`), usado por health check e por rate-limit por trás do `ThrottlerModule`                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Fila                   | **QStash (Upstash)**, não BullMQ — decisão documentada em `queue.module.ts`: produção roda 100% serverless (Vercel/Render sem processo Node permanente), então "workers" são endpoints HTTP protegidos por `QstashSignatureGuard`, não um `Worker` BullMQ escutando Redis. Já implementado (Education Sync Agent — Dossiê "fila real BullMQ" é o nome histórico da tarefa, a implementação real é QStash)                                                                                                                                                 |
| Arquitetura de storage | Dois buckets Supabase (público/privado), URLs assinadas para dado pessoal — Dossiê 32                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| HTTPS                  | Terminado pelo Render/Vercel (certificado gerenciado automaticamente) — nenhuma ação de código necessária                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Rate limiting          | `ThrottlerModule` (30 req/60s padrão, mais apertado em rotas sensíveis)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Helmet                 | `app.use(helmet())` em `main.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| CORS                   | Validação por função (`isCorsOriginAllowed`), lista fechada + regex opcional para previews                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| CSRF                   | **Não aplicável ao desenho atual**: autenticação é 100% Bearer token (JWT no header `Authorization`), nunca cookie de sessão enviado automaticamente pelo navegador em toda requisição — o ataque CSRF clássico (forçar o navegador da vítima a enviar uma requisição autenticada "de graça") não tem superfície aqui, porque o navegador não anexa o token sozinho. Deixaria de ser verdade se/quando o refresh token migrar para cookie `httpOnly` (ver Dossiê 32 §4) — nesse dia, `SameSite=Strict/Lax` no cookie vira a mitigação, e reavaliar então. |
| XSS                    | React/Next.js escapa por padrão; único uso de `dangerouslySetInnerHTML` no código é JSON-LD estático (schema.org FAQPage), nunca entrada de usuário                                                                                                                                                                                                                                                                                                                                                                                                       |
| SQLi                   | 100% Prisma (queries parametrizadas) — nenhuma string SQL montada por concatenação encontrada                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Força bruta            | `ThrottlerGuard` + bloqueio de conta após 5 tentativas falhas (`MAX_FAILED_LOGIN_ATTEMPTS`, Dossiê 15)                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Log estruturado        | `nestjs-pino`, JSON, com `redact` de `authorization`/`cookie`/`senha`/`password`/`token` — nenhum dado sensível vaza pro log                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Health checks          | `GET /health` (liveness) e `GET /health/ready` (readiness — Postgres + Redis) já existentes, usados pelo orquestrador                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Índices de banco       | 71 `@@index` já declarados no schema (Dossiê 28)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

## 2. O que este Dossiê implementa (gap real, fechado agora)

### 2.1 Rastreamento de erros (observabilidade — gap real)

Antes: um erro 500 só existia no log estruturado — ninguém era avisado,
alguém precisava estar lendo o log ativamente. Implementado
`ErrorTrackingService` (`apps/api/src/infra/observability/`) — Sentry,
mesmo padrão "opcional, com aviso claro no boot" de
`SupabaseStorageService`/`DiditService`: sem `SENTRY_DSN`, a aplicação
sobe normal e o serviço vira no-op. `AllExceptionsFilter` (já existente)
agora também chama `errorTracking.captureException(...)` para todo 500,
com `correlationId`/método/URL como contexto — sem duplicar a lógica de
"isso é um 500" que o filtro já tinha.

### 2.2 Ferramental LGPD — portabilidade/confirmação de tratamento

Gap real: a Rotta não tinha nenhum mecanismo de autoatendimento LGPD
(art. 18) — um titular de dados não tinha como ver/exportar o que a
Rotta guarda sobre ele sem pedir manualmente. Implementado
`GET /auth/me/data-export`: agrega identidade (`User`, sem
`passwordHash`), vínculos (`Membership`) e sessões ativas do próprio
usuário autenticado.

**Escopo desta entrega, deliberadamente:** só os dados que o módulo
Auth já possui diretamente. Não inclui dado de outros módulos (alunos
cadastrados, documentos enviados, histórico de viagens, chamados de
suporte) — cada um exigiria integrar aquele módulo aqui; o próprio
`DataExportResponseDto` documenta essa lacuna no campo `escopo` da
resposta, para o titular nunca achar que recebeu tudo quando recebeu
uma fatia. Ver §5 para o plano de evolução (agregador cross-módulo).

**Direito ao esquecimento (exclusão), conscientemente NÃO implementado
agora**: ver §4.

### 2.3 Preparo de loja de aplicativos (mobile)

`apps/mobile/eas.json` criado — perfis de build EAS (`development`/
`preview`/`production`) e esqueleto de `submit` (Google Play/Apple).
`preview` e `production` hoje apontam para a mesma API
(`https://rotta-vt7i.onrender.com/v1`) porque **não existe ambiente de
staging** ainda (ver §4) — não é um erro, é o reflexo honesto de não
haver dois ambientes reais para apontar. `submit.production` referencia
`google-play-service-account.json` (arquivo que só existe quando alguém
com acesso ao Google Play Console gerar a credencial) e campos vazios
de Apple (preenchidos no momento da primeira submissão) — mesma
convenção de `.env.example` (placeholder documentado, nunca segredo
real no repositório).

### 2.4 Página pública de status

`apps/web` ganhou `/status` — consulta `GET /health/ready` ao vivo, no
navegador, a cada 30s, mostrando API/banco/cache como
Operacional/Degradado/Fora do ar. **Limitação honesta**: esta página
roda na mesma infraestrutura (Vercel) que o resto do site — se a Vercel
cair, a própria página de status cai junto. Um status page "de
verdade" precisa de infraestrutura independente da monitorada (ex.
Better Stack/UptimeRobot/status.io) — não implementado por exigir uma
conta externa que este código não pode provisionar sozinho.

## 3. Verificação

- `ErrorTrackingService`: 4 testes novos (aviso no boot, inicialização
  com DSN, no-op sem DSN, captura com contexto).
- `AuthService.dataExport`: 2 testes novos (rejeita usuário inexistente,
  agrega identidade+vínculos+sessões sem nunca incluir `passwordHash`).
- Suite completa da API: **53 suítes / 497 testes, 100% passando**
  (52→53 suítes, 491→497 testes).
- `pnpm turbo run typecheck` — limpo em `@rotta/api`, `@rotta/api-client`,
  `@rotta/web`, `@rotta/admin`.
- `pnpm turbo run build` — `apps/web` e `apps/admin` completam,
  incluindo a nova rota `/status` (3.28 kB).

## 4. O que fica de fora desta entrega — e por quê (honesto, não escondido)

Cada um destes exige uma conta/painel externo que esta sessão não tem
acesso para provisionar, ou uma decisão de produto/jurídica que não
cabe a uma mudança de código isolada:

| Item                                                                                      | Por que não implementado agora                                                                                                                                                                                                                                                                                                                                                                                                                | O que fazer quando chegar a hora                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Observabilidade/APM completa (dashboards, tracing de performance)                         | `tracesSampleRate: 0` deliberado — só erro, não performance; exige decidir orçamento de custo/amostragem com o time                                                                                                                                                                                                                                                                                                                           | Subir `tracesSampleRate` gradualmente no Sentry já integrado; ou adicionar Grafana/Datadog se o volume justificar                                                                                                                     |
| Backups automáticos                                                                       | Neon e Supabase (Dossiê 31) já fazem backup automático gerenciado do Postgres — não é responsabilidade de código da Rotta reimplementar isso                                                                                                                                                                                                                                                                                                  | Confirmar no painel do provedor escolhido (Neon hoje, Supabase após a migração) a janela de retenção contratada e documentar aqui                                                                                                     |
| Gestão de segredos além de variável de ambiente                                           | .env + variáveis no painel do Render/Vercel é adequado no estágio atual (poucas pessoas com acesso, sem exigência de compliance formal ainda)                                                                                                                                                                                                                                                                                                 | Migrar para Doppler/Vault/AWS Secrets Manager quando houver exigência de auditoria de acesso a segredo por pessoa                                                                                                                     |
| Múltiplos ambientes (staging)                                                             | Seria um segundo projeto Render+Vercel+Neon inteiro — decisão de custo recorrente, não só código                                                                                                                                                                                                                                                                                                                                              | Provisionar quando o volume de deploys arriscados justificar o custo extra; `eas.json` já está pronto para receber a URL de staging assim que existir                                                                                 |
| Subdomínios próprios (`app`/`api`/`admin`/`status`/`blog`/`docs`.rotta.com.br)            | Exige comprar/configurar DNS do domínio `rotta.com.br` — acesso de registrador que este código não tem                                                                                                                                                                                                                                                                                                                                        | Runbook: criar registro CNAME de cada subdomínio apontando pro respectivo serviço (Vercel para web/admin/docs, Render para api), seguido de configurar "Custom Domain" no painel de cada provedor                                     |
| LGPD — direito ao esquecimento (exclusão)                                                 | Diferente da exportação (§2.2, seguro de automatizar — é só leitura), excluir de verdade precisa de julgamento de negócio: um `User` com `Contract` ativo, `AuditLog` (retenção legal), ou registro financeiro (`WalletTransaction`, obrigação fiscal) não pode simplesmente sumir — automatizar isso sem essa decisão de produto/jurídica é o tipo de mudança arriscada que a instrução do próprio usuário ("sem dar erros") pede pra evitar | Desenho proposto: `POST /auth/me/deletion-requests` grava um pedido revisável por Admin Rotta (mesma fila de Aprovações do Backoffice, Dossiê 29) — implementar quando o produto decidir a política de retenção por categoria de dado |
| Conteúdo de listagem de loja (descrições, screenshots, política de privacidade publicada) | Escopo do Prompt 25 (Go-Live), não do 23 (infra) — `eas.json` (infra de build) está pronto, falta o conteúdo de marketing da ficha da loja                                                                                                                                                                                                                                                                                                    | Ver Dossiê a ser escrito quando o Prompt 25 for a vez na sequência                                                                                                                                                                    |
| Planejamento de escala para 5M responsáveis/500K empresas/1M motoristas/50M viagens       | Ver análise abaixo — não é uma tarefa de código isolada, é uma leitura da arquitetura atual contra os alvos                                                                                                                                                                                                                                                                                                                                   | Análise qualitativa a seguir                                                                                                                                                                                                          |

### 4.1 Nota sobre planejamento de escala (qualitativo, não uma implementação)

A arquitetura atual já tem as peças certas para esses volumes sem
mudança estrutural: Postgres com 71 índices (Dossiê 28), pooler de
conexão (PgBouncer via Supabase, Dossiê 31) evita esgotar conexões sob
carga, paginação já é o padrão em todo endpoint de listagem (`page`/
`pageSize`, ex. `CompaniesService.list`), o worker é serverless (QStash)
— escala automaticamente com o provedor, sem servidor dedicado para
dimensionar. O que hoje é a real incógnita não é uma falha de design, é
a ausência de dado real de carga: nenhum teste de carga rodou contra os
volumes-alvo (isso é escopo do Prompt 24, "Qualidade, Testes,
Segurança e Certificação" — já sinalizado como o próximo da sequência
após este). Sem esse teste, qualquer número de "suporta X" seria
inventado — não afirmado aqui.

## 5. Plano de evolução futura

| Item                                                    | Gatilho                                                         | Esforço estimado                                                                                                                   |
| ------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Exportação LGPD cobrindo todos os módulos (não só Auth) | Pedido real de portabilidade completa de um titular             | Médio — um agregador que cada módulo alimenta, mesmo padrão de `BackofficeService.getDashboard` reutilizado por `AnalyticsService` |
| Direito ao esquecimento com fila de revisão             | Decisão de produto/jurídica sobre retenção por categoria        | Médio-alto — novo modelo `PrivacyRequest` + fila no Backoffice                                                                     |
| Ambiente de staging                                     | Volume de deploys arriscados justificar o custo                 | Alto — segundo projeto Render+Vercel+Neon completo                                                                                 |
| Sentry com tracing de performance                       | Sentry (erro) já em produção e sob controle                     | Baixo — subir `tracesSampleRate`                                                                                                   |
| Status page em infraestrutura independente              | Página atual (`/status`) provar insuficiente num incidente real | Baixo — trocar por embed de um provedor externo                                                                                    |
