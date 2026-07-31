# Dossiê 13 — Módulos e APIs Completas do Backend

> Continuação direta do Dossiê 12. Aqui cada um dos 24 módulos é especificado com sua responsabilidade, entidades principais (referenciando o modelo de dados do Dossiê 8) e a lista completa de APIs — método HTTP, endpoint, payload (campos, não JSON literal), resposta e erros possíveis. Convenções válidas para **todo** endpoint abaixo, não repetidas em cada linha:
>
> - Toda rota (exceto as explicitamente marcadas `[público]`) exige JWT Bearer válido e retorna **401** se ausente/inválido/expirado, e **403** se o papel do token não tem permissão para aquela ação (Dossiê 12, Seção 5).
> - Todo endpoint com corpo de requisição retorna **422** para payload que falha validação de schema (campo obrigatório ausente, formato inválido).
> - Toda listagem (`GET` de coleção) aceita paginação por cursor e retorna metadados de paginação (Dossiê 4, Capítulo 17.3) — omitido das tabelas abaixo por brevidade, mas presente em todas.
> - Toda rota é implicitamente restrita ao `tenant_id` do token (Dossiê 12, Seção 5.1) — omitido das tabelas, exceto quando o comportamento exige nota especial (ex. rotas do Admin Rotta).
> - Versionamento de path (`/v1/...`) omitido nas tabelas por legibilidade, mas aplicado a toda rota (Capítulo 17.3).

---

## 1. Auth

**Responsabilidade**: autenticação (login por qualquer identificador), emissão/renovação/revogação de tokens, gestão de sessões/dispositivos, 2FA. **Não decide** autorização de negócio (isso é `RolesGuard`/`TenantGuard` do Dossiê 12, consumido por todos os módulos).

**Entidades**: `Usuario`, `VinculoPapel`, `Sessao`.

| Método | Endpoint | Payload | Resposta | Erros possíveis |
|---|---|---|---|---|
| POST | `/auth/login/otp/request` `[público]` | identificador (e-mail/telefone/CPF), canal preferido | confirmação de envio + tempo de expiração do código | 404 identificador não encontrado (mensagem genérica, Dossiê 12 §7.4); 429 rate limit excedido |
| POST | `/auth/login/otp/verify` `[público]` | identificador, código, `device_id` | par de tokens (ou lista de perfis, se múltiplos vínculos) | 401 código inválido/expirado; 423 conta bloqueada |
| POST | `/auth/login/password` `[público]` | identificador, senha, `device_id`, código 2FA (se habilitado) | par de tokens | 401 credenciais inválidas; 428 2FA requerido e não enviado |
| POST | `/auth/refresh` `[público]` | `refresh_token` | novo par de tokens | 401 token inválido/expirado/reutilizado (revoga família inteira, Dossiê 12 §4.4) |
| POST | `/auth/logout` | `refresh_token` | 204 | 401 token não pertence à sessão do usuário |
| POST | `/auth/select-profile` | `vinculo_id` desejado | novo par de tokens escopado a esse vínculo | 403 vínculo não pertence ao usuário autenticado |
| POST | `/auth/magic-link/request` `[público]` | e-mail | confirmação de envio | 404 (genérico) |
| GET | `/auth/magic-link/verify` `[público]` | query: `token` | par de tokens | 401 token expirado/inválido |
| GET | `/auth/oauth/google/callback` `[público]` | query: `code` (padrão OAuth) | par de tokens | 401 falha na troca do código |
| POST | `/auth/password/forgot` `[público]` | identificador | 200 sempre (nunca revela existência da conta) | — |
| POST | `/auth/password/reset` `[público]` | token de reset, nova senha | 204 | 401 token inválido/expirado; 422 senha não atende requisitos mínimos |
| GET | `/auth/sessions` | — | lista de sessões/dispositivos ativos | — |
| DELETE | `/auth/sessions/:id` | — | 204 | 403 sessão pertence a outro usuário |
| POST | `/auth/2fa/enable` | — | segredo TOTP + QR code | — |
| POST | `/auth/2fa/confirm` | código TOTP | 204 (2FA ativado) | 401 código inválido |
| POST | `/auth/2fa/disable` | senha atual (reconfirmação) | 204 | 401 senha incorreta |

---

## 2. Users

