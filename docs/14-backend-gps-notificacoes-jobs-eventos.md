# Dossiê 14 — GPS, Notificações, Jobs e Eventos do Backend

> Continuação direta dos Dossiês 12 e 13. Aqui se detalha, no nível de arquitetura de backend, os três sistemas que sustentam a experiência em tempo real da Rotta: rastreamento GPS, notificações multicanal, e o motor de tarefas assíncronas (jobs) que mantém tudo consistente em segundo plano — e se fecha com o catálogo completo de eventos internos de domínio que amarra tudo isso. Nenhum código é escrito aqui.

---

## 1. Arquitetura completa de GPS

### 1.1 Visão geral do caminho de um ponto de GPS, do celular do motorista ao mapa do responsável

```
[App do Motorista]
   │ captura posição (a cada 5–10s, ajustado dinamicamente — Seção 1.5)
   ▼
[Fila local no dispositivo] ── (garante que nada se perde se a rede cair)
   │ envio em lote (batch) a cada poucos segundos, ou ao reconectar
   ▼
[Realtime Gateway — endpoint de uplink]
   │ valida JWT + viagem em andamento (RN-11)
   │ valida coerência geoespacial (Capítulo 19.3) — sinaliza, não bloqueia
   ├──▶ grava última posição no Redis (leitura instantânea para o mapa)
   ├──▶ roda geofencing contra a próxima ParadaRota
   │        │ (se entrou no geofence)
   │        └──▶ publica evento `rota.chegou_ao_ponto`
   └──▶ enfileira gravação assíncrona (fila `gps-persistence`)
              │
              ▼
        [Worker de Persistência]
              │ grava em lote na tabela particionada `PosicaoGPS` (Postgres)
              ▼
        (disponível para histórico/replay/relatórios)

[Redis Pub/Sub] ──▶ [Socket.IO — canais por tenant/rota/aluno] ──▶ [App do Responsável / Painel do Gestor]
```

### 1.2 Por que a persistência em Postgres é assíncrona e desacoplada do caminho de resposta

O uplink do motorista **nunca espera** a escrita em Postgres para responder — a resposta HTTP/ACK ao app é dada assim que a posição é validada e gravada no Redis (Seção 1.1). A gravação na tabela particionada acontece em lote, por um Worker consumidor da fila `gps-persistence`, minutos ou segundos depois. Justificativa: o requisito de latência crítica é "o responsável vê a posição em tempo real" (resolvido via Redis + Socket.IO, na casa de segundos), não "a posição está persistida permanentemente" (que pode tolerar um atraso de poucos segundos sem qualquer impacto perceptível de produto) — desacoplar os dois caminhos é o que permite ao sistema absorver picos de tráfego de GPS sem que a latência de escrita em disco vire gargalo do caminho que o usuário realmente sente.

### 1.3 Atualização em tempo real (downlink) — detalhamento de implementação

- O Realtime Gateway mantém, em memória/Redis, o mapeamento de quais _sockets_ estão inscritos em quais canais (`tenant:{id}:routes`, `student:{id}`).
- Ao processar uma posição (Seção 1.1), o Gateway publica no canal Redis Pub/Sub correspondente à `Viagem`/`Rota`; **todas as instâncias** do Realtime Gateway (quando escalado horizontalmente, Capítulo 20.2) estão inscritas nesse mesmo canal Redis, garantindo que um socket conectado a qualquer instância recebe a atualização, independentemente de qual instância processou o ponto de GPS originalmente — este é o mecanismo que permite escalar o Gateway horizontalmente sem _sticky sessions_ baseadas em estado local de processo.
- O cliente (app/painel) nunca recebe a coordenada bruta de outro aluno que não o seu — o filtro de canal já impede a assinatura (Dossiê 12, Seção 5.2), e o payload de posição trafega apenas para quem está inscrito no canal específico daquele aluno/rota.

### 1.4 Persistência e histórico

