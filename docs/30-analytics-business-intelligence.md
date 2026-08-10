# Dossiê 30 — Rotta Analytics & Business Intelligence

> Prompt 22 da sequência de evolução da plataforma. Mesmo método dos Dossiês
> 28/29: diagnóstico real antes de implementar, e implementação apenas do
> que os dados de hoje sustentam de verdade — nunca um número inventado.

## 1. Metodologia

Auditoria direta do código antes de qualquer linha nova:

- `apps/api/src/modules/analytics` — confirmado `@Module({})` vazio
  ("ESTADO ATUAL: modulo vazio").
- `apps/api/src/modules/dashboard`, `apps/api/src/modules/reports` — idem.
- `apps/api/src/modules/vehicles/vehicle-export.util.ts` e
  `apps/api/src/common/utils/tabular-export.util.ts` — confirmado o
  utilitário genérico de exportação CSV/Excel/PDF (tarefa #64 do
  histórico), reusado aqui em vez de reimplementado.
- `apps/api/src/modules/companies/dto/company-dashboard-response.dto.ts` —
  o comentário do próprio DTO já documentava que `alunos`/`rotas`/
  `viagens`/`documentosVencendo` ficavam hardcoded em `0` só porque os
  módulos que os alimentariam não existiam ainda — hoje existem.
- `apps/api/src/modules/backoffice` (Dossiê 29) — já expõe as contagens
  operacionais cross-tenant que a Central de Inteligência precisa como
  base; nunca duplicadas aqui.
- `packages/maps` — já tem o `RottaMap` (MapLibre + OpenStreetMap) usado
  em Escolas/Veículos; o heatmap é uma nova capability do MESMO
  componente, não um mapa paralelo.

## 2. Diagnóstico — o que já existia

| Item pedido (briefing)                          | Estado antes desta entrega                                                                                                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dashboards por perfil (Empresas/Gestores)       | Parcial: `GET /companies/:id/dashboard` já existia (Dossiê 16), mas com `alunos`/`rotas`/`viagens`/`documentosVencendo`/`alertas` hardcoded em `0`/`[]`.     |
| Dashboards por perfil (Motoristas/Responsáveis) | **Não existia nada.** Nenhum endpoint de tela inicial para esses dois papéis.                                                                                |
| Dashboard por perfil (Rotta/Admin)              | `GET /backoffice/dashboard` (Dossiê 29) já cobre a parte operacional; faltava a camada de negócio (MRR/ARR/churn) e comparação de períodos.                  |
| KPIs nacionais (MRR/ARR/churn/LTV/CAC)          | Não existiam. MRR/ARR/churn são calculáveis a partir de `Company`/`Plan`/`Contract` já existentes; LTV/CAC exigem dado que a plataforma não coleta (ver §5). |
| Heatmap OpenStreetMap                           | Infraestrutura de mapa (MapLibre/OSM) já existia; a _camada_ de heatmap não.                                                                                 |
| Analytics AI (anomalias/forecasting)            | Não existe nenhum provedor de séries temporais/ML integrado.                                                                                                 |
| Relatórios exportáveis PDF/Excel/CSV            | Utilitário genérico já existia (`tabular-export.util.ts`); faltava o endpoint/dataset de Analytics.                                                          |
| Comparação de períodos                          | Não existia em nenhum módulo.                                                                                                                                |
| Alertas automatizados                           | Não existiam.                                                                                                                                                |
| BI por empresa                                  | Parcial — a "listagem de empresas" do Backoffice não tinha métricas de negócio por linha.                                                                    |

## 3. O que foi implementado nesta fase

### 3.1 Módulo Dashboard (`apps/api/src/modules/dashboard`) — `DASH-01` a `DASH-07`

- `GET /dashboard/me`: preenche a tela inicial de `Role.MOTORISTA`/
  `Role.MONITOR` (viagens de hoje, documentos pendentes de análise IA,
  documentos vencendo em 30 dias) e `Role.RESPONSAVEL` (filhos, contratos
  ativos/total) — os três papéis que não tinham nenhum dashboard próprio.
  `Role.EMPRESA`/`Role.GESTOR` deliberadamente fora dessa rota (evitar uma
  segunda fonte da mesma informação).