**Responsabilidade**: dados de identidade da pessoa (Seção 2.1–2.2 do Dossiê 8), independente de papel/tenant. **Não gerencia** documentos ou dados operacionais específicos de motorista/veículo (isso é de `Drivers`/`Vehicles`).

**Entidades**: `Usuario`, `VinculoPapel`.

| Método | Endpoint | Payload | Resposta | Erros possíveis |
|---|---|---|---|---|
| GET | `/users/me` | — | perfil completo do usuário autenticado | — |
| PATCH | `/users/me` | nome, foto, e-mail/telefone (se ainda não confirmado por outro), preferências | usuário atualizado | 409 e-mail/telefone já usado por outra conta |
| GET | `/users/me/vinculos` | — | lista de `VinculoPapel` ativos (todos os tenants/papéis) | — |
| GET | `/users/:id` (Gestor/Empresa/Admin) | — | dados do usuário dentro do escopo do tenant do solicitante | 404 fora do tenant |
| PATCH | `/users/:id/status` (Gestor/Empresa/Admin) | novo status (ativo/bloqueado) | atualizado | 403 tentativa de bloquear a si mesmo como único Empresa do tenant |

---

## 3. Companies

**Responsabilidade**: ciclo de vida do tenant — cadastro, dados cadastrais, configuração operacional, assinatura/cobrança.

**Entidades**: `Empresa`, `EmpresaConfiguracao`, `Plano`.

| Método | Endpoint | Payload | Resposta | Erros possíveis |
|---|---|---|---|---|
| POST | `/companies` `[público]` | tipo (autônomo/MEI/empresa), razão social/nome, CNPJ/CPF, endereço, dados do responsável legal, telefone/e-mail | empresa criada + `tenant_id` + tokens iniciais do papel Empresa | 409 CNPJ/CPF já cadastrado; 422 tipo incompatível com documento informado |
| GET | `/companies/:id` | — | dados cadastrais completos | — |
| PATCH | `/companies/:id` | campos cadastrais editáveis | atualizado | — |
| GET | `/companies/:id/configuracoes` | — | `EmpresaConfiguracao` (limiar de atraso, política de bloqueio por documento, canais habilitados) | — |
| PATCH | `/companies/:id/configuracoes` | chave/valor de configuração | atualizado | 422 chave inexistente/valor fora do domínio esperado |
| GET | `/companies/:id/billing` | — | status da assinatura, plano, próxima cobrança, histórico de faturas | — |
| POST | `/companies/:id/billing/payment-method` | token do gateway de pagamento (nunca dado de cartão bruto) | método de pagamento atualizado | 402 token rejeitado pelo gateway |
| POST | `/companies/:id/billing/cancel` (papel Empresa apenas) | motivo (opcional) | assinatura marcada para cancelamento ao fim do ciclo | 403 papel diferente de Empresa |
| GET | `/companies/:id/usage` | — | contagem de veículos/motoristas/alunos ativos (RN-05) | — |

---

## 4. Schools

**Responsabilidade**: cadastro de escolas (padrão INEP) e a superfície de leitura consumida pelo Painel da Escola.

**Entidades**: `Escola`.

| Método | Endpoint | Payload | Resposta | Erros possíveis |
|---|---|---|---|---|
| POST | `/schools` | nome, código INEP (opcional), rede, município, UF, endereço, lat/lng, turnos, contato | escola criada | 422 código INEP em formato inválido |
| GET | `/schools` | query: nome, município | lista paginada | — |
| GET | `/schools/:id` | — | detalhe completo | 404 |
| PATCH | `/schools/:id` | campos editáveis | atualizado | — |
| DELETE | `/schools/:id` | — | 204 | 409 há alunos ativos vinculados |
| GET | `/schools/:id/students` (Escola/Gestor) | — | lista de alunos daquela escola | — |
| GET | `/schools/:id/status-today` (Escola) | — | status agregado dos alunos em rota hoje (sem coordenada bruta, RN-25 estendida) | — |

---

## 5. Drivers

**Responsabilidade**: cadastro, documentação, disponibilidade e status derivado dos motoristas.

**Entidades**: `Motorista`, `CursoMotorista`, `DisponibilidadeMotorista`, `Documento` (polimórfico).