- Tabela `PosicaoGPS` particionada por dia (Capítulo 21 do Dossiê 8) — o Worker de Persistência escreve sempre na partição do dia corrente, nunca precisa decidir "em qual tabela gravar" (o Postgres roteia automaticamente pela data via particionamento declarativo).
- Consultas de **histórico/replay** (ex. reconstituir o trajeto de uma viagem específica para investigar uma reclamação) são sempre direcionadas a uma **réplica de leitura** (Capítulo 21.6), nunca ao primário, e usam o índice composto (`viagem_id`, `timestamp`) já definido no Dossiê 8, Seção 19.
- **Downsampling**: um job periódico (Seção 3) reduz a granularidade de posições com mais de 90 dias para 1 ponto a cada 5 minutos, movendo o dado para uma tabela de resolução reduzida — mantendo o Postgres operacional enxuto e rápido para o dado quente (Capítulo 21.4).

### 1.5 Consumo de bateria — estratégias concretas

O app do motorista é o componente mais sensível a bateria de toda a plataforma (fica rodando GPS em segundo plano por horas). Estratégias combinadas:

- **Frequência adaptativa**: 5–10s de intervalo durante a viagem ativa; ao detectar que o veículo está parado por mais de um limiar curto (ex. semáforo, engarrafamento leve), o app reduz a frequência de captura sem perder precisão de ETA (a posição não mudou o suficiente para justificar mais pontos); ao concluir a rota (Seção 3.6 do Dossiê 11 — confirmação de van vazia), o GPS de alta frequência é desligado completamente, voltando a um modo de repouso (localização de baixa precisão/frequência ou desligada), nunca "sempre ligado o dia inteiro".
- **Uso de APIs nativas de geolocalização otimizadas para bateria** (ex. `expo-location` com `Accuracy.Balanced` durante trechos de rota estável, elevando para `Accuracy.High` apenas nos momentos de aproximação de uma parada, onde a precisão de geofencing importa mais).
- **Uma única notificação persistente** (exigência de transparência e de conformidade de loja, Dossiê 9 Seção 6.3) em vez de múltiplos serviços em segundo plano concorrendo por recursos.
- **Envio em lote** (Seção 1.1) em vez de uma requisição de rede por ponto capturado — menos ativações de rádio de rede (um dos maiores consumidores de bateria em apps de rastreamento), com o lote acumulado localmente entre envios.

### 1.6 Reconexão

- O uplink HTTP em lote é, por natureza, tolerante a reconexão: se uma tentativa de envio falha (sem rede), o lote permanece na fila local do dispositivo e é reenviado na tentativa seguinte, com **backoff exponencial** entre tentativas (evita bombardear a rede com retries agressivos quando a conectividade está ruim por um período prolongado, cenário comum em trechos rurais/periféricos).
- O canal de downlink (Socket.IO) reconecta automaticamente (biblioteca nativa do Socket.IO) e, ao reconectar, o cliente solicita explicitamente um **snapshot do estado atual** via REST (`GET /gps/trips/:id/last-position`) antes de voltar a confiar em atualizações incrementais — evita a situação de "o mapa mostra uma posição de 10 minutos atrás e o usuário não percebe que está desatualizada" (princípio de confiança do Capítulo 8.6, Dossiê 2).

### 1.7 Modo offline (quando o motorista fica sem qualquer conectividade por um período)

- Toda ação crítica de campo (posições de GPS, checklist de embarque/desembarque) é primeiro gravada em um armazenamento local no dispositivo (banco embutido, ex. SQLite via Expo/`expo-sqlite`, ou uma fila persistente equivalente) **antes** de qualquer tentativa de envio de rede — o app nunca depende de rede disponível para permitir que o motorista continue registrando o checklist e operando a rota.
- Cada evento gerado localmente carrega uma **chave de idempotência** (UUID gerado no dispositivo no momento da criação do evento) — ao sincronizar depois, o backend usa essa chave para descartar duplicatas com segurança, mesmo que o app tente reenviar o mesmo lote mais de uma vez após uma falha de rede ambígua (ex. requisição que chegou ao servidor mas a confirmação se perdeu).
- Ordem de eventos é preservada pelo timestamp **gerado no dispositivo**, não pelo timestamp de chegada ao servidor — essencial para reconstituir corretamente a sequência real dos acontecimentos mesmo quando um lote inteiro chega atrasado, de uma vez, após um período longo offline.

