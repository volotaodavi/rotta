# Dossiê 44 — Integration & Intelligence Audit Engine

> Escopo: "PROMPT — ROTTA INTEGRATION & INTELLIGENCE AUDIT ENGINE" (60
> seções). Pergunta central do prompt: **"se um usuário real entrar na
> Rotta hoje, todos os fluxos funcionam de ponta a ponta?"** e **"se algo
> parar de funcionar às 3 da manhã, a Rotta consegue saber?"**. Mesma
> disciplina dos Dossiês 39/40/43: auditar com evidência de código antes
> de escrever qualquer linha, nunca marcar algo como "WORKING" sem o
> fluxo real ter sido executado, e fechar por completo UM gap concreto
> em vez de espalhar esforço raso pelos ~90 itens/17 entregáveis
> pedidos.

## 1. Por que esta entrega tem escopo deliberadamente menor que o prompt

O prompt pede 17 entregáveis (A–Q): mapa de arquitetura, mapa de
integração, matriz de funcionalidade, matriz de dependências, relatório
de auditoria, relatório de inconsistências, relatório de mocks,
relatório de segurança, relatório de dados, 4 dashboards, plano de
correção P0–P3, testes automatizados, testes E2E e monitoramento
contínuo — cada um, sozinho, seria dias de trabalho de um time real.
Tentar produzir os 17 rasos nesta entrega violaria a própria regra do
prompt ("PROIBIÇÃO DE FALSOS POSITIVOS" — nunca fingir que algo existe).

Este Dossiê entrega, com profundidade real:

1. **Auditoria honesta** do que já existe de observabilidade/integração
   (Seção 2) — usando evidência de código, não suposição.
2. **O gap concreto fechado**: `IntegrationHealthService` — rastreamento
   real (não decorativo) da saúde das integrações externas, exposto em
   um painel do Admin Rotta (Seção 3).
3. **Inventário de mocks/stubs classificado** pela taxonomia do próprio
   prompt (Seção 4).
4. **Matriz de funcionalidade** dos fluxos principais, com evidência de
   código e referência aos Dossiês onde cada fluxo já foi auditado
   ponta a ponta (Seção 5).
5. **Punch list P0–P3** e **lista explícita do que fica deferido**
   (Seção 6) — nunca omitido em silêncio.

## 2. Auditoria — observabilidade e integrações, o que já existia