| Método | Endpoint | Payload | Resposta | Erros possíveis |
|---|---|---|---|---|
| POST | `/drivers` | dados pessoais, CNH/categoria/EAR, telefone/e-mail de convite | motorista criado, status `pendente_verificacao` | 409 CNH já cadastrada no tenant |
| GET | `/drivers` | query: status, disponibilidade | lista paginada | — |
| GET | `/drivers/:id` | — | detalhe completo (docs, cursos, disponibilidade, rotas atribuídas) | 404 |
| PATCH | `/drivers/:id` | campos editáveis | atualizado | — |
| DELETE | `/drivers/:id` | — | 204 (desligamento — RN-27 sinaliza rotas órfãs) | 409 possui viagem em andamento agora |
| POST | `/drivers/:id/documents` | tipo de documento, `document_id` (do módulo Documents), data de validade | documento vinculado, status `pendente_verificacao` | 422 tipo de documento não aplicável a motorista |
| GET | `/drivers/:id/documents` | — | lista com status de vencimento | — |
| POST | `/drivers/:id/courses` | tipo de curso, instituição, data de conclusão, validade, `document_id` do certificado | curso registrado | — |
| GET | `/drivers/:id/availability` | — | disponibilidade cadastrada (dias/turnos) | — |
| PUT | `/drivers/:id/availability` | dias/turnos disponíveis | atualizado | — |
| POST | `/drivers/:id/facial-enrollment` | referência ao *embedding* gerado no app (nunca imagem bruta) | registro biométrico de referência criado (RN-33) | 422 qualidade insuficiente do enrolamento |
| GET | `/drivers/:id/trip-history` | query: período | histórico de viagens conduzidas | — |

---

## 6. Monitors

**Responsabilidade**: mesmo padrão de `Drivers`, sem os campos de habilitação de condução (CNH/EAR não se aplicam).

**Entidades**: `Monitor`, `Documento`.

| Método | Endpoint | Payload | Resposta | Erros possíveis |
|---|---|---|---|---|
| POST | `/monitors` | dados pessoais, telefone/e-mail de convite | monitor criado, status `pendente_verificacao` | — |
| GET | `/monitors` | query: status | lista paginada | — |
| GET | `/monitors/:id` | — | detalhe completo | 404 |
| PATCH | `/monitors/:id` | campos editáveis | atualizado | — |
| DELETE | `/monitors/:id` | — | 204 | 409 possui viagem em andamento agora |
| POST | `/monitors/:id/documents` | tipo, `document_id`, validade | documento vinculado | — |
| GET | `/monitors/:id/availability` | — | disponibilidade cadastrada | — |
| PUT | `/monitors/:id/availability` | dias/turnos | atualizado | — |

---

## 7. Parents (Responsáveis)

**Responsabilidade**: convite/ativação de responsáveis, vínculo com alunos, preferências de notificação, autorizados a retirar.

**Entidades**: `Responsavel`, `AlunoResponsavel`, `AutorizadoRetirada`.

| Método | Endpoint | Payload | Resposta | Erros possíveis |
|---|---|---|---|---|
| POST | `/parents/invite` (Gestor) | `aluno_id`, telefone/e-mail, grau de parentesco, é financeiro/legal | convite enviado | 409 já existe vínculo ativo idêntico |
| POST | `/parents/accept-invite` `[público, token de convite]` | token do convite, CPF, senha/definição de OTP | vínculo confirmado, conta ativada | 401 token expirado/inválido |
| GET | `/parents/:id` (Gestor) | — | detalhe do responsável | 404 |
| GET | `/parents/me/children` | — | lista de alunos vinculados à conta autenticada | — |
| PATCH | `/parents/me/notification-preferences` | canais habilitados por tipo de evento | atualizado | — |
| POST | `/parents/me/children/:alunoId/authorize-pickup` | nome, parentesco, foto (opcional) | autorizado criado | 403 aluno não vinculado a este responsável |
| DELETE | `/parents/me/children/:alunoId/authorize-pickup/:id` | — | 204 | 403 idem |

---

## 8. Students

**Responsabilidade**: cadastro de alunos, vínculo com escola/responsáveis, ausência avisada, importação em massa.

**Entidades**: `Aluno`, `AlunoResponsavel`.

