# Especificação Funcional Oficial da Rotta — Parte 6: Documentos, Agenda, Suporte, Admin Rotta e Configurações

> Continuação da Parte 5 (`docs/19-...`). Códigos de funcionalidade: `DOC-*` (Documentos), `AGE-*` (Agenda), `SUP-*` (Suporte), `ADM-*` (Admin Rotta), `CFG-*` (Configurações).

---

## DOC-01 — Documento: CNH

**Objetivo**: gerenciar o ciclo de vida completo do documento de habilitação do motorista, do upload à expiração.

**Descrição**: esta entrada estabelece o **mecanismo genérico** de gestão documental (upload, revisão, status, alerta de vencimento) reutilizado por `DOC-02` a `DOC-05` — cada um referencia esta mecânica, especializando apenas o tipo de documento e suas regras específicas. Já detalhado operacionalmente em `DRV-02` (Parte 2); esta entrada consolida a visão do subsistema de Documentos como um todo (Dossiê 8 §16, Dossiê 13 Módulo `Documents`).

**Usuários envolvidos**: Motorista (upload), Gestor (revisão/aprovação).

**Pré-requisitos**: motorista cadastrado.

**Fluxo principal**:

1. Cliente solicita URL de upload pré-assinada ao backend, informando entidade/tipo de documento (Dossiê 12 §11).
2. Upload do arquivo diretamente ao armazenamento de objetos (S3).
3. Cliente confirma o upload ao backend; registro `Documento` criado com status `pendente_verificacao`.
4. Gestor revisa (visualiza o arquivo via URL de download pré-assinada) e aprova ou rejeita, com motivo obrigatório em caso de rejeição.
5. Status do Motorista é recalculado automaticamente (`RN-29`).

**Fluxos alternativos**: rejeição do documento — Motorista é notificado com o motivo e pode reenviar; OCR assistido (V2) sugere automaticamente data de validade extraída da imagem, reduzindo erro de digitação manual.

**Regras de negócio**: `RN-18` (bloqueio por CNH vencida); categoria mínima D exigida para status `aprovado` (Parte 2, `DRV-02`).

**Permissões**: upload por Motorista ou Gestor; aprovação exclusiva do Gestor/Empresa.

**Validações**: data de validade não pode estar no passado no momento do upload; formato de arquivo aceito (imagem ou PDF, tamanho máximo definido).

**Mensagens exibidas**: ver `DRV-02`.

**Casos excepcionais**: ver `CASO-15` (Parte 7).

**Critérios de aceite**: ver `DRV-02`.

**Possíveis melhorias futuras**: ver `DRV-02`.

---

## DOC-02 — Documento: EAR

**Objetivo/Descrição/Fluxo/Regras/Permissões/Validações/Mensagens/Casos excepcionais/Critérios de aceite/Melhorias futuras**: idênticos ao mecanismo genérico de `DOC-01`, especializado para o registro de Exerce Atividade Remunerada — detalhado operacionalmente em `DRV-03` (Parte 2), incluindo a possibilidade de desativação da exigência por configuração do tenant (`EMP-05`) em municípios onde não é obrigatório.

---

## DOC-03 — Documento: Cursos (obrigatórios e complementares)

**Objetivo**: gerenciar certificações de curso do motorista (direção defensiva, curso de transporte escolar) exigidas por regulação municipal ou por política do próprio tenant.

**Descrição**: detalhado operacionalmente em `DRV-05` (Parte 2) — diferente de CNH/EAR/Seguro/Vistoria, um motorista pode ter **múltiplos** cursos cadastrados simultaneamente (lista, não um único documento), cada um com sua própria validade.

**Usuários envolvidos, Pré-requisitos, Fluxo principal, Permissões, Validações, Mensagens, Casos excepcionais**: idênticos ao mecanismo genérico de `DOC-01`, com a distinção de que múltiplos registros do mesmo tipo podem coexistir (ex. dois cursos de direção defensiva feitos em anos diferentes — o mais recente é o relevante para o cálculo de vencimento, mas o histórico completo é preservado).

**Regras de negócio**: apenas o curso obrigatório configurado pelo tenant (`EMP-05`) impacta o status `aprovado` do motorista (`RN-29`); cursos complementares cadastrados são informativos, sem efeito bloqueante.

