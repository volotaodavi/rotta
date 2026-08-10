# Dossiê 39 — Auditoria vs. Prompt Mestre da Rotta + App real do Motorista/Monitor

> Escopo do Prompt recebido ("PROMPT MESTRE — ROTTA — CONTINUIDADE,
> AUDITORIA E EVOLUÇÃO COMPLETA DA PLATAFORMA"): 30 seções cobrindo a
> plataforma inteira — perfis, GPS, escolas/MEC-INEP, marketplace,
> contratos, Rotta Pay, notas fiscais, admin geral, segurança,
> tracking, banco de dados, privacidade, UX/UI, app, landing page — com
> instrução explícita de **auditar antes de alterar** e **trabalhar por
> módulos**. Este dossiê é essa auditoria, seguida do módulo que a
> auditoria revelou como o gap mais concreto e de maior impacto: o app
> real do Motorista/Monitor.

## 1. Método

Auditoria de código real (não de memória/resumo) contra cada uma das
30 seções do Prompt, com evidência concreta (arquivo, endpoint, teste)
para cada veredito — nunca "parece que sim". Onde a auditoria confirma
que algo já existe e funciona, ele é preservado sem alteração (Seção 2
do Prompt: "não recrie o que já existe"). Onde revela um gap real, o
gap é registrado; **um** gap — o de maior alavancagem e menor
ambiguidade de escopo — foi fechado nesta rodada; os demais ficam
documentados no §4, com o motivo concreto de não terem sido fechados
juntos (a maioria exige decisão de produto ou credencial externa que
esta sessão não tem como tomar sozinha).

## 2. Auditoria seção a seção

| Seção do Prompt                                               | Veredito               | Evidência                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4. Perfis da plataforma                                       | ✅                     | 8 perfis existem: Responsável, Empresa/MEI/Autônomo (mesmo cadastro, `CompanyType`), Motorista, Monitor, Admin Rotta. "Escola" não é um perfil de login (dado de referência, correto por design).                                                                                                                                                                                                                                                                                                               |
| 5. Responsável                                                | ✅                     | Fluxo completo (Dossiê 37/38): busca por escola, perfil institucional, solicitação, contrato, acompanhamento GPS, avaliações.                                                                                                                                                                                                                                                                                                                                                                                   |
| 6. Transportador/Empresa/MEI/Autônomo                         | ✅                     | Dashboard com alunos/motoristas/veículos/rotas/contratos/financeiro/GPS/histórico (`apps/web/(dashboard)`).                                                                                                                                                                                                                                                                                                                                                                                                     |
| 7. Motorista                                                  | ❌→✅                  | **Gap real, fechado nesta rodada** — ver §3. `DriverNavigator.tsx` tinha "Início"/"Histórico"/"Perfil" como `PlaceholderScreen` ("em construção") desde a fundação do app; só "Veículo" era real.                                                                                                                                                                                                                                                                                                               |
| 8. Regra do GPS (ONLINE/OFFLINE/EM_VIAGEM/PAUSADO/FINALIZADA) | ⚠️→✅ (parcial)        | `TripStatus` só tinha `EM_ANDAMENTO/FINALIZADA/CANCELADA` — **sem `PAUSADA`, fechado nesta rodada** (§3). Presença ONLINE/OFFLINE do motorista _independente_ de uma viagem (ex. "motorista logado mas sem viagem hoje") continua sem modelo próprio — ver §4.                                                                                                                                                                                                                                                  |
| 9. Monitor                                                    | ❌→✅                  | Mesmo gap da Seção 7 — o Monitor agora vê a mesma tela operacional do Motorista, sem os controles de iniciar/pausar/finalizar (Prompt: "não deve possuir os mesmos privilégios").                                                                                                                                                                                                                                                                                                                               |
| 10. GPS e mapas (OSM, não Mapbox)                             | ✅                     | Migrado do Mapbox para OpenStreetMap/MapLibre em toda a plataforma (task #122, Dossiê correspondente). Nenhuma referência a Mapbox restante em código ativo.                                                                                                                                                                                                                                                                                                                                                    |
| 11. Escolas MEC/INEP                                          | ✅                     | `InepSyncService` real, fila BullMQ, importação CSV/Excel/JSON (tasks #68/#121).                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 12. Agentes de IA para endereço (Localização + Validação)     | ✅                     | `GeocodingAiAgentService`/`ValidationAiAgentService` reais, com o fluo exato pedido (geocodificar → validar → aprovar/corrigir) — Dossiê do Rotta Geo Platform.                                                                                                                                                                                                                                                                                                                                                 |
| 13. Marketplace (não parecer e-commerce)                      | ✅                     | Redesenhado nos Dossiês 37/38: perfil institucional, CTA "Conhecer empresa" (nunca "Comprar"), busca por escola/rota/turno.                                                                                                                                                                                                                                                                                                                                                                                     |
| 14. Contratos                                                 | ⚠️                     | Fluxo real (criação → visualização → assinatura → PDF → Authentique, stub honesto quando indisponível). **Não há hoje uma "IA jurídica" que auxilia na _estruturação_ do texto do contrato** — a Rotta AI atual só _valida_ a assinatura e ativa o transporte (Dossiê 16). O Prompt pede explicitamente que a IA seja "apoio, nunca substituta de advogado" — o texto já é honesto sobre isso onde existe, mas a funcionalidade de redação assistida em si não existe. Registrado como gap de escopo real (§4). |
| 15. Rotta Pay — Lytex (split) ≠ AbacatePay (assinatura)       | ✅                     | Já corretamente separados: `lytex.config.ts`/`RottaPayProviderService` para split da operação (Dossiê 26); `AbacatePayClientService`/`BillingService` exclusivamente para a assinatura da própria plataforma Rotta (Dossiê da Landing/Billing). Nenhuma mistura encontrada.                                                                                                                                                                                                                                     |
| 16. Notas fiscais                                             | ❌                     | Nenhuma arquitetura existe — nenhum model Prisma, nenhum módulo, nenhuma menção a Speedy no código. Gap real, registrado em §4 (exige decisão de provedor/credenciais).                                                                                                                                                                                                                                                                                                                                         |
| 17/18. Admin geral + segurança (MFA)                          | ⚠️                     | Painel admin existe (Backoffice, Dossiê 21/29) com RBAC e login pela mesma conta. **MFA não existe** — nenhuma referência a TOTP/2FA em `apps/api/src/modules/auth` nem em `apps/admin`. Gap real de segurança, registrado em §4.                                                                                                                                                                                                                                                                               |
| 19. Integrações administrativas (página)                      | ❌                     | Não existe uma página `Configurações → Integrações` centralizada — cada integração (AbacatePay, Lytex, e-mail) tem sua config espalhada em variáveis de ambiente, sem UI de gestão/status/logs unificada para o Admin Rotta. Gap real, registrado em §4.                                                                                                                                                                                                                                                        |
| 20. Tracking/Marketing (Pixel, Ads, Analytics)                | ❌                     | Nenhuma referência a Meta Pixel/Google Ads/Google Analytics/`gtag`/`fbq` em `apps/web`. Gap real, registrado em §4.                                                                                                                                                                                                                                                                                                                                                                                             |
| 21. Banco de dados multiusuário/multiempresa                  | ✅                     | RLS por `companyId` via `PrismaService.withTenant`/`withBypass`, documentado e testado em todos os módulos (`tenant-isolation.e2e-spec.ts`).                                                                                                                                                                                                                                                                                                                                                                    |
| 22. Privacidade/LGPD                                          | ✅                     | Inventário de dado pessoal por modelo (Dossiê 32), Política de Privacidade real (não genérica, Dossiê 35), proteção reforçada a dado de criança (Seção 8 da própria Política).                                                                                                                                                                                                                                                                                                                                  |
| 23. UX/UI                                                     | ✅ (evolução contínua) | Landing/Design System sem "cara de IA" (Dossiê 26/36), evolução do Marketplace (Dossiê 37/38) — trabalho ativo, não um item fechado de vez.                                                                                                                                                                                                                                                                                                                                                                     |
| 24. Aplicativo (nativo, não "site responsivo")                | ✅                     | Expo/React Native real (`apps/mobile`), GPS via `expo-location`, push via FCM — não é uma versão web empacotada.                                                                                                                                                                                                                                                                                                                                                                                                |
| 25. Landing page (3 portas: Responsável/Empresa/Motorista)    | ✅                     | As 3 portas existem (`/criar-conta/pessoal`, `/criar-conta/empresa`, `/criar-conta/profissional`), inspiração Uber/99/inDrive sem cópia (Dossiê 26).                                                                                                                                                                                                                                                                                                                                                            |

## 3. Fechado nesta rodada — o app real do Motorista/Monitor

A auditoria revelou que, apesar de o backend (`TripsModule`/
`RoutesModule`) estar **100% pronto e testado** desde os Dossiês de
Rotas/GPS, a tela que o Motorista/Monitor realmente usa nunca foi
construída — era um placeholder literal ("em construção") desde a
fundação do app. Isso responde diretamente à pergunta-guia do Prompt
("se a Rotta fosse lançada amanhã... isso funcionaria de verdade?")
com um **não** categórico para este perfil — por isso foi o módulo
escolhido para fechar nesta rodada, entre os vários gaps encontrados.

### 3.1 Backend — dois ajustes pequenos, o resto já existia

- **`TripStatus.PAUSADA`** (migration `20260810200000_trip_pause_resume`)
  — o Prompt (Seção 8) exige diferenciar `PAUSADO` de `EM_ANDAMENTO`; o
  enum só tinha `EM_ANDAMENTO/FINALIZADA/CANCELADA`. Adicionado o valor
  e a coluna `pausadaEm` (nullable, mesma convenção de `finalizadaEm`/
  `canceladaEm`). `TripsService.pause`/`resume` — só transita
  `EM_ANDAMENTO ⇄ PAUSADA`, nunca reinicia `iniciadaEm`. Ingestão de
  posição/checklist continua exigindo `EM_ANDAMENTO` (já era assim) —
  pausar já interrompe os dois automaticamente, sem código extra.
- **`GET /trips/routes/:routeId/today`** — o app do Motorista precisa
  descobrir se já existe uma viagem hoje sem "chutar" via `start` e
  tratar o 409. Novo endpoint de leitura, mesma convenção da rota
  literal `.../history` já existente.
- **`RoutesService.list` escopado por Motorista/Monitor** — gap de
  RBAC encontrado durante a auditoria: `GET /routes` devolvia **todas**
  as rotas da empresa para um Motorista, não só a dele (violando a
  Seção 5/9 do Prompt: "não deve virar um painel administrativo").
  Corrigido: quando o ator é Motorista/Monitor, o filtro
  `atribuidaAUserId` restringe a `motoristaPadraoId`/`monitorPadraoId
= próprio usuário`.
- **`GET /trips/routes/:routeId/history` liberado para Motorista/
  Monitor** — antes só Admin/Empresa/Gestor liam o histórico da
  própria rota do motorista. O controle por registro já vinha de
  `RoutesService.findByIdOrThrow` (que agora já restringe
  Motorista/Monitor à própria rota) — só faltava abrir o `@Roles`.

Todo o resto (`start`/`finish`/`cancel`, posições GPS, checklist de
embarque/desembarque, recálculo de ETA) já existia, já era testado, e
não foi tocado.

### 3.2 Frontend — `apps/mobile/src/features/driver` (novo)

- **`inicio-screen.tsx`** — tela real: rota(s) do dia, mapa com as
  paradas (`RottaMap`, reaproveitado), controles de
  iniciar/pausar/retomar/finalizar viagem (só para o Motorista — o
  Monitor vê a mesma tela sem esses botões, Seção 9 do Prompt),
  checklist de embarque/desembarque por parada
  (`POST /trips/:id/student-events`, já existente) com estado real
  (embarcado/ausente/desembarcado, nunca inventado).
- **`use-trip-gps-reporting.ts`** — envio de posição só enquanto a
  viagem está `EM_ANDAMENTO` (Prompt: "nunca deixar o GPS ativo
  desnecessariamente"). Rastreamento em **primeiro plano** apenas
  (`expo-location`, mesma API já usada pelo Responsável) — GPS em
  segundo plano exigiria `expo-task-manager` + permissão "Always" do
  SO, um compromisso nativo maior que fica registrado como próximo
  passo (§4), não fingido aqui.
- **`historico-screen.tsx`** — viagens passadas da(s) rota(s) do
  Motorista/Monitor, via o endpoint agora liberado.
- **`perfil-screen.tsx`** — nome/papel/empresa/sair, mesmo padrão de
  `painel-web-only-screen.tsx` (sem `window.confirm`/diálogo nativo).
- `DriverNavigator.tsx` — os 3 placeholders substituídos pelas telas
  reais; "Veículo" (já real, Dossiê 23 tarefa #59) intocado.

## 4. Registrado para os próximos módulos (não escondido)

Por exigirem decisão de produto ou credencial externa que esta sessão
não tem como tomar sozinha — nenhum foi ignorado por preguiça, cada um
tem um motivo concreto de não caber nesta rodada:

- **Notas fiscais** (Seção 16) — nenhum provedor foi contratado
  (Speedy é uma sugestão do Prompt, não uma credencial já disponível).
  Construir a arquitetura sem um provedor real geraria um stub sem
  nenhum dado real para validar — melhor esperar a decisão de qual
  provedor contratar.
- **MFA do Admin Rotta** (Seção 18) — decisão de produto (SMS? TOTP/
  app autenticador? e-mail?) que muda a UX de login; implementar
  qualquer uma sem essa decisão arrisca retrabalho.
- **Página "Configurações → Integrações"** (Seção 19) — depende de
  quais integrações o Admin Rotta realmente precisa gerenciar por UI
  (hoje todas vivem em variável de ambiente, que já é seguro — a
  pergunta é se vale a complexidade de uma UI de gestão em cima disso
  agora).
- **Tracking/Marketing — Meta Pixel/Google Ads/Analytics** (Seção 20)
  — exige contas de anúncio/analytics reais (Pixel ID, GA Measurement
  ID) que esta sessão não tem; implementar com IDs fictícios seria
  fabricar uma integração que não funciona.
- **IA jurídica de apoio à redação de contrato** (Seção 14) — a Rotta
  AI hoje só valida a assinatura já feita; "auxiliar na estruturação"
  do texto do contrato é uma funcionalidade nova, não uma extensão do
  que existe.
- **Presença ONLINE/OFFLINE do motorista independente de viagem**
  (Seção 8) — hoje o único sinal de presença é ter ou não uma `Trip`
  ativa; um motorista logado no app sem nenhuma viagem do dia não tem
  um estado "ONLINE" explícito no banco. Modelagem nova, fora do
  escopo desta rodada (que fechou o ciclo de vida da viagem em si).
- **GPS em segundo plano** (Seção 8, implícito em "app real") —
  `expo-task-manager` + permissão "Always" do SO, mesma categoria de
  decisão nativa já registrada para o `BottomSheet` (Dossiê 37 §3.1).
- **Câmera acompanhando o veículo, demais itens de polish visual do
  app do Motorista** — fora de escopo desta rodada (foco foi
  funcionalidade real antes de refinamento visual, conforme Seção 26
  do Prompt: "não quero apenas telas bonitas, quero produto
  funcional").

## 5. Verificação

- `apps/api`: `npx jest --silent` — **508/508 testes passando**
  (inclui 6 casos novos: pause/resume/findTodayByRoute em
  `trips.service.spec.ts`, escopo de `RoutesService.list` em
  `routes.service.spec.ts`).
- `apps/api`: `tsc --noEmit -p tsconfig.build.json` — **passou**.
- `apps/mobile`: `pnpm run typecheck` — **passou** (0 erros).
- `packages/api-client`: `pnpm run typecheck` — **passou**.
- `eslint --fix` escopado aos arquivos novos/editados — 0 erros;
  avisos de estilo pré-existentes (`no-inline-styles`), mesmo padrão
  já presente no resto do app, não introduzidos por esta entrega.
- Migration `20260810200000_trip_pause_resume` escrita à mão (sem
  Postgres disponível neste ambiente para `prisma migrate dev`) —
  `ALTER TYPE ... ADD VALUE` isolado em sua própria instrução (nunca
  referenciado no mesmo arquivo, limitação conhecida do Postgres para
  valores de enum recém-adicionados); `prisma generate` confirmado
  rodando limpo contra o schema atualizado.
- Sem simulador/dispositivo neste ambiente — a tela real do Motorista
  (mapa cheio, GPS reportando em primeiro plano, checklist de
  embarque) fica pendente de verificação visual num build de
  desenvolvimento, mesma ressalva já registrada nos Dossiês 37/38.