| Método | Endpoint | Payload | Resposta | Erros possíveis |
|---|---|---|---|---|
| POST | `/students` (Gestor) | nome, nascimento, foto, `escola_id`, turma/turno, necessidades especiais, ponto de embarque/desembarque | aluno criado, status `ativo` | 422 endereço não geocodificável |
| GET | `/students` | query: escola, status, rota | lista paginada | — |
| GET | `/students/:id` | — | detalhe completo | 404; 403 se Responsável solicitando aluno não vinculado |
| PATCH | `/students/:id` (Gestor) | campos editáveis | atualizado | — |
| DELETE | `/students/:id` (Gestor) | — | 204 (soft delete, RN-24 aplica retenção) | 409 possui viagem em andamento hoje |
| POST | `/students/:id/responsaveis` (Gestor) | `responsavel_id` existente ou dados de convite | vínculo criado | 409 vínculo duplicado |
| DELETE | `/students/:id/responsaveis/:responsavelId` (Gestor) | — | 204 | 409 é o único responsável financeiro/legal |
| POST | `/students/:id/absence` (Responsável) | data, turno, motivo (opcional) | ausência registrada (RN-14) | 403 aluno não vinculado; 422 data no passado |
| GET | `/students/:id/history` | query: período | histórico de viagens/checklist do aluno | — |
| POST | `/students/import` (Gestor) | arquivo de planilha | relatório de importação (linhas processadas/com erro) | 422 formato de arquivo inválido |

---

## 9. Vehicles

**Responsabilidade**: cadastro de veículos, documentação e status derivado.

**Entidades**: `Veiculo`, `Documento`.

| Método | Endpoint | Payload | Resposta | Erros possíveis |
|---|---|---|---|---|
| POST | `/vehicles` | placa, modelo, marca, ano, cor, capacidade, tipo, foto | veículo criado | 409 placa já cadastrada neste tenant |
| GET | `/vehicles` | query: status | lista paginada | — |
| GET | `/vehicles/:id` | — | detalhe completo | 404 |
| PATCH | `/vehicles/:id` | campos editáveis | atualizado | — |
| DELETE | `/vehicles/:id` | — | 204 | 409 vinculado a rota ativa |
| POST | `/vehicles/:id/documents` | tipo (CRLV/seguro/vistoria), `document_id`, validade | documento vinculado | — |
| GET | `/vehicles/:id/documents` | — | lista com status de vencimento | — |
| GET | `/vehicles/:id/usage-history` | query: período | histórico de viagens realizadas com este veículo | — |

---

## 10. Routes

**Responsabilidade**: modelagem estrutural de rotas — paradas, alunos vinculados, motorista/veículo padrão, substituições.

**Entidades**: `Rota`, `ParadaRota`, `AlunoRota`.

| Método | Endpoint | Payload | Resposta | Erros possíveis |
|---|---|---|---|---|
| POST | `/routes` | nome, turno, dias da semana, `veiculo_id`, `motorista_id`, `monitor_id` (opcional) | rota criada | 422 motorista/veículo com status bloqueado |
| GET | `/routes` | query: turno, status | lista paginada | — |
| GET | `/routes/:id` | — | detalhe (paradas, alunos, distância/tempo estimado) | 404 |
| PATCH | `/routes/:id` | campos editáveis | atualizado (versão anterior preservada, Capítulo 9.1 do Dossiê 8) | — |
| DELETE | `/routes/:id` | — | 204 (encerra a rota) | 409 possui viagem em andamento hoje |
| POST | `/routes/:id/stops` | endereço/lat-lng, horário previsto, ordem, tipo (embarque/desembarque/ambos) | parada criada | 422 endereço não geocodificável |
| PATCH | `/routes/:id/stops/:stopId` | campos editáveis | atualizado | — |
| DELETE | `/routes/:id/stops/:stopId` | — | 204 | 409 há alunos vinculados a esta parada |
| PUT | `/routes/:id/stops/reorder` | lista ordenada de IDs de parada | ordem atualizada | 422 lista incompleta/com ID inválido |
| POST | `/routes/:id/students` | `aluno_id`, parada de embarque, parada de desembarque | vínculo criado (RN-26 valida turno não conflitante) | 409 aluno já vinculado a rota ativa do mesmo turno |
| DELETE | `/routes/:id/students/:alunoId` | — | 204 | — |
| POST | `/routes/:id/substitute-driver` | `motorista_id`, escopo (hoje/permanente) | substituição registrada, evento `troca_motorista` publicado | 422 motorista bloqueado por documento vencido |
| POST | `/routes/:id/substitute-vehicle` | `veiculo_id`, escopo | substituição registrada, evento `troca_veiculo` publicado | 422 veículo bloqueado |
| GET | `/routes/:id/estimate` | — | distância estimada, tempo médio (via adapter Google Directions) | 503 provedor de mapas indisponível (com *fallback* de cache) |