**Critérios de aceite**:

- **Dado** um tenant que exige curso de transporte escolar como obrigatório, **quando** um motorista está sem esse curso válido, **então** ele não atinge status `aprovado`, mesmo com CNH e EAR em dia.

**Possíveis melhorias futuras**: catálogo de cursos parceiros integrado diretamente à plataforma (V3), permitindo ao motorista realizar e certificar o curso sem sair do app.

---

## DOC-04 — Documento: Seguro do Veículo

**Objetivo/Descrição/Fluxo/Permissões/Validações/Mensagens/Casos excepcionais**: idênticos ao mecanismo genérico de `DOC-01`, aplicado à apólice de seguro do veículo (seguradora, número da apólice, vigência) — detalhado operacionalmente em `VEI-04` (Parte 2).

**Regras de negócio**: `RN-19` — veículo com seguro vencido é bloqueado de operar.

**Critérios de aceite**: ver `VEI-04` e `CASO-16` (Parte 7).

**Possíveis melhorias futuras**: alerta antecipado de renovação com sugestão de seguradoras parceiras (V3, parceria comercial).

---

## DOC-05 — Documento: Vistoria do Veículo

**Objetivo/Descrição/Fluxo/Permissões/Validações/Mensagens/Casos excepcionais**: idênticos ao mecanismo genérico de `DOC-01`, aplicado ao laudo de vistoria (municipal/estadual, conforme regulação local de transporte escolar) — detalhado operacionalmente em `VEI-04` (Parte 2).

**Regras de negócio**: `RN-19`, análoga a `DOC-04`.

**Critérios de aceite**: ver `VEI-04`.

**Possíveis melhorias futuras**: integração com o órgão de vistoria municipal, quando disponível via API pública, para validação automática sem necessidade de upload manual (V3).

---

## AGE-01 — Feriados

**Objetivo**: registrar datas em que nenhuma rota deve ser considerada esperada, mesmo que configurada para operar naquele dia da semana.

**Usuários envolvidos**: Gestor.

**Pré-requisitos**: nenhum.

**Fluxo principal**:

1. Gestor acessa Agenda → "+ Novo evento" → tipo "Feriado".
2. Informa data e descrição (ex. "Feriado municipal").
3. Sistema cria o `EventoAgenda`; a partir dessa data, o dashboard e os apps não exibem as rotas daquele dia como "pendentes/atrasadas", e nenhuma notificação de "rota não iniciada" é disparada.

**Fluxos alternativos**: cadastro de feriados recorrentes anuais (ex. Natal) — Gestor pode marcar como recorrente, e o sistema gera automaticamente a entrada do próximo ano (com opção de revisão antes de confirmar, dado que feriados móveis como Carnaval mudam de data).

**Regras de negócio**: um feriado não desativa a rota estruturalmente (`ROT-04` continua valendo para os demais dias) — apenas suprime a expectativa operacional daquele dia específico.

**Permissões**: exclusivo de Gestor/Empresa.

**Validações**: data não pode ser retroativa além de um limite curto (ex. não é possível cadastrar um "feriado" para uma data já passada há meses, que serviria apenas para mascarar uma ausência de operação real não reportada).

**Mensagens exibidas**: "Feriado cadastrado. Nenhuma rota será cobrada como pendente nesta data."

**Casos excepcionais**: feriado cadastrado por engano em uma data errada, com motoristas já sendo instruídos a não rodar — Gestor pode excluir/corrigir a qualquer momento antes da data chegar; se corrigido no mesmo dia (feriado removido de última hora), o sistema volta a tratar a rota como esperada normalmente, sem necessidade de nenhuma ação adicional.

**Critérios de aceite**:

- **Dado** uma rota configurada para segunda a sexta, **quando** uma segunda-feira é marcada como feriado, **então** o dashboard não exibe essa rota como "não iniciada/atrasada" naquele dia.

**Possíveis melhorias futuras**: importação automática do calendário oficial de feriados nacionais/municipais por localização do tenant.

---

## AGE-02 — Eventos Escolares

**Objetivo**: registrar eventos que alteram o padrão normal de operação de uma rota (ex. passeio escolar, horário alterado por reunião de pais).

**Usuários envolvidos**: Gestor.

