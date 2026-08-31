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
| Subdomínios próprios (`www`/`api`/`admin`.rottabr.com.br)                                 | Domínio oficial confirmado pelo usuário (31/08/2026): `rottabr.com.br` — mas o DNS ainda não está configurado (acesso de registrador que este código não tem)                                                                                                                                                                                                                                                                                 | Runbook completo na §6 abaixo                                                                                                                                                                                                         |
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

## 6. Domínio oficial confirmado — `rottabr.com.br` (31/08/2026)

O usuário confirmou `rottabr.com.br` como domínio oficial da Rotta.
Todo o código já era escrito de propósito para não hardcodar nenhum
domínio de produção (`getSiteUrl()`/`getWebUrl()`/`getAdminUrl()`
resolvem por variável de ambiente, com o `<projeto>.vercel.app`/
`<serviço>.onrender.com` atual como fallback) — então nenhuma mudança
de código é necessária pra "ativar" o domínio além dos 3 defaults
abaixo, que apontavam para `rotta.com.br` (nunca pertenceu à Rotta —
era página de revenda de terceiro) e foram corrigidos nesta entrada:
`EMAIL_FROM_ADDRESS` default (`email.config.ts`), User-Agent do
Nominatim (`geo.config.ts`) e User-Agent do Education Sync Agent
(`inep-sync.service.ts`).

Tudo o que falta é infraestrutura (DNS, painéis de provedor, variáveis
de ambiente) — nenhuma exige acesso que este código tenha. Mapeamento
de subdomínio proposto (mesmo padrão já usado: `apps/web` serve
marketing E painel do cliente num único domínio; `apps/admin` e
`apps/api` isolados por subdomínio):

| Subdomínio                 | App          | Provedor                                       |
| -------------------------- | ------------ | ---------------------------------------------- |
| `rottabr.com.br` (+ `www`) | `apps/web`   | Vercel (`rotta-web`)                           |
| `admin.rottabr.com.br`     | `apps/admin` | Vercel (`rotta-admin`)                         |
| `api.rottabr.com.br`       | `apps/api`   | Render (`rotta-vt7i`, nome interno do serviço) |

### 6.1 — No registrador do domínio (DNS)

1. Confirmar a compra/propriedade de `rottabr.com.br` (se ainda não
   concluída) e ter acesso ao painel de DNS do registrador.
2. Os registros exatos (CNAME/A) só são conhecidos depois do passo 6.2
   — a Vercel e o Render mostram o valor certo ao adicionar cada
   domínio customizado no painel deles. Tipicamente: `www`/`admin` →
   CNAME para o alvo que a Vercel indicar; raiz (`rottabr.com.br`) →
   registro `A`/`ALIAS` que a Vercel indicar (domínio raiz não aceita
   CNAME puro no DNS); `api` → CNAME para o alvo que o Render indicar.
3. Depois de configurar o e-mail (§6.3), adicionar também os registros
   TXT (SPF/DMARC) e CNAME (DKIM) que a Resend fornecer — sem eles a
   Resend rejeita o envio a partir de `@rottabr.com.br`.

### 6.2 — Nos provedores de hospedagem

- **Vercel, projeto `rotta-web`**: Settings → Domains → adicionar
  `rottabr.com.br` e `www.rottabr.com.br` (redirecionar um pro outro).
- **Vercel, projeto `rotta-admin`**: Settings → Domains → adicionar
  `admin.rottabr.com.br`.
- **Render, serviço da API**: Settings → Custom Domain → adicionar
  `api.rottabr.com.br`.

### 6.3 — E-mail (Resend)

Sem isso, `EMAIL_FROM_ADDRESS` (default já atualizado pra
`notificacoes@rottabr.com.br`, ver `email.config.ts`) continua sendo
recusado pela Resend — a Rotta já manda e-mail de verdade hoje (Dossiê
34: contratos, suporte, e agora recuperação de senha), só que a partir
de um domínio que a Resend ainda não verificou.

1. Resend → Domains → Add Domain → `rottabr.com.br`.
2. Adicionar os registros DNS que a Resend mostrar (SPF/DKIM, e
   idealmente DMARC) no registrador (§6.1).