---

## 11. Trips (Viagens)

**Responsabilidade**: execução concreta de uma rota em um dia — início/fim, checklist, ocorrências.

**Entidades**: `Viagem`, `ParadaViagem`, `Evento`.

| Método | Endpoint | Payload | Resposta | Erros possíveis |
|---|---|---|---|---|
| POST | `/trips/:routeId/start` (Motorista) | `device_id` | viagem criada, status `em_andamento` | 423 motorista/veículo bloqueado por documento vencido (RN-18/19); 409 já existe viagem em andamento para esta rota hoje; 403 motorista não é o titular/substituto designado (RN-11) |
| POST | `/trips/:id/finish` (Motorista) | confirmação explícita de van vazia (obrigatória) | viagem finalizada | 422 confirmação ausente (RN-12); 409 há alunos sem checklist concluído |
| POST | `/trips/:id/cancel` (Gestor/Motorista) | motivo | 204 | 409 viagem já finalizada |
| GET | `/trips` | query: rota, data, status | lista paginada | — |
| GET | `/trips/:id` | — | detalhe completo (paradas realizadas, eventos, checklist) | 404; 403 fora do escopo do solicitante (Responsável só vê viagens do próprio filho) |
| POST | `/trips/:id/checklist/boarding` (Motorista/Monitor) | `aluno_id`, `parada_id`, status (embarcou/ausente), submotivo | evento registrado, notificação disparada | 409 aluno já processado nesta parada |
| POST | `/trips/:id/checklist/alighting` (Motorista/Monitor) | `aluno_id`, `parada_id` | evento registrado, notificação disparada | 409 idem |
| POST | `/trips/:id/occurrences` (Motorista/Monitor) | tipo, descrição, gravidade, `document_id` de foto (opcional) | ocorrência criada; se gravidade crítica, notificação multicanal imediata (RN-17) | — |
| GET | `/trips/:id/timeline` | — | linha do tempo completa de eventos daquela viagem | — |

---

## 12. GPS

**Responsabilidade**: ingestão e consulta de posições — a maior parte do tráfego real deste módulo passa pelo Realtime Gateway (WebSocket/Socket.IO), não pelas rotas REST abaixo, que cobrem o uplink em lote e consultas pontuais.

**Entidades**: `PosicaoGPS`.

| Método | Endpoint | Payload | Resposta | Erros possíveis |
|---|---|---|---|---|
| POST | `/gps/positions/batch` (Motorista, via Realtime Gateway) | `viagem_id`, lista de posições (lat, lng, timestamp, precisão, velocidade, direção) | 202 aceito (processamento assíncrono) | 409 sem viagem em andamento para este motorista; 422 posição geograficamente incoerente (Capítulo 19.3) sinalizada, não rejeitada |
| GET | `/gps/trips/:id/last-position` | — | última posição conhecida (lida do Redis) | 404 sem posição registrada ainda |
| GET | `/gps/trips/:id/trail` | query: janela de tempo | trilha histórica (da tabela particionada) | 403 fora do escopo do solicitante |
| — | *Canal WebSocket* `tenant/{id}/routes` e `parent/{id}/student/{id}` | assinatura autenticada por JWT | fluxo contínuo de posições/eventos (Dossiê 9, Seção 5.3) | fechamento da conexão em caso de token expirado/permissão inválida |

---

## 13. Notifications

**Responsabilidade**: preferências, histórico e disparo de comunicados em massa (o envio efetivo multicanal é orquestrado pelo Worker, Dossiê 14).

**Entidades**: `Notificacao`.

| Método | Endpoint | Payload | Resposta | Erros possíveis |
|---|---|---|---|---|
| GET | `/notifications/me` | query: paginação, lido/não lido | lista de notificações do usuário autenticado | — |
| PATCH | `/notifications/:id/read` | — | 204 | 403 notificação de outro usuário |
| GET | `/notifications/preferences` | — | preferências de canal por tipo de evento | — |
| PATCH | `/notifications/preferences` | canais habilitados por tipo de evento | atualizado | — |
| POST | `/notifications/broadcast` (Gestor/Empresa) | destinatários (`rota_id`/`escola_id`/todos), título, mensagem, canais | broadcast enfileirado | 422 nenhum destinatário resolvido |
| GET | `/notifications/broadcast/:id/status` | — | status agregado de entrega (enviados/entregues/falhos) | — |