**Pré-requisitos**: rota existente.

**Fluxo principal**: análogo a `AGE-01`, tipo "Evento escolar", vinculado a uma rota/escola específica e com opção de horário alterado para aquele dia (em vez de suprimir a expectativa, como no feriado, ajusta-a).

**Fluxos alternativos**: evento que afeta apenas parte dos alunos de uma rota (ex. só uma turma tem passeio) — Gestor pode registrar o evento apenas para os alunos específicos afetados, que aparecem no checklist do motorista já sinalizados como "ausência avisada" naquele dia.

**Regras de negócio**: evento escolar com horário alterado gera uma versão temporária da expectativa de horário daquele dia, sem alterar permanentemente a configuração da rota (`ROT-02`).

**Permissões**: Gestor.

**Validações**: data/horário informados devem ser coerentes (horário de fim após início).

**Mensagens exibidas**: "Evento registrado. O horário desta rota será ajustado apenas para o dia informado."

**Casos excepcionais**: nenhum além do já coberto.

**Critérios de aceite**:

- **Dado** um evento escolar com horário alterado para uma data específica, **quando** essa data chega, **então** o app do motorista exibe o horário ajustado apenas para aquele dia.

**Possíveis melhorias futuras**: notificação automática aos responsáveis avisando sobre o horário alterado, disparada alguns dias antes do evento.

---

## AGE-03 — Ausências (planejadas)

**Objetivo**: consolidar na agenda tanto as ausências de alunos avisadas pelos responsáveis (`STU-absence`) quanto ausências planejadas de motoristas/monitores (ex. férias, licença).

**Usuários envolvidos**: Gestor (visualização consolidada), Responsável (origem da ausência de aluno), Motorista/Monitor (origem da própria ausência planejada, sujeita a aprovação do Gestor).

**Pré-requisitos**: nenhum.

**Fluxo principal (ausência de motorista)**:

1. Motorista solicita um período de ausência planejada (ex. férias) através do app.
2. Gestor recebe a solicitação e providencia substituto (`ROT-05`) para o período, antes da data de início.
3. Sistema registra o `EventoAgenda` do tipo `ausencia_planejada`.

**Fluxos alternativos**: ausência de motorista sem substituto providenciado a tempo — sistema alerta o Gestor com destaque crescente de urgência à medida que a data se aproxima sem resolução.

**Regras de negócio**: ausência de aluno segue as regras já definidas em `STU-absence`/`RN-14`; ausência de motorista nunca desativa a rota automaticamente — sempre exige ação explícita do Gestor de providenciar substituto ou pausar a rota deliberadamente.

**Permissões**: Motorista/Monitor solicitam a própria ausência; Gestor aprova/organiza a substituição; Responsável registra apenas a ausência do próprio filho.

**Validações**: datas coerentes; ausência de motorista não pode ser retroativa.

**Mensagens exibidas**: "Sua ausência foi registrada e enviada ao gestor para providenciar substituição."; alerta ao Gestor — "[Motorista] estará ausente a partir de [data] e ainda não há substituto definido."

**Casos excepcionais**: nenhum além do já coberto.

**Critérios de aceite**:

- **Dado** uma ausência planejada de motorista cadastrada com 10 dias de antecedência, **quando** a data se aproxima sem substituto definido, **então** o Gestor recebe alertas crescentes de urgência.

**Possíveis melhorias futuras**: sugestão automática de substituto disponível no período (V3, Analytics).

---

## AGE-04 — Troca de Motorista (na Agenda)

**Objetivo**: refletir, na visão de calendário, toda substituição de motorista programada ou já ocorrida.

**Descrição**: não é uma ação própria — é a projeção, na Agenda, do evento `motorista.trocado` já coberto integralmente em `ROT-05` (Parte 4). Esta entrada existe para atender à necessidade explícita de visão consolidada de calendário solicitada nesta especificação.

**Critérios de aceite**: ver `ROT-05`.

**Possíveis melhorias futuras**: ver `ROT-05`.

---

## AGE-05 — Troca de Veículo (na Agenda)

**Objetivo/Descrição**: idem a `AGE-04`, projetando o evento `veiculo.trocado`, já coberto integralmente em `ROT-06` (Parte 4).

**Critérios de aceite**: ver `ROT-06`.