3. Aguardar a verificação (a Resend confirma no próprio painel).
4. Só depois disso `EMAIL_FROM_ADDRESS=notificacoes@rottabr.com.br`
   funciona de verdade em produção.
5. Receber e-mail em `contato@`/`suporte@rottabr.com.br` (não é a
   mesma coisa que ENVIAR, acima) exige provisionar uma caixa real
   (ex. Google Workspace) — até isso existir, `CONTACT_EMAIL`/
   `SUPPORT_EMAIL` (`apps/web/src/lib/site-config.ts`) continuam
   apontando pra `rottadobrasil@gmail.com` de propósito (endereço real
   já monitorado hoje).

### 6.4 — Variáveis de ambiente a atualizar (depois de 6.1-6.3 no ar)

| Variável                | Onde                  | Novo valor                                                                                                |
| ----------------------- | --------------------- | --------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`  | Vercel, `rotta-web`   | `https://rottabr.com.br`                                                                                  |
| `NEXT_PUBLIC_ADMIN_URL` | Vercel, `rotta-web`   | `https://admin.rottabr.com.br`                                                                            |
| `NEXT_PUBLIC_WEB_URL`   | Vercel, `rotta-admin` | `https://rottabr.com.br`                                                                                  |
| `WEB_APP_URL`           | Render, API           | `https://rottabr.com.br`                                                                                  |
| `ADMIN_APP_URL`         | Render, API           | `https://admin.rottabr.com.br`                                                                            |
| `API_PUBLIC_URL`        | Render, API           | `https://api.rottabr.com.br`                                                                              |
| `CORS_ORIGINS`          | Render, API           | acrescentar `https://rottabr.com.br,https://www.rottabr.com.br,https://admin.rottabr.com.br`              |
| `EMAIL_FROM_ADDRESS`    | Render, API           | `notificacoes@rottabr.com.br` (já é o default — só precisa setar se a env var já existir com outro valor) |

`API_PUBLIC_URL` merece atenção: `DiditWebhookProvisioningService`
re-registra o destino do webhook da Didit AUTOMATICAMENTE toda vez que
a API sobe, usando essa variável — trocar `API_PUBLIC_URL` pro domínio
novo já corrige o destino sozinho, sem precisar mexer no painel da
Didit manualmente. QStash (`QstashPublisherService`/
`QstashScheduleService`) também lê a mesma variável pros jobs
internos — nenhuma ação manual extra aí.

Asaas/AbacatePay: se algum webhook estiver cadastrado manualmente no
painel deles apontando pro host antigo (`rotta-vt7i.onrender.com`),
precisa ser atualizado manualmente lá pro domínio novo — nenhum dos
dois clientes deste código re-registra webhook sozinho (diferente da
Didit).

### 6.5 — App mobile (Expo/EAS)

`apps/mobile/eas.json` (`build.preview`/`build.production.env`) e
`apps/mobile/.env.example` apontam pra
`https://rotta-vt7i.onrender.com/v1` hoje — trocar pra
`https://api.rottabr.com.br/v1` (`EXPO_PUBLIC_API_URL`) e
`https://rottabr.com.br` (`EXPO_PUBLIC_WEB_URL`, usado pela WebView de
Termos/Privacidade — Frente 12) depois que 6.1-6.2 estiverem
funcionando, e antes do próximo build de produção (`eas build`). O
identificador do app nas lojas (`br.com.rotta.app`, `app.config.ts`)
NÃO precisa bater com o domínio — não é um requisito técnico das lojas
— e não deve ser trocado de qualquer forma depois do primeiro envio à
Play Store (o `package`/`bundleIdentifier` é permanente).

### 6.6 — Itens opcionais (SEO/verificação)

- Google Search Console: adicionar `rottabr.com.br` como nova
  propriedade (o token antigo, se existir, não transfere sozinho).
- Google Analytics: o `NEXT_PUBLIC_GA_MEASUREMENT_ID` continua
  funcionando no domínio novo sem mudança — GA não amarra o ID a um
  domínio específico.
- Nada disso bloqueia o lançamento — são itens de indexação/atribuição,
  não de funcionamento.
