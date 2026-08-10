# Dossiê 40 — Auditoria: Geo Platform, Geo AI Ecosystem e Communication Engine + Geofencing Real

> Escopo dos 3 prompts colados pelo usuário: "Rotta Geo Platform"
> (infraestrutura geográfica central), "Rotta Geo AI Ecosystem" (camada
> de IA sobre a Geo Platform — 6 agentes especializados) e "Rotta
> Communication Engine" (comunicação orientada a eventos). Os três
> pedem explicitamente auditoria antes de implementar. Este dossiê é
> essa auditoria, seguida do gap mais concreto que ela revelou: o
> **geofencing real** (GPS → aproximação/chegada → notificação),
> repetidamente descrito nos três prompts como o ponto de integração
> central entre eles, e que nunca existiu.

## 1. Método

Mesma disciplina das auditorias anteriores (Dossiê 39): confrontar
código real, nunca resumo/memória, contra cada pedido dos 3 prompts.
A esmagadora maioria do que os 3 prompts descrevem **já existe e já
funciona** — construído em sessões anteriores (Rotta Geo Engine,
Education Sync Agent, Geocoding/Validation AI Agents, Rotta
Communication Engine completo com 4 agentes de IA). Um gap real,
concreto e de alta alavancagem foi identificado e fechado; os demais
ficam documentados no §4 com o motivo de não terem sido fechados
juntos.

## 2. Auditoria — o que já existe (preservado, não recriado)

### Rotta Geo Platform

- **OpenStreetMap, não Mapbox** — confirmado: `GeoEngineService` usa
  Nominatim (geocodificação/reverse) e OSRM (routing); nenhuma
  referência a Mapbox em código ativo (migração já registrada em
  sessão anterior).
- **PostGIS habilitado** — `extensions = [postgis]` no schema;
  `School.pontoGeografico: Unsupported("geography(Point, 4326)")`
  mantido por trigger de banco (Map Intelligence Agent).
- **Escolas MEC/INEP com pipeline real** — `InepSyncService` +
  `GeocodingAiAgentService` + `ValidationAiAgentService`, fila BullMQ,
  status por escola (`PENDING`/`GEOCODED`/`VALIDATED`/etc. — nomes
  reais divergem levemente dos citados no prompt, mas o fluxo e a
  intenção são os mesmos).
- **Rotas multiponto, paradas ordenadas, reordenação** —
  `RouteStopRepository.reorder`, `RoutesService`, tudo real e testado.
- **GPS em tempo real, histórico, ETA** — `TripsModule` completo
  (Dossiê 39 já fechou o app real do Motorista que consome isso).
- **`haversineDistanceKm`** já existia (Marketplace, busca por
  proximidade) — **movido** para `shared/utils/geo.util.ts` nesta
  entrega, porque ganhou um segundo consumidor real (geofencing) e não
  fazia mais sentido viver dentro do módulo Marketplace.

### Rotta Geo AI Ecosystem

- **2 dos 6 agentes pedidos já existem**: `GeocodingAiAgentService`
  (~~= "Geo Locator" — normaliza, geocodifica, calcula confiança) e
  `ValidationAiAgentService` (~~= "Geo Validator" — compara
  cidade/bairro/rua, aprova ou sinaliza revisão).
- **4 agentes NÃO existem**: Geo Corrector (loop de correção
  automática), Geo Monitor (detecção de alteração de dados do
  MEC/INEP disparando reprocessamento), Route Intelligence (sugestões
  de reorganização de rota), Data Quality (score de qualidade da base,
  detecção de duplicidade). Registrados em §4.

### Rotta Communication Engine

- **Núcleo orientado a eventos, 4 agentes de IA, todos os canais**
  (Push/E-mail real; WhatsApp/SMS arquitetura preparada — decisão já
  correta do Prompt: "não usar solução não oficial"), preferências de
  usuário + Quiet Hours, Central de Notificações interna, dashboard,
  auditoria — tudo já construído e testado em sessão anterior.
- **`VEICULO_PROXIMO` já existe como tipo de evento** — mas, auditando
  o código real, só era disparado como efeito colateral de
  `addStudentEvent` quando um aluno é marcado `AUSENTE` (recalcula
  ETAs e notifica a próxima parada) — **nunca a partir de proximidade
  geográfica real durante a operação normal da viagem**. Esse é
  exatamente o gap que os dois prompts (Geo Platform §25/§26,
  Communication Engine §25/§26) descrevem repetidamente como a peça
  central que conecta GPS → Geo Intelligence → Communication Engine.

## 3. Fechado nesta rodada — geofencing real

### 3.1 O que existia antes

`TripsService.ingestPosition`/`ingestPositionsBatch` só persistiam a
posição e atualizavam `Vehicle.localizacaoAtual`. Nenhum código
comparava a posição recebida com a localização de nenhuma parada.

### 3.2 O que foi construído

- **`listParadasPendentes`** — extraído de `computeProximasEtas` (que
  antes calculava tudo junto: paradas pendentes + rota OSRM completa).
  Reutilizado por ambos: `computeProximasEtas` continua com a ETA
  completa (rota real via OSRM, para quem pede sob demanda em
  `GET /trips/:id/proximas-etas`); o geofencing usa só a lista de
  paradas pendentes, sem OSRM.