**Possíveis melhorias futuras**: ver `ROT-06`.

---

## SUP-01 — Tickets de Suporte

**Objetivo**: permitir que qualquer tenant reporte um problema ou dúvida diretamente à equipe Rotta, com rastreamento formal.

**Usuários envolvidos**: Empresa, Gestor (abertura); Admin Rotta (atendimento).

**Pré-requisitos**: conta ativa.

**Fluxo principal**:

1. Usuário acessa "Suporte" → "+ Novo chamado".
2. Informa assunto, descrição, categoria (dúvida/problema técnico/cobrança/outro), anexo opcional.
3. Sistema cria o ticket com status `aberto` e o disponibiliza à fila de atendimento do Admin Rotta.
4. Admin Rotta responde; usuário é notificado e pode continuar a conversa (`SUP-02`).
5. Ticket é encerrado quando resolvido, por qualquer uma das partes.

**Fluxos alternativos**: reabertura de um ticket encerrado, caso o problema reapareça, preservando o histórico da conversa original em vez de abrir um novo do zero.

**Regras de negócio**: um tenant só visualiza seus próprios tickets; Admin Rotta visualiza todos.

**Permissões**: Empresa/Gestor (próprio tenant); Admin Rotta (todos).

**Validações**: assunto e descrição obrigatórios; anexo com limite de tamanho.

**Mensagens exibidas**: "Chamado aberto. Nossa equipe responderá em breve."; "Chamado encerrado. Se o problema persistir, você pode reabri-lo."

**Casos excepcionais**: usuário abre múltiplos tickets duplicados para o mesmo problema — Admin Rotta pode mesclar/vincular tickets relacionados manualmente (funcionalidade administrativa, não exposta ao tenant).

**Critérios de aceite**:

- **Dado** um Gestor que abre um chamado, **quando** o Admin Rotta responde, **então** o Gestor recebe notificação e pode visualizar a resposta no histórico do ticket.

**Possíveis melhorias futuras**: categorização automática por IA para triagem inicial mais rápida (V3).

---

## SUP-02 — Chat de Suporte

**Objetivo**: permitir troca de mensagens dentro de um ticket já aberto, de forma assíncrona (não é um chat ao vivo com SLA de resposta imediata no MVP).

**Descrição**: mecanismo de mensagens dentro de `SUP-01` — "Chat" aqui denota a experiência de conversa contínua, não necessariamente tempo real síncrono (V2 pode evoluir para chat ao vivo com agente disponível em horário comercial).

**Usuários envolvidos**: Empresa/Gestor, Admin Rotta.

**Pré-requisitos**: ticket aberto.

**Fluxo principal**: qualquer uma das partes adiciona uma mensagem ao ticket; a outra parte é notificada (push/e-mail conforme preferência).

**Fluxos alternativos**: anexos adicionais durante a conversa (ex. print de tela de um erro).

**Regras de negócio**: mensagens em um ticket já encerrado exigem reabertura automática do ticket (não é possível "conversar" em um ticket fechado sem reabri-lo formalmente).

**Permissões**: apenas as partes do próprio ticket.

**Validações**: mensagem não pode ser vazia.

**Mensagens exibidas**: "Nova mensagem no seu chamado [assunto]."

**Casos excepcionais**: nenhum além do já coberto.

**Critérios de aceite**:

- **Dado** um ticket aberto, **quando** o Admin Rotta envia uma mensagem, **então** o Gestor é notificado e a mensagem aparece na conversa em ordem cronológica.

**Possíveis melhorias futuras**: chat ao vivo com indicador de "digitando..." e SLA de resposta em horário comercial (V2).

---

## SUP-03 — Histórico de Suporte

**Objetivo**: permitir consulta a todos os tickets (abertos e encerrados) de um tenant, para referência futura.

**Usuários envolvidos**: Empresa, Gestor, Admin Rotta.

**Pré-requisitos**: ao menos um ticket criado.

**Fluxo principal**: lista de tickets com filtro por status/período/categoria.

**Fluxos alternativos**: nenhum.

**Regras de negócio**: histórico nunca é excluído (mesmo tickets antigos e encerrados permanecem consultáveis, dentro da política de retenção geral de dados administrativos).

**Permissões**: idênticas a `SUP-01`.