---

## 2. Arquitetura de Notificações (aprofundamento de implementação sobre o Dossiê 9, Seção 5.4)

### 2.1 Estrutura de filas (BullMQ/Redis)

Uma fila dedicada por canal (`notifications-push`, `notifications-whatsapp`, `notifications-sms`, `notifications-email`), cada uma consumida por um pool de Workers dedicado — isolamento por fila permite que uma lentidão/instabilidade momentânea de um provedor específico (ex. a API do WhatsApp degradando) não atrase o processamento dos demais canais. Uma fila adicional `notifications-critical` (prioridade máxima, consumida com maior concorrência) recebe exclusivamente eventos de gravidade crítica (SOS, ocorrência grave — RN-17), garantindo que esse tipo de mensagem nunca espera atrás de um volume grande de notificações rotineiras (ex. confirmações de embarque de toda a base às 7h da manhã).

### 2.2 Política de retry por canal

| Canal                                  | Tentativas                                                     | Backoff                        | Comportamento após esgotar tentativas                                                                                                                   |
| -------------------------------------- | -------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Push (FCM/APNs)                        | 3                                                              | Exponencial (5s, 30s, 2min)    | Marca `falhou`, tenta fallback para o próximo canal preferido do usuário                                                                                |
| WhatsApp Cloud API                     | 3                                                              | Exponencial (10s, 1min, 5min)  | Fallback para SMS                                                                                                                                       |
| SMS (Twilio/Zenvia)                    | 2                                                              | Exponencial (10s, 1min)        | Marca `falhou` definitivamente (último canal da cadeia de fallback)                                                                                     |
| E-mail                                 | 3                                                              | Exponencial (30s, 5min, 30min) | Marca `falhou` (canal geralmente não crítico/tempo-sensível)                                                                                            |
| Crítica (multicanal simultâneo, RN-17) | 2 por canal, em paralelo, não em cadeia de fallback sequencial | Curto (5s)                     | Alerta operacional interno à equipe de suporte se **todos** os canais falharem para uma notificação crítica — cenário que nunca deve passar em silêncio |

### 2.3 Logs e rastreabilidade

Cada tentativa de envio (sucesso ou falha) atualiza o registro `Notificacao` (Dossiê 8, Seção 13) com o status e timestamp da transição, e emite um log estruturado (Dossiê 12, Seção 10.3) carregando o `id de correlação` do evento de domínio que originou a notificação — permitindo, a partir de um chamado de suporte ("a mãe não recebeu o aviso de embarque"), reconstituir toda a jornada: evento → notificação criada → tentativas → resultado final, sem precisar investigar manualmente em múltiplos sistemas.

### 2.4 Idempotência de envio

Toda tarefa de envio na fila carrega um identificador único (o `id` do registro `Notificacao`) e o Worker verifica o status atual antes de processar — se o BullMQ reprocessar uma tarefa por qualquer motivo (ex. Worker reiniciado no meio do processamento), a notificação já marcada como `entregue` não é reenviada, evitando o cenário desagradável de um responsável receber a mesma notificação de embarque duplicada.

---

## 3. Jobs em background (BullMQ) — catálogo completo