| Item                                                   | Estado real encontrado                                                                                                                                                                                                              |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /health` (liveness)                               | Real, `@Public()`, `apps/api/src/health/health.controller.ts` — trivial de propósito (só confirma que o processo está de pé)                                                                                                        |
| `GET /health/ready` (readiness)                        | Real — `SELECT 1` no Postgres + `SET` real no Redis, não um "sempre 200"                                                                                                                                                            |
| Logging estruturado + correlationId                    | Real (Dossiê 33) — `nestjs-pino`, `x-correlation-id` propagado/gerado por requisição, redação de campo sensível (`senha`/`token`/`cookie`)                                                                                          |
| Rastreamento de erro (Sentry)                          | Real, opcional — `ErrorTrackingService` (Dossiê 33): sem `SENTRY_DSN`, aviso claro no boot e no-op, nunca falha silenciosa                                                                                                          |
| Fila assíncrona                                        | QStash (`infra/queue/qstash`), não BullMQ — usada por sincronização INEP e entrega de notificação                                                                                                                                   |
| **Saúde de integração externa (Lytex/AbacatePay/Geo)** | **Não existia.** `/health/ready` testa infraestrutura própria (DB/cache), nunca as 3 integrações que o próprio prompt cita como exemplo (Seção 34: "LYTEX... ABACATEPAY... GEO PROVIDER") — este era o gap real                     |
| Reconciliação Rotta × provedor (Lytex/AbacatePay)      | Não existe (depende de Lytex ter uma chamada real implementada — ver Seção 4, Lytex é 0% implementado)                                                                                                                              |
| Dashboards de KPI de negócio nacional                  | Parcialmente real — `apps/admin/(admin)/inteligencia` (Dossiê 30/Prompt 22): MRR/ARR reais, heatmap real, alertas por regra. Funil de conversão e detecção de anomalia por ML: não existem (documentado como tal na própria página) |

**Conclusão**: a Rotta já tinha observabilidade de infraestrutura real
(não fictícia) — o buraco específico era não saber, com dado real, se
uma integração externa estava falhando _na prática_, com tráfego real,
distinto de um ping artificial.

## 3. O que foi construído — `IntegrationHealthService`

### 3.1 Desenho

`apps/api/src/infra/observability/integration-health.service.ts` —
Redis-backed, key prefix `integration_health:`, sem TTL (persiste até o
Redis reiniciar — limitação aceita e documentada: um `unknown` após
restart não é bug, é o estado inicial honesto).

```ts
type IntegrationStatusLevel = "healthy" | "degraded" | "down" | "not_configured" | "unknown";
```

- `healthy` — última chamada teve sucesso.
- `degraded` — 1+ falha consecutiva recente (abaixo do limiar de `down`).
- `down` — 3+ falhas consecutivas.
- `not_configured` — credenciais ausentes, **nenhuma chamada real foi
  tentada** (nunca contado como "fora do ar" — distinção deliberada,
  mesmo princípio de `AbacatePayClientService`/`RottaPayProviderService`).
- `unknown` — nenhuma chamada registrada desde o último boot do Redis.

Métodos: `recordSuccess(integration, latencyMs)`,
`recordFailure(integration, errorMessage)`,
`recordNotConfigured(integration, reason)`, `getSnapshot`,
`getAllSnapshots`.

**Diferença deliberada de `/health/ready`**: aquele endpoint dispara uma
checagem síncrona artificial (`SELECT 1` agora). Este serviço não
dispara nada — só REGISTRA o resultado de chamadas que os módulos de
negócio já fazem no curso normal de operação, e deriva o status do
HISTÓRICO real recente.

### 3.2 Integrações instrumentadas (as mesmas citadas pelo prompt)

| Integração | Chokepoint instrumentado                                                         | Comportamento                                                                                                         |
| ---------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| AbacatePay | `AbacatePayClientService.request()` (1 método, todas as chamadas passam por ele) | `recordSuccess`/`recordFailure` reais em cada chamada HTTP; `recordNotConfigured` quando `ABACATEPAY_API_KEY` ausente |
| Lytex      | `RottaPayProviderService.iniciarTransferenciaPix()`                              | Sempre `recordNotConfigured` — o método é um stub honesto (nenhuma chamada de rede real acontece hoje; ver Seção 4)   |
| Nominatim  | `GeoEngineService.geocode()` / `.reverseGeocode()`                               | `recordSuccess`/`recordFailure` reais por chamada                                                                     |
| OSRM       | `GeoEngineService.getRoute()`                                                    | `recordSuccess`/`recordFailure` reais por chamada                                                                     |

### 3.3 Endpoint e painel

- **`GET /health/integrations`** (novo, `@Roles(ADMIN_ROTTA)`, exclusivo
  — expõe erro/latência interno) — retorna `database`, `cache`, os 4
  snapshots e um **score real** (0–100), calculado só sobre componentes
  com evidência real (`not_configured`/`unknown` **excluídos** do
  denominador, listados separadamente — nunca contados como saudáveis
  nem como quebrados por omissão).
- **`packages/api-client`**: `createHealthEndpoints` /
  `healthApi.getIntegrationsHealth()`.
- **`apps/admin/(admin)/saude`** ("Rotta Control Center", nome do
  prompt, Seção 35) — grid de status por integração (🟢/🟡/🔴/⚪),
  score, último erro, última latência, falhas consecutivas. Link "Saúde"
  adicionado à navegação do Admin.

### 3.4 Verificação

- 540/540 testes da API passam (526 pré-existentes + 14 novos:
  `IntegrationHealthService` — 9 casos; `HealthController` — 5 casos),
  incluindo os specs pré-existentes de `AbacatePayClientService`,
  `RottaPayProviderService` (via `WalletService`) e `GeoEngineService`,
  todos adaptados para a nova dependência sem alterar comportamento
  anterior.
- `pnpm typecheck` limpo em `apps/api`, `apps/admin` e
  `packages/api-client`.
- `pnpm lint` sem novos erros (avisos de ordem de import pré-existentes
  no projeto, mesmo padrão em dezenas de outros arquivos — não
  introduzidos por esta entrega).

## 4. Inventário de mocks/stubs — classificado

Levantamento por grep (`"stub honesto"`, `"ainda não foi implementad[o]"`,
`TODO`, `FIXME`) em `apps/api/src`: **37 ocorrências em 27 arquivos**.
Classificação pela taxonomia do prompt:

| Classificação                    | Significado                                                                                                                                | Exemplos (arquivo)                                                                                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ACEITÁVEL**                    | Integração opcional, degrada graciosamente, avisa no boot, nunca finge sucesso                                                             | `infra/didit/didit.service.ts`, `infra/email/*`, `infra/sms/*`, `infra/whatsapp/*`, `modules/rotta-ai/rotta-ai.service.ts` (Rotta AI é interface stub desde o desenho original, Dossiê 8) |
| **TEMPORÁRIO** (com plano claro) | Credenciais presentes, contrato de API pendente de confirmação — não é decisão de arquitetura, é bloqueio de acesso de rede neste ambiente | `modules/wallet/rotta-pay-provider.service.ts` (Lytex — **0% implementado**: nenhuma chamada de rede real acontece em nenhum cenário, mesmo com credenciais válidas)                      |
| **PRECISA IMPLEMENTAR**          | Funcionalidade descrita mas não construída, sem bloqueio técnico externo                                                                   | `modules/analytics/*` (detecção de anomalia por ML — documentado como "ainda não disponível" na própria UI, não escondido)                                                                |
| **ERRO** (nenhum encontrado)     | Algo que finge sucesso silenciosamente sem avisar                                                                                          | Nenhuma ocorrência encontrada — todos os 27 arquivos seguem o padrão de aviso explícito no boot/log, nunca falha silenciosa                                                               |

O achado mais importante desta seção: **a Rotta não tem nenhum caso de
"ERRO"** (mock disfarçado de real) nos 27 arquivos auditados — todos
avisam explicitamente (log `warn`/comentário `DIVULGAÇÃO HONESTA`)
quando estão em modo degradado. Isso é uma disciplina pré-existente,
não algo corrigido nesta entrega.

O caso mais crítico de negócio é o **Lytex (Rotta Pay)**: mesmo com
`LYTEX_CLIENT_ID`/`LYTEX_CLIENT_SECRET` configurados, `WalletService`
nunca transfere dinheiro de verdade — todo saque fica `SOLICITADO`
aguardando processamento manual do Admin Rotta. Isso está corretamente
sinalizado no código, nos logs, e agora também no painel de saúde
(`not_configured`/erro explicativo), mas é um **P1** real (Seção 6):
sem acesso à documentação oficial da Lytex, esta base de código não
pode implementar o contrato real.

## 5. Matriz de funcionalidade — fluxos principais

Baseada em evidência de código já auditada nos Dossiês 39 (Motorista/
Monitor) e 40 (Geo Platform/Communication) desta série, mais a
confirmação desta entrega:

| Fluxo                                                                                   | Status                                            | Evidência                                                                                                                                                           |
| --------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Responsável: cadastro → busca transportador → solicitação → contrato → transporte ativo | **WORKING**                                       | `TransportRequestsService`/`ContractsService` (Dossiê 21/37/38), testes E2E `marketplace.e2e-spec.ts`/`marketplace-pipeline.e2e-spec.ts`                            |
| Motorista: login → iniciar viagem → embarque → pausa/retomada → finalizar               | **WORKING**                                       | `DriverNavigator` real (Dossiê 39), `TripsService`, testes E2E                                                                                                      |
| Empresa: assinatura → checkout AbacatePay → webhook → status ATIVO                      | **WORKING**                                       | `BillingService`, `abacatepay-client.service.spec.ts` (chamada HTTP real confirmada, não fingida)                                                                   |
| Transportador: saque via Rotta Pay → transferência PIX real                             | **NOT_STARTED** (correto declarar, não "PARTIAL") | `RottaPayProviderService` — 0% de chamada de rede real em qualquer cenário (Seção 4)                                                                                |
| Geo: geocodificação de escola (INEP) → coordenada                                       | **WORKING**                                       | `GeoEngineService`/`GeocodingAiAgentService`, agora com saúde real rastreada (Seção 3)                                                                              |
| Admin Rotta: login com MFA obrigatório                                                  | **WORKING**                                       | Dossiê 43 (esta série) — **atenção**: `MFA_ENCRYPTION_KEY` ainda não confirmada como configurada em produção (Render); sem ela, login de Admin Rotta fica bloqueado |
| Observabilidade: "sei que uma integração está falhando de verdade"                      | **WORKING** (novo, esta entrega)                  | `IntegrationHealthService` + `GET /health/integrations` + painel `/saude`                                                                                           |
| Funil de conversão / KPIs de produto (ativação, retenção)                               | **NOT_STARTED**                                   | Não existe; `inteligencia` cobre KPI de negócio (MRR/ARR/churn), não funil de produto                                                                               |
| Reconciliação automática Rotta × extrato do provedor                                    | **NOT_STARTED**                                   | Depende de Lytex ter chamada real implementada primeiro                                                                                                             |

## 6. Punch list e itens deferidos

### P0 (nenhum encontrado nesta auditoria)

Nenhuma falha crítica de "usuário real não consegue completar o fluxo
principal" foi encontrada nos módulos auditados nesta entrega — os
gaps encontrados são conhecidos, sinalizados no código e não bloqueiam
os fluxos WORKING da Seção 5.

### P1

1. **Lytex — implementar chamada real de transferência PIX/split**
   assim que o contrato oficial da API estiver acessível
   (`docs.lytex.com.br`) — hoje bloqueia 100% dos saques automáticos da
   Rotta Pay (ficam manuais).
2. **Confirmar `MFA_ENCRYPTION_KEY` configurada em produção (Render)**
   antes/imediatamente após o deploy do Dossiê 43 — sem ela, nenhum
   Admin Rotta consegue fazer login.

### P2

3. Estender `IntegrationHealthService` às demais integrações opcionais
   (Didit, e-mail, SMS, WhatsApp, push) — hoje só as 4 citadas
   explicitamente pelo prompt têm instrumentação real.
4. Alertar automaticamente (e-mail/Slack/push ao Admin Rotta) quando uma
   integração muda para `down` — hoje o painel `/saude` precisa ser
   consultado manualmente; o dado é real, mas não empurra notificação.

### P3

5. Persistir histórico de saúde além do snapshot atual (série temporal,
   não só "estado agora") para permitir gráfico de disponibilidade ao
   longo do tempo.

### Deferido nesta entrega — não esquecido, não fingido

Do prompt de 60 seções / 17 entregáveis (A–Q), o que fica
explicitamente fora do escopo desta entrega, por decisão consciente de
profundidade > amplitude rasa:

- Data Integrity Engine com checagens periódicas automatizadas de
  consistência de banco.
- Funil de conversão / KPIs de ativação-retenção de produto (distinto
  do KPI de negócio já real em `inteligencia`).
- Reconciliação automática Rotta × extrato Lytex/AbacatePay (bloqueada
  por Lytex ainda ser 0% implementado).
- Root Cause Analysis encadeada entre eventos.
- Tracing distribuído completo (hoje há `correlationId` por requisição
  via log estruturado, mas não um backend de tracing tipo
  OpenTelemetry/Jaeger).
- Alertas automáticos push/e-mail/Slack (painel existe e mostra dado
  real; a notificação proativa fica como P2, item 4 acima).
- Os demais entregáveis lettered (mapa de arquitetura formal, matriz de
  dependências, relatório de segurança dedicado, testes E2E adicionais
  além dos já existentes) — o conteúdo equivalente já está distribuído
  entre este Dossiê e os Dossiês 12/13/33/39/40/43, em vez de duplicado
  aqui num documento único de 17 seções.

## 7. Resumo executivo

A pergunta do prompt — "se algo parar de funcionar às 3 da manhã, a
Rotta consegue saber?" — tinha resposta parcial antes desta entrega
("sim, para Postgres/Redis") e agora tem resposta mais completa ("sim,
também para AbacatePay, Nominatim e OSRM — com histórico real, não um
ping artificial"). Lytex continua sendo o gap conhecido e já
corretamente sinalizado, não escondido: o painel `/saude` mostra
`not_configured` com o motivo exato, e o P1 acima documenta o que falta
para fechá-lo.