**Validações**: nenhuma.

**Mensagens exibidas**: estado vazio — "Nenhum chamado registrado ainda."

**Casos excepcionais**: nenhum.

**Critérios de aceite**:

- **Dado** 5 tickets encerrados ao longo do ano, **quando** o Gestor consulta o histórico, **então** todos os 5 permanecem visíveis e consultáveis.

**Possíveis melhorias futuras**: nenhuma identificada.

---

## ADM-01 — Clientes (Admin Rotta)

**Objetivo**: dar à equipe Rotta visão e controle administrativo sobre todos os tenants da plataforma.

**Usuários envolvidos**: Admin Rotta.

**Pré-requisitos**: papel Admin Rotta ativo.

**Fluxo principal**: ver Dossiê 11 §6.2 — busca/lista de tenants, ficha detalhada (dados cadastrais, status, uso, plano), botão de "Acessar como suporte" auditado.

**Fluxos alternativos**: suspensão manual de um tenant por violação de termos (`EMP-04`, A1).

**Regras de negócio**: `RN-10` — todo acesso do Admin Rotta a dado de um tenant gera log de auditoria imutável, inclusive leitura.

**Permissões**: exclusivo de Admin Rotta.

**Validações**: ação de "acessar como suporte" exige justificativa textual registrada antes de ser concedida.

**Mensagens exibidas**: confirmação obrigatória antes de "Acessar como suporte" — "Este acesso será registrado em log de auditoria com sua justificativa. Continuar?"

**Casos excepcionais**: nenhum além do já coberto.

**Critérios de aceite**:

- **Dado** um Admin Rotta acessando os dados de um tenant como suporte, **quando** essa ação ocorre, **então** um registro de auditoria é criado imediatamente com o motivo informado.

**Possíveis melhorias futuras**: score de saúde do tenant (combinação de uso, pontualidade, ocorrências) para priorização proativa de suporte (V3, Analytics).

---

## ADM-02 — Planos (Admin Rotta)

**Objetivo**: gerenciar a definição dos planos disponíveis na plataforma (único no MVP, múltiplos em V2+).

**Usuários envolvidos**: Admin Rotta.

**Pré-requisitos**: nenhum.

**Fluxo principal**: cadastro/edição da entidade `Plano` (nome, valor, funcionalidades incluídas) — no MVP, uma única entrada imutável (R$ 39,90/mês, RN-01); em V2+, suporte a múltiplos planos ativos simultaneamente.

**Fluxos alternativos**: nenhum no MVP.

**Regras de negócio**: alteração de valor de um plano já ativo nunca afeta tenants já assinantes retroativamente sem aviso prévio (mudança de preço exige comunicação e período de transição, por política comercial, não apenas técnica).

**Permissões**: exclusivo de Admin Rotta.

**Validações**: valor do plano deve ser positivo.

**Mensagens exibidas**: nenhuma específica no MVP (funcionalidade de baixa frequência de uso).

**Casos excepcionais**: nenhum relevante no MVP.

**Critérios de aceite**:

- **Dado** o plano único do MVP, **quando** consultado por qualquer tenant, **então** exibe corretamente o valor de R$ 39,90/mês.

**Possíveis melhorias futuras**: múltiplos planos com funcionalidades diferenciadas (V2+).

---

## ADM-03 — Financeiro (Admin Rotta)

**Objetivo**: visão consolidada da saúde financeira da própria Rotta (não do transportador) — MRR, novos tenants, cancelamentos, inadimplência agregada.

**Usuários envolvidos**: Admin Rotta.

**Pré-requisitos**: nenhum.

**Fluxo principal**: dashboard com métricas agregadas de receita recorrente, churn, inadimplência — nunca exibindo dado de cartão bruto de nenhum tenant (apenas status de cobrança via gateway).

**Fluxos alternativos**: exportação dos dados financeiros para uso externo (contabilidade).

**Regras de negócio**: nenhum dado de meio de pagamento bruto é armazenado ou exibido em nenhuma tela da Rotta, em nenhuma circunstância (tokenização pelo gateway, Dossiê 8 §3.1).

**Permissões**: exclusivo de Admin Rotta.

**Validações**: nenhuma.

**Mensagens exibidas**: nenhuma específica.

**Casos excepcionais**: nenhum.