| Job                                                  | Gatilho                                                                            | Frequência/Padrão                        | Fila                        | Descrição                                                                                                                                                        |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Enviar notificação                                   | Evento de domínio publicado                                                        | Sob demanda (near-realtime)              | `notifications-*`           | Consome o evento, resolve destinatários/canais, envia (Seção 2)                                                                                                  |
| Persistir posições GPS                               | Uplink do motorista processado                                                     | Sob demanda, em lote                     | `gps-persistence`           | Grava `PosicaoGPS` na partição do dia corrente (Seção 1.2)                                                                                                       |
| Recalcular ETA de uma rota em andamento              | Nova posição processada, a cada N segundos (não a cada ponto — throttled)          | Sob demanda, taxa limitada               | `eta-recalc`                | Chama o adapter de mapas (Google Directions) e atualiza o valor cacheado de ETA consumido pelo downlink                                                          |
| Downsampling de GPS histórico                        | Agendado                                                                           | Diário (madrugada, baixo tráfego)        | `gps-maintenance`           | Reduz granularidade de posições com mais de 90 dias (Seção 1.4)                                                                                                  |
| Arquivamento frio de GPS antigo                      | Agendado                                                                           | Semanal                                  | `gps-maintenance`           | Move partições além do prazo de retenção de resolução reduzida para armazenamento frio (S3/Parquet), depois remove a partição do Postgres                        |
| Verificar documentos vencendo                        | Agendado                                                                           | Diário                                   | `documents-maintenance`     | Varre `Documento` por `data_vencimento` nos marcos de 30/15/5 dias (RN-20), gera `EventoAgenda` e publica evento de notificação                                  |
| Recalcular status derivado de Motorista/Veículo      | Evento de domínio (documento aprovado/vencido) **e** varredura diária de segurança | Sob demanda + diário (rede de segurança) | `compliance-recalc`         | Garante RN-29/30 mesmo em caso de falha pontual do caminho orientado a evento                                                                                    |
| Gerar relatório                                      | Solicitação via API (`POST /reports/generate`)                                     | Sob demanda                              | `reports`                   | Processa a consulta pesada contra réplica de leitura, gera PDF/planilha, disponibiliza via S3                                                                    |
| Expirar sessões/refresh tokens                       | Agendado                                                                           | Diário                                   | `auth-maintenance`          | Remove registros de `Sessao`/refresh token expirados havia muito tempo (higiene de tabela, não afeta segurança — expiração já é validada em tempo real no login) |
| Limpar denylist de JWT expirados                     | Agendado                                                                           | Horário                                  | `auth-maintenance`          | Remove do Redis entradas de denylist cujo TTL natural já expiraria de qualquer forma (housekeeping)                                                              |
| Reenviar convite não aceito                          | Agendado                                                                           | A cada 3 dias, até um limite             | `engagement`                | Reenvia convite de responsável/motorista que não completou a ativação (Dossiê 11, Seção 7.2/7.6)                                                                 |
| Cobrança recorrente e retry de falha de pagamento    | Agendado (ciclo de cobrança) + webhook do gateway                                  | Mensal + sob demanda                     | `billing`                   | Implementa RN-03 (tentativas D+1/D+3/D+7, modo restrito, carência)                                                                                               |
| Expurgo/anonimização por política de retenção (LGPD) | Agendado                                                                           | Diário                                   | `privacy-maintenance`       | Aplica as políticas de retenção do Capítulo 19.4/Dossiê 8 Seção 16.5 — solicitações de exclusão do titular (RN-24) e prazos automáticos de expurgo               |
| Compactação/arquivamento de logs antigos             | Agendado                                                                           | Semanal                                  | `observability-maintenance` | Move logs além da janela "quente" (Dossiê 8, Seção 17.2) para armazenamento de longo prazo mais barato                                                           |
| Verificação de saúde de integrações externas         | Agendado                                                                           | A cada 5 minutos                         | `health-checks`             | Ping leve aos provedores críticos (FCM, WhatsApp, gateway de pagamento, S3) alimentando o painel de observabilidade (Dossiê 12, Seção 10)                        |

**Princípio de desenho comum a todos os jobs**: todo job é **idempotente** (pode ser executado mais de uma vez com o mesmo efeito final, nunca duplicando dado ou disparando um efeito colateral duas vezes) e todo job agendado é registrado com um identificador único de execução, permitindo observabilidade (Dossiê 12, Seção 10) sobre "quando rodou pela última vez, quanto demorou, se falhou".

---

## 4. Eventos internos de domínio — catálogo completo

### 4.1 Lista de eventos, produtor e consumidores