- **Completou** `CompaniesService.getDashboard` (em vez de criar um
  endpoint concorrente): `alunos`/`rotas`/`viagens`/`documentosVencendo`/
  `alertas` agora são reais, via `DashboardService.getCompanyDashboardById`.
  Corrigido também um bug pré-existente: `receitaEstimadaCentavos` lia
  `company.plan.priceCents` (o que a EMPRESA paga à Rotta pela
  assinatura), não nenhuma "receita estimada" — agora é a soma real de
  `Contract.valorMensalidadeCentavos` dos contratos `ATIVO`.

### 3.2 Módulo Analytics (`apps/api/src/modules/analytics`) — `ADM-03`/`ADM-06`

- `GET /analytics/national/kpis`: KPIs de negócio REAIS —
  `mrrCentavos` (soma de `Plan.priceCents` das empresas `ATIVO`),
  `arrCentavos` (× 12), `empresasAtivasPagantes`, `churnRateAproximado`
  (empresas canceladas no período / ativas pagantes — aproximação honesta
  documentada: o schema guarda o ESTADO atual, não histórico de
  transições), comparação com o período anterior de mesma duração, e
  `operacional` reusando `BackofficeService.getDashboard()` (nunca
  duplicado).
- **LTV/CAC — stub honesto, deliberado**: sempre `null`, com
  `indisponibilidadeLtvCac` explicando por quê (a Rotta não tem hoje fonte
  de custo de aquisição nem ledger de receita por coorte — os dois
  insumos mínimos). Nenhum valor estimado/inventado.
- **Alertas automatizados**: regras simples sobre os próprios KPIs já
  calculados (churn > 5%, empresas inadimplentes, chamados abertos acima
  do limiar, documentos pendentes acumulando) — nunca "IA", só limiares.
- `GET /analytics/national/heatmap`: densidade de paradas de rota ATIVA
  agregada em grade (~1,1km) — nunca tráfego ao vivo.
- `GET /analytics/national/export?format=csv|excel|pdf`: BI por empresa
  (nome/status/plano/mensalidade/motoristas/veículos/contratos/viagens no
  período), reusando `@/common/utils/tabular-export.util` — nenhuma
  reimplementação de Workbook/PDFDocument.
- **`GET /analytics/anomalies` — stub honesto**: sempre lança
  `NotImplementedException` com a explicação técnica exata (falta
  provedor de séries temporais/ML e volume histórico mínimo). Nunca
  inventa uma anomalia.

### 3.3 Frontend — apps/admin `/inteligencia`

Central de Inteligência Operacional: KPIs de negócio, alertas, comparação
de período, operação nacional (reusando os mesmos números do
`/` — Backoffice), heatmap real via `<RottaMap heatmapPoints={...} />`
(nova capability do `packages/maps`, MapLibre `type: "heatmap"` nativo,
sem lib adicional), exportação CSV/Excel/PDF, e a seção "Analytics AI"
mostrando explicitamente que a detecção de anomalias ainda não está
disponível — nunca escondendo essa lacuna do usuário.

### 3.4 `packages/maps` — camada de heatmap

`HeatmapPoint` (tipo) + `heatmapPoints` (prop) + `applyHeatmap` no
`<RottaMap />` web — pontos já agregados pelo servidor, nunca recalculados
no cliente. Só a variante web foi estendida (mobile/`RottaMap` nativo fica
fora do escopo desta fase — a Central de Inteligência é uma tela
exclusiva de Admin Rotta, que só existe em `apps/admin`, web).

## 4. O que NÃO foi implementado nesta fase (honesto, não inflado)

- **LTV/CAC reais** — ver §3.2. Gatilho de implementação: existir uma
  fonte de custo de aquisição (gasto por canal) e um ledger de receita
  por coorte.
- **Analytics AI (anomalias/forecasting)** — stub honesto, ver §3.2/§7.
- **Dashboards mobile para Motorista/Responsável** — `GET /dashboard/me`
  está pronto e testado; nenhuma tela em `apps/mobile` foi construída
  nesta fase (fora do escopo desta rodada, que focou em Analytics/BI —
  não em telas mobile pendentes de outros módulos).