**Critérios de aceite**:

- **Dado** 500 tenants ativos pagantes, **quando** o Admin Rotta consulta o MRR, **então** o valor exibido corresponde exatamente à soma das assinaturas ativas naquele momento.

**Possíveis melhorias futuras**: projeção de receita futura baseada em tendência de crescimento/churn histórico.

---

## ADM-04 — Suporte (Admin Rotta)

**Objetivo**: interface de atendimento aos tickets de todos os tenants.

**Descrição**: é a visão administrativa de `SUP-01`/`SUP-02`, sem regras adicionais além do escopo cross-tenant já descrito em `ADM-01`.

**Critérios de aceite**: ver `SUP-01`.

**Possíveis melhorias futuras**: ver `SUP-01`/`SUP-02`.

---

## ADM-05 — Logs (Admin Rotta)

**Objetivo**: ferramenta de investigação técnica sobre logs estruturados de toda a plataforma.

**Descrição**: detalhado no Dossiê 12 §10.3 e Dossiê 13 (Módulo `Logs`) — consulta por tenant, tipo, período, id de correlação.

**Usuários envolvidos**: Admin Rotta.

**Pré-requisitos**: papel Admin Rotta.

**Fluxo principal**: busca de logs por filtro, reconstituição de uma jornada completa a partir de um id de correlação.

**Regras de negócio**: nenhum dado sensível bruto (senha, token, localização exata fora de contexto de auditoria apropriado) aparece em nenhum log (Dossiê 12 §10.3).

**Permissões**: exclusivo de Admin Rotta.

**Critérios de aceite**:

- **Dado** um chamado de suporte reportando falha de notificação, **quando** o Admin Rotta busca pelo id de correlação daquele evento, **então** vê toda a jornada técnica (evento → notificação → tentativas → resultado) sem precisar acessar múltiplos sistemas separadamente.

**Possíveis melhorias futuras**: alertas automáticos vinculados diretamente a um chamado de suporte relacionado.

---

## ADM-06 — Métricas (Admin Rotta)

**Objetivo**: dashboards agregados de produto e infraestrutura para a equipe Rotta.

**Descrição**: detalhado no Dossiê 12 §10.2 e Dossiê 13 (Módulo `Analytics`) — ativação, retenção, uso por perfil, latência, throughput, saúde de filas.

**Critérios de aceite**:

- **Dado** um pico de tráfego de GPS em uma janela operacional, **quando** o Admin Rotta consulta as métricas de infraestrutura, **então** vê a latência e o throughput daquele período refletidos corretamente.

**Possíveis melhorias futuras**: alertas automáticos configuráveis diretamente a partir do painel de métricas, sem depender de configuração externa ao produto.

---

## CFG-01 — Configurações da Empresa

**Objetivo/Descrição**: consolidação das telas de `EMP-02` (edição cadastral) e `EMP-05` (configurações operacionais) sob o menu único "Configurações → Empresa", conforme a estrutura de navegação do Dossiê 10 §11.2.

**Critérios de aceite**: ver `EMP-02`/`EMP-05`.

**Possíveis melhorias futuras**: ver `EMP-02`/`EMP-05`.

---

## CFG-02 — Configurações de Perfil (pessoal)

**Objetivo**: permitir que qualquer usuário gerencie seus próprios dados pessoais, independentemente do papel.

**Usuários envolvidos**: todos os papéis.

**Pré-requisitos**: conta ativa.

**Fluxo principal**: ver `AUTH` (Parte 1) e as seções de Perfil específicas de cada app (Dossiê 11 §3.6/4.6) — nome, foto, dados de contato, tema (dark/light), idioma (reservado a expansão futura).

**Regras de negócio**: campos editáveis variam por papel (ex. Motorista não edita CNH aqui — isso é `DOC-01`; apenas dados pessoais básicos).

**Permissões**: cada usuário sobre os próprios dados.

**Critérios de aceite**:

- **Dado** um usuário autenticado, **quando** ele altera o tema para claro, **então** a preferência é salva e persiste entre sessões e dispositivos (associada à conta, não ao aparelho).

**Possíveis melhorias futuras**: preferência de idioma, quando a plataforma suportar múltiplos idiomas (expansão internacional hipotética, fora do roadmap atual).