- **`detectarAproximacaoBestEffort(trip, actor, latitude, longitude)`**
  — chamado a cada posição ingerida (unitária e em lote, usando a
  última posição do lote). Calcula distância em linha reta (Haversine)
  até a PRÓXIMA parada pendente — nunca uma chamada de rota (Prompt
  "Rotta Geo Platform" §29: "evitar consultas pesadas" — geofencing
  roda a cada ping de GPS, dezenas de vezes por viagem; uma chamada
  OSRM aqui seria desproporcional). Dentro de 400m, emite
  `VEICULO_PROXIMO` (evento já existente, reaproveitado — nenhum tipo
  novo) para os responsáveis vinculados àquela parada.
- **Dedup real** — `Trip.ultimaParadaProximaNotificadaId` (migration
  `20260810210000_trip_geofence_dedup`): notifica no máximo uma vez
  por parada pendente, nunca a cada novo ping de GPS dentro do mesmo
  raio (Prompt "Communication Engine" §20: "se o GPS oscilar, não
  enviar 'veículo está chegando' 10 vezes"). Muda sozinho quando a
  próxima parada pendente muda (embarque/desembarque registrado) —
  nenhuma limpeza manual necessária.
- **Best-effort de verdade** — nunca lança, nunca desfaz a posição já
  persistida (a posição é gravada ANTES da checagem de geofencing);
  falha de notificação vira log, não erro 500 para o app do motorista.

### 3.3 O que NÃO foi feito (deliberado, dentro deste mesmo gap)

- **`VEICULO_CHEGOU`/`VEICULO_SAIU`** (arrival/departure) não foram
  adicionados como eventos de geofencing automático — o checklist
  manual de embarque/desembarque (`addStudentEvent`, já existente,
  operado pelo motorista) continua sendo o sinal de "chegada"
  confirmada, deliberadamente mais confiável que geofencing puro por
  GPS (GPS urbano tem erro de dezenas de metros; um motorista tocando
  "embarcou" é um sinal humano, não fica sujeito a jitter). Criar um
  segundo caminho paralelo por GPS puro arriscaria dois sinais
  divergentes sobre a mesma parada — decisão de não duplicar, não
  omissão.

## 4. Registrado para os próximos módulos (não escondido)

- **Geo Corrector, Geo Monitor, Route Intelligence, Data Quality
  Agent** (Geo AI Ecosystem §7/§13/§16/§14) — cada um é um sistema por
  si só (loop de correção automática, detecção de alteração de dados
  externos, análise comparativa de rotas, score de qualidade de base)
  — nenhum é uma extensão trivial do que existe; merecem entregas
  próprias.
- **`GeoProvider` como interface formal e trocável** (Geo Platform §2)
  — hoje `GeoEngineService` já é o único ponto de acesso a
  Nominatim/OSRM (nenhum outro módulo chama esses provedores
  diretamente — mesmo efeito prático de uma abstração), mas não é uma
  interface nomeada e injetável que permita trocar de provedor sem
  tocar `GeoEngineService`. Refatoração de arquitetura de baixo risco
  funcional mas escopo largo (toda injeção de dependência que usa
  `GeoEngineService` mudaria) — registrada, não feita às pressas.
  aqui.
- **Área de cobertura poligonal** (Geo Platform §24) — hoje é raio/
  filtro por escola vinculada (`SchoolCompanyLink`); polígonos
  geográficos reais exigem um tipo de dado novo (`geography(Polygon)`)
  e UI de desenho no mapa — fora do escopo desta rodada.
- **Chat Responsável ↔ Transportador** (Communication Engine §33) —
  o módulo de Suporte (tickets) já existe; mensageria direta
  autorizada entre papéis é uma superfície nova (tabelas
  `conversations`/`messages`, RBAC de quem pode falar com quem) — não
  construída.
- **Admin — Geo AI / Communication (dashboards dedicados)** — as
  métricas descritas (score médio, fila, custos de IA, delivery
  rate por canal) parcialmente já existem espalhadas (dashboard de
  comunicação do Dossiê da Communication Engine), mas uma página
  única "Geo AI" com jobs/revisão humana/configuração de agentes não
  existe — depende de decisão de produto sobre o que really precisa
  de UI vs. o que já é observável via logs/métricas existentes.

## 5. Verificação

- `apps/api`: `npx jest --silent` — **513/513 testes passando**
  (5 casos novos de geofencing: notifica dentro do raio, não notifica
  fora do raio, dedup por parada, best-effort nunca lança, sem parada
  pendente não notifica).
- `apps/api`: `tsc --noEmit -p tsconfig.build.json` — **passou**.
- Migration `20260810210000_trip_geofence_dedup` escrita à mão (sem
  Postgres neste ambiente) — só `ALTER TABLE ADD COLUMN` nullable, sem
  risco de dado existente.
- `haversineDistanceKm` movido sem mudança de comportamento — mesmo
  corpo de função, um import atualizado (`marketplace.service.ts`).