- **BI por empresa self-service** (a própria transportadora vendo o
  próprio BI, não só a Rotta vendo todas) — hoje `/analytics/*` é
  exclusivo de `Role.ADMIN_ROTTA`; a Empresa já tem `GET /companies/:id/dashboard`
  (§3.1), que é o equivalente ao seu próprio nível.
- **Alertas configuráveis pelo usuário** — os limiares (`CHURN_RATE_ALERTA`
  etc.) são constantes no código, não uma tela de configuração.
- **Fila assíncrona de exportação** — `GET /analytics/national/export`
  processa e responde de forma síncrona (mesmo padrão de
  `VehiclesController.export`); para volumes muito grandes, o módulo
  `Reports` (Dossiê 13 §18 — "geração assíncrona... delegada a
  job/Worker") continua vazio e é o destino natural dessa evolução.

## 5. Pontos críticos

1. **`churnRateAproximado` é uma aproximação, não um cálculo de coorte
   real** — o schema `Company` guarda só o estado atual (`status`), não
   um histórico de transições. Uma empresa cancelada e reativada mais de
   uma vez na mesma janela conta só a última transição. Documentado no
   próprio `AnalyticsRepository`.
2. **MRR usa `Plan.priceCents`, não o valor real cobrado via AbacatePay**
   — hoje há um único plano (MVP, Dossiê 20 `ADM-02`: "único no MVP,
   múltiplos em V2+"), então a aproximação é exata na prática; quando
   houver múltiplos planos/descontos negociados, isso precisa reconciliar
   com o billing real.
3. **`GET /analytics/national/kpis` não tem cache** — mesma observação já
   registrada para `GET /backoffice/dashboard` no Dossiê 29 §7; ainda mais
   crítico aqui por rodar 4 queries agregadas em paralelo a cada chamada.

## 6. Testes

- `AnalyticsService`: 9 testes (MRR/ARR reais, LTV/CAC sempre `null` com
  motivo, cálculo de churn, comparação de período, os 3 tipos de alerta,
  ausência de alertas dentro dos limiares, heatmap, exportação CSV/Excel).
- `DashboardService`: 10 testes (roteamento por papel, guarda de
  exaustividade para papel sem dashboard, os dois sub-dashboards).
- `CompaniesService` (spec existente, estendido): casos novos cobrindo o
  dashboard completo pós-integração com `DashboardService`.
- Suite completa da API: **51 suítes / 484 testes, 100% passando**
  (49→51 suítes, 465→484 testes desde o fechamento do Prompt 21), zero
  regressão.

## 7. Plano de evolução futura

| Gatilho                                                                       | Ação                                                                                                                               |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Existir fonte real de custo de aquisição + ledger de receita por coorte       | Calcular LTV/CAC reais em `AnalyticsService`, substituindo o stub honesto                                                          |
| Volume/histórico suficiente para um provedor de séries temporais              | Implementar `GET /analytics/anomalies` com um provedor real (ex. Prophet/serviço gerenciado) — nunca heurística disfarçada de "IA" |
| Múltiplos planos ativos (Dossiê 20 `ADM-02`, V2+)                             | Reconciliar MRR com o valor real cobrado via AbacatePay, não só `Plan.priceCents`                                                  |
| `GET /analytics/national/kpis`/`GET /backoffice/dashboard` lentos em produção | Cache Redis com TTL curto (mesma recomendação do Dossiê 29 §8)                                                                     |
| Necessidade de exportações muito grandes/assíncronas                          | Módulo `Reports` (ainda vazio) processa via BullMQ, delegando ao mesmo `tabular-export.util`                                       |
| Prioridade em telas mobile de Motorista/Responsável                           | `apps/mobile` consome `GET /dashboard/me`, já pronto e testado                                                                     |
| Alertas configuráveis por Admin Rotta                                         | Tela de configuração de limiares no Backoffice, gravando em `CompanySetting`-like table ou uma nova tabela de configuração global  |