---

## 14. Agenda

**Responsabilidade**: calendário unificado (feriados, recessos, eventos escolares, trocas pontuais, ausências planejadas, manutenções, vencimentos derivados).

**Entidades**: `EventoAgenda`.

| Método | Endpoint | Payload | Resposta | Erros possíveis |
|---|---|---|---|---|
| POST | `/agenda/events` (Gestor) | tipo, data/período, entidade relacionada, descrição | evento criado | 422 tipo `vencimento_*` não pode ser criado manualmente (é sempre derivado) |
| GET | `/agenda/events` | query: período, tipo | lista de eventos no período | — |
| PATCH | `/agenda/events/:id` (Gestor) | campos editáveis | atualizado | 403 evento gerado automaticamente (somente leitura) |
| DELETE | `/agenda/events/:id` (Gestor) | — | 204 | 403 idem |

---

## 15. Dashboard

**Responsabilidade**: agregação de leitura para a tela inicial do Gestor/Empresa — não possui entidade própria, é uma camada de consulta sobre os demais módulos.

| Método | Endpoint | Payload | Resposta | Erros possíveis |
|---|---|---|---|---|
| GET | `/dashboard/summary` | query: data (padrão hoje) | KPIs do dia (rotas ativas/total, pontualidade média, alertas abertos, documentos vencendo, receita estimada) | — |
| GET | `/dashboard/map` | — | snapshot das posições atuais de todos os veículos do tenant (carregamento inicial antes de conectar o WebSocket) | — |
| GET | `/dashboard/alerts` | query: tipo, resolvido/pendente | lista de alertas operacionais abertos | — |

---

## 16. Support

**Responsabilidade**: canal de suporte entre tenants e a equipe Rotta.

**Entidades**: `Ticket`, `MensagemTicket` (satélites, não detalhados no Dossiê 8 por serem de suporte operacional, não core do produto).

| Método | Endpoint | Payload | Resposta | Erros possíveis |
|---|---|---|---|---|
| POST | `/support/tickets` | assunto, descrição, categoria, `document_id` de anexo (opcional) | ticket criado | — |
| GET | `/support/tickets` | query: status | lista (do próprio tenant; todas para Admin Rotta) | — |
| GET | `/support/tickets/:id` | — | detalhe + mensagens | 403 ticket de outro tenant (exceto Admin Rotta) |
| POST | `/support/tickets/:id/messages` | mensagem | mensagem adicionada | 409 ticket já encerrado |
| PATCH | `/support/tickets/:id/status` (Admin Rotta) | novo status | atualizado | — |

---

## 17. Documents

**Responsabilidade**: repositório central de arquivos (upload, verificação, vencimento) referenciado de forma polimórfica por outros módulos.

**Entidades**: `Documento`.

| Método | Endpoint | Payload | Resposta | Erros possíveis |
|---|---|---|---|---|
| POST | `/documents/upload-url` | `entidade_tipo`, `entidade_id`, `tipo_documento` | `document_id` + URL pré-assinada de upload (curta expiração) | 403 sem permissão sobre a entidade informada |
| POST | `/documents/:id/confirm` | — | documento marcado como enviado, status `pendente_verificacao` | 409 upload não detectado no storage |
| GET | `/documents` | query: entidade, status, vencimento | lista paginada | — |
| GET | `/documents/:id` | — | detalhe + URL de download pré-assinada | 404 |
| POST | `/documents/:id/review` (Gestor) | aprovado (booleano), motivo de rejeição (se reprovado) | atualizado; recalcula status derivado de Motorista/Veículo (RN-29/30) | 409 documento já revisado |
| GET | `/documents/expiring` | query: janela em dias | lista de documentos vencendo naquela janela | — |

---

## 18. Reports

**Responsabilidade**: geração assíncrona de relatórios (processamento pesado delegado a job, Dossiê 14).