---

## CFG-03 — Configurações de Usuário (papéis e permissões)

**Objetivo**: permitir que Gestor/Empresa gerenciem quais pessoas têm acesso ao painel administrativo e com qual papel.

**Descrição**: consolidação de `SETT-roles`/`SETT-invite` (Dossiê 13, Módulo `Settings`).

**Usuários envolvidos**: Gestor, Empresa.

**Fluxo principal**: convite de novo Gestor, listagem de usuários com papel/status, revogação de acesso.

**Regras de negócio**: não é possível remover o único papel Empresa de um tenant (garantia de que todo tenant sempre tem um titular de conta).

**Permissões**: exclusivo de Gestor/Empresa.

**Critérios de aceite**:

- **Dado** um tenant com um único usuário de papel Empresa, **quando** alguém tenta revogar esse vínculo, **então** o sistema recusa a ação.

**Possíveis melhorias futuras**: papéis administrativos com granularidade adicional dentro do próprio Gestor (ex. "Gestor financeiro" vs. "Gestor operacional"), caso a demanda de tenants maiores justifique (V3).

---

## CFG-04 — Configurações de Notificações

**Objetivo**: permitir que cada usuário escolha seus canais preferidos por tipo de evento.

**Descrição**: consolidação de `NOTIF-preferences` (Dossiê 13, Módulo `Notifications`).

**Critérios de aceite**:

- **Dado** um responsável que desabilita SMS como canal, **quando** um evento não crítico ocorre, **então** o SMS nunca é utilizado para ele, apenas push/WhatsApp conforme disponível.
- **Dado** o mesmo responsável, **quando** um evento crítico (SOS) ocorre, **então** o SMS é utilizado de qualquer forma (`RN-17`), pois eventos críticos ignoram a preferência de canal desabilitado.

**Possíveis melhorias futuras**: configuração de "horário de silêncio" (não perturbe) para notificações não críticas em horários específicos.

---

## CFG-05 — Configurações de Privacidade

**Objetivo**: dar ao usuário controle e transparência sobre seus dados pessoais, em conformidade com a LGPD (Dossiê 4 §19.4, Dossiê 12 §7.3).

**Usuários envolvidos**: todos os papéis, com maior relevância para Responsável (dados do menor sob sua responsabilidade).

**Pré-requisitos**: conta ativa.

**Fluxo principal**:

1. Usuário acessa Configurações → Privacidade.
2. Visualiza um resumo de quais dados a Rotta mantém sobre ele/seu(s) filho(s).
3. Pode solicitar exportação de dados (recebe um arquivo consolidado) ou solicitar exclusão (`RN-24`).

**Fluxos alternativos**: solicitação de exclusão de dados de um aluno com vínculo de rota ativo — sistema informa que a exclusão será efetivada após o encerramento do vínculo ativo, preservando o histórico mínimo de retenção obrigatória, e mantém o solicitante informado do prazo.

**Regras de negócio**: `RN-24` (Capítulo 13) rege integralmente este fluxo.

**Permissões**: cada responsável legal, sobre os dados do(s) próprio(s) aluno(s); demais papéis, sobre os próprios dados pessoais.

**Validações**: solicitação de exclusão exige confirmação explícita adicional (ação irreversível).

**Mensagens exibidas**: "Sua solicitação de exclusão foi registrada. Ela será efetivada em até [prazo], respeitando os vínculos ativos e obrigações legais de retenção."

**Casos excepcionais**: solicitação de exclusão feita por um responsável que não é o responsável legal do aluno (ex. avó com acesso de acompanhamento apenas) — sistema recusa a ação, informando que apenas o responsável legal pode solicitar exclusão de dados do menor.

**Critérios de aceite**:

- **Dado** um responsável legal solicitando exclusão de dados do próprio filho sem vínculo de rota ativo, **quando** a solicitação é confirmada, **então** o processo de exclusão/anonimização é iniciado conforme o prazo de retenção aplicável.
- **Dado** um responsável sem a flag de responsável legal, **quando** ele tenta solicitar exclusão, **então** o sistema recusa a ação.

**Possíveis melhorias futuras**: painel de consentimentos granulares (ex. consentimento específico para reconhecimento facial, `EMB-04`, gerenciável e revogável nesta mesma tela).