| Evento                                       | Publicado por (módulo)                      | Consumido por                                                                                | Efeito                                                                   |
| -------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `viagem.iniciada`                            | Trips                                       | GPS (ativa ingestão), Notifications (opcional, aviso interno)                                | Ativa o ciclo de rastreamento daquela viagem                             |
| `aluno.embarcou`                             | Trips (checklist)                           | Notifications                                                                                | Notifica responsável(is) daquele aluno                                   |
| `aluno.desembarcou`                          | Trips (checklist)                           | Notifications                                                                                | Notifica responsável(is)                                                 |
| `aluno.faltou`                               | Trips (checklist, sem justificativa prévia) | Notifications, Agenda                                                                        | Notifica responsável perguntando o motivo (RN-14)                        |
| `aluno.ausencia_avisada`                     | Students (endpoint de ausência)             | Trips (marca aluno esperado como já justificado), Notifications (confirmação ao responsável) | Evita alerta de falta não justificada no dia                             |
| `rota.chegou_ao_ponto`                       | GPS (geofencing)                            | Trips (abre tela de checklist no app), Notifications (prepara aviso de proximidade)          | Sincroniza operação de campo com o motor de notificação                  |
| `rota.atraso_detectado`                      | GPS/Trips (comparação ETA vs. previsto)     | Notifications, Dashboard                                                                     | Notificação proativa ao responsável (RN-15), alerta no painel do Gestor  |
| `viagem.finalizada`                          | Trips (após confirmação de van vazia)       | GPS (desliga ingestão de alta frequência), Reports/Analytics (disponibiliza para agregação)  | Fecha o ciclo operacional do dia                                         |
| `viagem.van_vazia_confirmada`                | Trips                                       | Audit                                                                                        | Registro imutável de conformidade com RN-12                              |
| `motorista.trocado`                          | Routes (substituição)                       | Notifications, Trips, Audit                                                                  | Avisa responsáveis da rota, atualiza a viagem do dia, registra auditoria |
| `veiculo.trocado`                            | Routes (substituição)                       | Notifications, Trips, Audit                                                                  | Idem                                                                     |
| `ocorrencia.registrada`                      | Trips                                       | Notifications (multicanal se crítica, RN-17), Dashboard, Audit                               | Alerta imediato quando grave                                             |
| `documento.vencendo`                         | Documents (job de verificação, Seção 3)     | Notifications, Agenda                                                                        | Avisa Gestor/titular do documento nos marcos 30/15/5 dias                |
| `documento.vencido`                          | Documents (recálculo de status)             | Drivers/Vehicles (bloqueio RN-18/19), Notifications, Audit                                   | Bloqueia início de rota daquele motorista/veículo                        |
| `documento.aprovado`                         | Documents (revisão manual/OCR)              | Drivers/Vehicles (recalcula status para `aprovado`)                                          | Libera motorista/veículo para operar                                     |
| `empresa.assinatura_alterada`                | Companies (webhook de pagamento)            | Notifications, Settings (invalida cache de status de assinatura, Dossiê 8 §20.3)             | Aplica RN-03 (modo restrito/carência)                                    |
| `usuario.vinculo_criado`                     | Settings/Parents/Drivers (convite aceito)   | Notifications, Audit                                                                         | Confirma ativação de um novo papel                                       |
| `usuario.vinculo_revogado`                   | Settings                                    | Auth (revoga todas as sessões daquele vínculo), Audit                                        | Efetiva a remoção de acesso imediatamente                                |
| `notificacao.enviada` / `notificacao.falhou` | Notifications (Worker)                      | Analytics, Support (contexto para chamados)                                                  | Alimenta métricas de entrega e rastreabilidade de suporte                |

### 4.2 Por que este catálogo é a espinha dorsal da manutenibilidade do sistema

Cada linha da tabela acima é, ao mesmo tempo, (a) o contrato de desacoplamento entre módulos (Dossiê 12, Seção 1.5), (b) a base da suíte de testes de regra de negócio (Dossiê 12, Seção 9.2 — cada regra RN-* tem um evento correspondente cujo disparo é testável em isolamento), e (c) o roteiro de extração futura para microsserviços (Dossiê 12, Seção 1.4) — qualquer módulo que hoje só _consome_ eventos de outros (nunca acessa diretamente suas tabelas) já está pronto, no dia em que precisar, para ser extraído sem que uma única regra de negócio precise ser reescrita.