| Método | Endpoint | Payload | Resposta | Erros possíveis |
|---|---|---|---|---|
| POST | `/reports/generate` | tipo (pontualidade/frequência/ocorrências/frota), período, formato (PDF/planilha) | `job_id` (processamento assíncrono) | 422 período inválido (fim antes do início) |
| GET | `/reports/:jobId/status` | — | status (`processando`/`pronto`/`falhou`) + URL de download quando pronto | 404 job não encontrado/expirado |
| GET | `/reports/history` | query: tipo | lista de relatórios gerados anteriormente | — |

---

## 19. Settings

**Responsabilidade**: configurações do tenant e gestão de usuários/permissões (convite de novos Gestores, revogação de acesso).

| Método | Endpoint | Payload | Resposta | Erros possíveis |
|---|---|---|---|---|
| GET | `/settings` | — | configurações consolidadas do tenant | — |
| PATCH | `/settings` | campos de configuração | atualizado | — |
| GET | `/settings/roles` (Gestor/Empresa) | — | lista de usuários com papel/status no tenant | — |
| POST | `/settings/roles/invite` (Gestor/Empresa) | e-mail/telefone, papel | convite enviado | 409 já existe vínculo ativo |
| DELETE | `/settings/roles/:vinculoId` (Gestor/Empresa) | — | 204 (revoga acesso, todas as sessões daquele vínculo são invalidadas) | 403 tentativa de remover o único papel Empresa do tenant |

---

## 20. Audit

**Responsabilidade**: exposição de leitura do log de auditoria imutável (Capítulo 16 do Dossiê 8) — nunca aceita escrita/edição via API (o registro é gerado internamente por interceptors, nunca por chamada direta de cliente).

| Método | Endpoint | Payload | Resposta | Erros possíveis |
|---|---|---|---|---|
| GET | `/audit` (Gestor/Empresa/Admin) | query: entidade, período, usuário | lista paginada de `RegistroAuditoria` | — |
| GET | `/audit/:entidadeTipo/:entidadeId` | — | histórico cronológico completo daquela entidade específica | 404 |

---

## 21. Logs

**Responsabilidade**: consulta de logs técnicos estruturados (Capítulo 17 do Dossiê 8) — restrito ao Admin Rotta, ferramenta de investigação de suporte/incidentes.

| Método | Endpoint | Payload | Resposta | Erros possíveis |
|---|---|---|---|---|
| GET | `/admin/logs` (Admin Rotta) | query: `tenant_id`, tipo (acesso/aplicação/erro/segurança/integração), período, `correlation_id` | lista de entradas de log | — |
| GET | `/admin/logs/correlation/:id` (Admin Rotta) | — | todos os logs (de todas as camadas) daquela requisição/jornada específica | 404 |

---

## 22. Analytics

**Responsabilidade**: métricas agregadas de produto e infraestrutura, e visão de uso por tenant para suporte/customer success — camada de leitura sobre dado já existente, sem entidade própria de negócio (consome réplicas de leitura, Capítulo 21.6 do Dossiê 8).

| Método | Endpoint | Payload | Resposta | Erros possíveis |
|---|---|---|---|---|
| GET | `/analytics/product` (Admin Rotta) | query: período | métricas agregadas de ativação/retenção/uso por perfil | — |
| GET | `/analytics/infra` (Admin Rotta) | query: período | métricas agregadas de infraestrutura (latência, throughput, filas) | — |
| GET | `/analytics/company/:id` (Admin Rotta/Gestor do próprio tenant) | — | métricas de uso daquele tenant específico | 403 tenant de outra empresa (exceto Admin Rotta) |

---

## 23. Formato padrão de erro (contrato transversal a todos os módulos)

Toda resposta de erro, em qualquer módulo, segue a mesma forma: um código de status HTTP semanticamente correto (400/401/403/404/409/422/423/429/500/503), acompanhado de um corpo com **código de erro estável** (ex. `TRIP_ALREADY_IN_PROGRESS`, `DOCUMENT_EXPIRED`), **mensagem legível** (nunca stack trace ou detalhe de implementação), **campo relacionado** (quando o erro é de validação), e **id de correlação** da requisição (para o usuário reportar ao suporte e o time cruzar diretamente com os logs, Dossiê 12 §10.3). Este contrato único é o que permite ao app mobile e ao painel web tratar erros de forma consistente em um único lugar de código (um interceptor de erro genérico), em vez de tratamento ad-hoc por endpoint.
