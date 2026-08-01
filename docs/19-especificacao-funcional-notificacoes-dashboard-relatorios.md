# Especificação Funcional Oficial da Rotta — Parte 5: Notificações, Dashboard e Relatórios

> Continuação da Parte 4 (`docs/18-...`). Códigos de funcionalidade: `NOTIF-*` (Notificações), `DASH-*` (Dashboard), `REL-*` (Relatórios).

---

## NOTIF-01 — Notificações Push

**Objetivo**: entregar avisos em tempo real diretamente ao dispositivo do usuário, mesmo com o app fechado.

**Descrição**: canal primário para a maioria dos eventos operacionais (embarque, desembarque, atraso), via Firebase (FCM/APNs, Dossiê 9 §2.7).

**Usuários envolvidos**: todos os papéis com app mobile (Motorista, Monitor, Responsável); Gestor/Empresa também recebem push no contexto do painel web quando aplicável (notificações do navegador, V2).

**Pré-requisitos**: permissão de notificação concedida pelo sistema operacional; app instalado e token de dispositivo registrado.

**Fluxo principal**: evento de domínio publicado → módulo de Notificações resolve destinatário/preferência → Worker envia via FCM/APNs → dispositivo exibe a notificação (fora do app) ou um banner interno discreto (com o app aberto, Dossiê 11 §8).

**Fluxos alternativos**: usuário nunca concedeu permissão de notificação — sistema explica o valor antes de solicitar novamente (nunca insiste de forma abusiva/repetida na mesma sessão) e, enquanto isso, o histórico de notificações (`NOTIF-history`) continua disponível dentro do app.

**Regras de negócio**: notificações de gravidade crítica (`RN-17`) ignoram a preferência de silenciar, mas nunca ignoram a ausência de permissão do sistema operacional (impossível tecnicamente) — nesse caso, o fallback para WhatsApp/SMS assume o papel principal.

**Permissões**: usuário só recebe push relativo ao próprio escopo de dados (RBAC).

**Validações**: token de dispositivo válido e não expirado (tokens inválidos são removidos automaticamente após falhas de envio consecutivas).

**Mensagens exibidas**: variam por tipo de evento (ver catálogo do Dossiê 14 §4.1); todas seguem o padrão de linguagem simples do Dossiê 10 §12 (Acessibilidade/linguagem simples).

**Casos excepcionais**: usuário com múltiplos dispositivos (trocou de celular sem desinstalar do antigo) — o sistema envia a todos os tokens ativos registrados, sem tentar adivinhar qual é o "principal".

**Critérios de aceite**:

- **Dado** um usuário com permissão de notificação concedida, **quando** um evento relevante ocorre, **então** ele recebe o push em até 10 segundos (Dossiê 4 §20.4).
- **Dado** um usuário sem permissão concedida, **quando** um evento crítico ocorre, **então** o sistema aciona automaticamente o fallback para WhatsApp/SMS.

**Possíveis melhorias futuras**: notificações ricas com ações rápidas embutidas (ex. "Avisar ausência" diretamente a partir da notificação, sem abrir o app).

---

## NOTIF-02 — Notificações via WhatsApp

**Objetivo**: alcançar famílias que preferem ou dependem do WhatsApp como canal principal de comunicação digital.

**Descrição**: via WhatsApp Cloud API (Dossiê 9 §2.7), com templates pré-aprovados pela Meta para cada tipo de evento (exigência da plataforma para mensagens iniciadas pela empresa).

**Usuários envolvidos**: Responsável (principal destinatário); demais papéis conforme preferência configurada.

**Pré-requisitos**: número de telefone válido e com WhatsApp ativo; templates de mensagem aprovados previamente junto à Meta.

**Fluxo principal**: idêntico a `NOTIF-01`, com o Worker usando o adapter de WhatsApp em vez de Firebase.

**Fluxos alternativos**: template não aprovado ainda para um novo tipo de evento — o sistema usa o canal de fallback seguinte (SMS) até a aprovação do template ser concluída; esta é uma restrição de processo (tempo de aprovação da Meta), não uma falha de sistema.

**Regras de negócio**: mensagens de WhatsApp iniciadas pela Rotta (fora da janela de 24h de conversa ativa) devem usar exclusivamente templates aprovados — nunca texto livre gerado dinamicamente fora desse formato, sob risco de bloqueio da conta comercial pela Meta.

**Permissões**: idênticas a `NOTIF-01`.

**Validações**: número de telefone deve estar em formato internacional válido.

**Mensagens exibidas**: conteúdo segue o template aprovado, com variáveis substituídas (nome do aluno, horário, etc.).

**Casos excepcionais**: número sem WhatsApp instalado — a tentativa de envio falha no provedor, e o sistema aciona o fallback para SMS automaticamente (Dossiê 14 §2.2).

**Critérios de aceite**:

- **Dado** um responsável com WhatsApp ativo, **quando** um evento de embarque ocorre, **então** ele recebe a mensagem via WhatsApp usando o template aprovado correspondente.
- **Dado** um número sem WhatsApp, **quando** o envio falha, **então** o sistema tenta o SMS automaticamente.

**Possíveis melhorias futuras**: canal de resposta bidirecional via WhatsApp (V2, Dossiê 3 §12.11) para dúvidas simples sem precisar abrir o app.

---

## NOTIF-03 — Notificações via SMS

**Objetivo**: garantir entrega mesmo para usuários sem smartphone/internet no momento, como canal de última instância.

**Usuários envolvidos**: qualquer papel, tipicamente como fallback de `NOTIF-01`/`NOTIF-02`.

**Pré-requisitos**: número de telefone válido.

**Fluxo principal**: idêntico a `NOTIF-01`/`02`, via adapter Twilio/Zenvia.

**Fluxos alternativos**: nenhum além do já coberto no fluxo de fallback geral (Dossiê 14 §2.2).

**Regras de negócio**: SMS é o último elo da cadeia de fallback (push → WhatsApp → SMS) para eventos não críticos; para eventos críticos, é disparado em paralelo desde o início (`RN-17`), nunca esperando os canais anteriores falharem primeiro.

**Permissões**: idênticas a `NOTIF-01`.

**Validações**: limite de caracteres do SMS respeitado (mensagens curtas e diretas, sem depender de formatação rica).

**Mensagens exibidas**: versão em texto puro, mais curta que a versão push/WhatsApp, mas contendo a informação essencial (ex. "Rotta: João embarcou às 07h12.").

**Casos excepcionais**: operadora com atraso de entrega de SMS (fora do controle da Rotta) — sistema marca como `enviado` mas não necessariamente `entregue` até confirmação da operadora, quando disponível.

**Critérios de aceite**:

- **Dado** uma falha dos canais push e WhatsApp, **quando** isso ocorre para um evento não crítico, **então** o SMS é tentado como última etapa do fallback.
- **Dado** um evento crítico, **quando** ocorre, **então** o SMS é disparado em paralelo aos demais canais, não em sequência.

**Possíveis melhorias futuras**: nenhuma identificada — canal deliberadamente simples e estável.

---

## NOTIF-04 — Notificações via E-mail

**Objetivo**: canal complementar para comunicados menos urgentes e para papéis institucionais (Gestor, Empresa, Escola) que preferem e-mail para assuntos administrativos.

**Usuários envolvidos**: todos os papéis, com maior relevância para Gestor/Empresa/Escola.

**Pré-requisitos**: e-mail válido e confirmado.

**Fluxo principal**: idêntico a `NOTIF-01`, para eventos tipicamente não tempo-sensíveis (ex. fatura mensal, relatório gerado, resumo semanal).

**Fluxos alternativos**: nenhum específico.

**Regras de negócio**: e-mail nunca é o único canal para eventos operacionais tempo-sensíveis (embarque/desembarque/atraso) — é reservado a comunicação administrativa e de conveniência (Dossiê 14 §2.2, retry mais longo/tolerante a atraso, coerente com a natureza menos urgente deste canal).

**Permissões**: idênticas a `NOTIF-01`.

**Validações**: formato de e-mail válido; verificação de e-mail confirmada antes do primeiro envio (evita enviar dado sensível a um e-mail digitado incorretamente).

**Mensagens exibidas**: versão com mais contexto/formatação que push/SMS, adequada ao canal (ex. fatura detalhada em anexo/link).

**Casos excepcionais**: e-mail retornado como inválido (bounce) — sistema marca o e-mail como suspeito e alerta o usuário a confirmar/corrigir na próxima vez que acessar o app.

**Critérios de aceite**:

- **Dado** o fechamento mensal de fatura, **quando** processado, **então** a Empresa recebe um e-mail com o resumo e link para a fatura detalhada.

**Possíveis melhorias futuras**: newsletter opcional de novidades do produto (opt-in explícito, nunca por padrão).

---

## DASH-01 — Indicadores (KPIs) do Dashboard

**Objetivo**: fornecer, em uma única visão, a resposta a "está tudo funcionando hoje?" para o Gestor.

**Descrição**: ver Dossiê 11 §2.1 para o wireframe completo.

**Usuários envolvidos**: Gestor, Empresa.

**Pré-requisitos**: tenant com ao menos uma rota configurada.

**Fluxo principal**: ao abrir o painel, sistema calcula e exibe: rotas ativas hoje (X/Y), pontualidade média, alertas abertos, documentos vencendo, receita estimada do mês (`DASH-03`).

**Fluxos alternativos**: seleção de data diferente de "hoje" para consulta retroativa dos mesmos indicadores.

**Regras de negócio**: indicadores são sempre escopados ao tenant do usuário autenticado (isolamento multi-tenant, `RN-07`).

**Permissões**: Gestor/Empresa do próprio tenant.

**Validações**: nenhuma além do escopo de tenant.

**Mensagens exibidas**: estado vazio (tenant novo, sem rotas ainda) — "Configure sua primeira rota para começar a ver indicadores aqui."

**Casos excepcionais**: tenant com centenas de rotas — os indicadores são pré-agregados (não calculados a cada requisição de forma ingênua) para manter a performance de carregamento do dashboard (Dossiê 8 §20.1, cache de contadores).

**Critérios de aceite**:

- **Dado** um tenant com 10 rotas configuradas, das quais 8 ativas hoje, **quando** o Gestor abre o dashboard, **então** vê "8/10" no indicador de rotas ativas.

**Possíveis melhorias futuras**: comparação automática com o mesmo dia da semana anterior, para contextualizar se o desempenho do dia está dentro do padrão.

---

## DASH-02 — Mapa do Dashboard

**Objetivo**: visão consolidada em tempo real de todos os veículos em rota do tenant.

**Usuários envolvidos**: Gestor, Empresa.

**Pré-requisitos**: ao menos uma viagem `em_andamento`.

**Fluxo principal**: ver Dossiê 11 §2.1 — mapa com marcadores coloridos por status, popup de detalhe ao clicar, atualização em tempo real via o mesmo canal Socket.IO do app.

**Fluxos alternativos**: nenhuma viagem em andamento no momento — mapa exibe estado vazio informativo, não um mapa em branco sem explicação ("Nenhuma rota em andamento no momento. Volte no horário das próximas viagens.").

**Regras de negócio**: Gestor vê todas as rotas do próprio tenant, nunca de outro (`RN-07`).

**Permissões**: Gestor/Empresa.

**Validações**: nenhuma.

**Mensagens exibidas**: ver acima.

**Casos excepcionais**: tenant com centenas de veículos simultâneos — o mapa aplica _clustering_ visual (agrupamento de marcadores próximos) para manter a legibilidade, expandindo ao dar zoom.

**Critérios de aceite**:

- **Dado** 5 viagens em andamento, **quando** o Gestor abre o mapa, **então** vê os 5 veículos posicionados corretamente, atualizando em tempo real.

**Possíveis melhorias futuras**: filtro do mapa por escola/região, útil para tenants com operação geograficamente dispersa.

---

## DASH-03 — Receita Estimada

**Objetivo**: dar ao Gestor visibilidade sobre a saúde financeira do próprio negócio de transporte (não a receita da Rotta).

**Descrição**: ver Dossiê 8 §15 — cálculo simples baseado no campo `valor_mensalidade` de cada aluno ativo, sempre rotulado como estimativa (`RN-34`).

**Usuários envolvidos**: Gestor, Empresa.

**Pré-requisitos**: ao menos um aluno com `valor_mensalidade` preenchido.

**Fluxo principal**: sistema soma `valor_mensalidade` de todos os alunos ativos → exibe como "Receita estimada do mês" no dashboard, com detalhamento acessível (lista de alunos que compõem o valor).

**Fluxos alternativos**: alunos sem `valor_mensalidade` preenchido — excluídos do cálculo, com um aviso discreto ("X alunos sem valor de mensalidade cadastrado — a estimativa pode estar incompleta").

**Regras de negócio**: `RN-34` — nunca apresentado como valor financeiro reconhecido/realizado.

**Permissões**: Gestor/Empresa.

**Validações**: `valor_mensalidade` deve ser um número positivo quando preenchido.

**Mensagens exibidas**: "Receita estimada: R$ [valor] (baseado em [X] de [Y] alunos com valor cadastrado)."

**Casos excepcionais**: nenhum além do já coberto.

**Critérios de aceite**:

- **Dado** 20 alunos ativos, 15 com valor de mensalidade cadastrado, **quando** o Gestor consulta a receita estimada, **então** vê a soma dos 15 valores, com aviso sobre os 5 alunos sem valor.

**Possíveis melhorias futuras**: reconciliação com cobrança real, quando o módulo financeiro completo (V2, Dossiê 3 §12.16) existir.

---

## DASH-04 — Viagens (no Dashboard)

**Objetivo**: listar as viagens do dia com status operacional, permitindo ação rápida sobre qualquer uma.

**Usuários envolvidos**: Gestor, Empresa.

**Pré-requisitos**: rotas configuradas.

**Fluxo principal**: ver Dossiê 11 §2.1 — tabela de rotas do dia com status, horário previsto/real, ações rápidas (ver no mapa, contatar motorista).

**Fluxos alternativos**: filtro por turno/status.

**Regras de negócio**: nenhuma regra própria — é uma visão de leitura sobre `Viagem` (Parte 4).

**Permissões**: Gestor/Empresa.

**Validações**: nenhuma.

**Mensagens exibidas**: estado vazio — "Nenhuma viagem programada para hoje."

**Casos excepcionais**: nenhum além dos já cobertos em `GPS-*`/`TRIP-*`.

**Critérios de aceite**:

- **Dado** 3 viagens em andamento e 2 concluídas hoje, **quando** o Gestor consulta a lista, **então** vê os status corretos de cada uma, atualizados em tempo real.

**Possíveis melhorias futuras**: nenhuma além das já cobertas.

---

## DASH-05 — Motoristas (no Dashboard)

**Objetivo**: visão rápida do status de documentação e disponibilidade de todos os motoristas.

**Usuários envolvidos**: Gestor, Empresa.

**Fluxo principal**: ver Dossiê 11 §2.2 — lista/cards com foto, status de documentação, rotas atribuídas.

**Demais campos**: idênticos em estrutura aos já detalhados em `DRV-*` (Parte 2) — esta entrada é a superfície de leitura consolidada, não uma nova regra de negócio.

**Critérios de aceite**:

- **Dado** um motorista com CNH vencendo em 5 dias, **quando** o Gestor consulta a lista, **então** o item aparece com badge de alerta âmbar.

**Possíveis melhorias futuras**: ordenação por "mais urgente primeiro" (documento vencendo antes) como padrão.

---

## DASH-06 — Veículos (no Dashboard)

**Objetivo**: visão rápida do status de documentação e utilização de todos os veículos.

**Descrição**: análoga a `DASH-05`, aplicada a `VEI-*` (Parte 2).

**Critérios de aceite**:

- **Dado** um veículo com seguro vencido, **quando** o Gestor consulta a lista, **então** o item aparece com badge vermelho de bloqueio.

**Possíveis melhorias futuras**: nenhuma além das já cobertas em `VEI-*`.

---

## DASH-07 — Alunos (no Dashboard)

**Objetivo**: visão rápida da base de alunos com status e vínculo de rota.

**Descrição**: análoga a `DASH-05`/`06`, aplicada a `STU-*` (Parte 3), com ação em massa disponível (ex. selecionar vários para enviar comunicado, `NOTIF-broadcast`).

**Critérios de aceite**:

- **Dado** 200 alunos cadastrados, **quando** o Gestor filtra por escola, **então** vê apenas os alunos daquela escola, com paginação eficiente mesmo em bases grandes (`CASO-21`, Parte 7).

**Possíveis melhorias futuras**: busca por nome com resultado instantâneo (sem necessidade de submeter um formulário de busca).

---

## REL-01 — Relatório de Motoristas

**Objetivo**: gerar um relatório consolidado sobre a frota de motoristas — documentação, pontualidade, ocorrências associadas.

**Usuários envolvidos**: Gestor, Empresa.

**Pré-requisitos**: ao menos um motorista cadastrado.

**Fluxo principal**: Gestor seleciona tipo "Motoristas", período, formato (PDF/planilha) → sistema processa de forma assíncrona (`REP-generate`, Dossiê 13) → disponibiliza para download.

**Fluxos alternativos**: filtro por motorista específico, ou por status de documentação.

**Regras de negócio**: gerado sempre contra réplica de leitura (Dossiê 8 §21.6), nunca impactando a performance operacional do banco primário.

**Permissões**: Gestor/Empresa.

**Validações**: período com data final não anterior à inicial.

**Mensagens exibidas**: "Relatório em processamento. Você será notificado quando estiver pronto."; "Relatório pronto para download."

**Casos excepcionais**: tenant com centenas de motoristas — geração é paginada internamente e pode levar minutos; usuário não fica bloqueado esperando (recebe notificação ao concluir, Dossiê 13, `Reports`).

**Critérios de aceite**:

- **Dado** um período de 30 dias e 50 motoristas, **quando** o relatório é solicitado, **então** o sistema processa de forma assíncrona e notifica o Gestor ao concluir.

**Possíveis melhorias futuras**: agendamento de relatórios recorrentes (ex. enviar todo dia 1º do mês automaticamente por e-mail).

---

## REL-02 — Relatório de Alunos

**Objetivo**: consolidar dados de frequência, ausências e histórico de embarque/desembarque por aluno.

**Descrição**: análogo a `REL-01`, aplicado à base de alunos — insumo direto para a jornada da persona "Diego" (Capítulo 5.3, Dossiê 1) prestar contas a uma escola parceira.

**Critérios de aceite**:

- **Dado** um período mensal, **quando** o relatório de frequência é gerado, **então** exibe corretamente o número de dias com embarque confirmado por aluno, incluindo ausências (avisadas e não avisadas) discriminadas.

**Possíveis melhorias futuras**: exportação em formato compatível para prestação de contas formal a secretarias de educação (V3, Capítulo 24).

---

## REL-03 — Relatório de Rotas

**Objetivo**: consolidar indicadores operacionais por rota — pontualidade média, número de alunos, ocorrências.

**Critérios de aceite**:

- **Dado** uma rota com 20 dias de operação no período, **quando** o relatório é gerado, **então** exibe a pontualidade média corretamente calculada (comparação horário previsto vs. real por dia).

**Possíveis melhorias futuras**: comparação entre rotas do mesmo tenant, para identificar as de pior desempenho.

---

## REL-04 — Relatório de GPS

**Objetivo**: permitir a exportação do trajeto detalhado de uma ou mais viagens específicas, tipicamente para investigação de uma reclamação ou incidente.

**Descrição**: consulta sempre contra réplica de leitura (Dossiê 8 §21.6); tempo de geração proporcional ao volume de pontos do período selecionado — janelas muito amplas (ex. "todo o histórico do ano") são desencorajadas na UI com um aviso de tempo estimado de processamento maior.

**Critérios de aceite**:

- **Dado** uma viagem específica, **quando** o relatório de GPS é solicitado, **então** o trajeto completo (todos os pontos registrados) é exportado corretamente, na ordem cronológica real.

**Possíveis melhorias futuras**: visualização do trajeto exportado diretamente sobreposta ao mapa dentro do próprio relatório (não apenas dados tabulares).

---

## REL-05 — Relatório de Viagens

**Objetivo**: consolidar o histórico de viagens realizadas — duração, pontualidade, ocorrências, veículo/motorista.

**Descrição**: é a versão "achatada"/tabular do que já é navegável individualmente em `STU-08`/`VEI-05`/histórico do motorista — útil para análise em planilha fora da plataforma.

**Critérios de aceite**:

- **Dado** um mês de operação com 200 viagens, **quando** o relatório é gerado em formato planilha, **então** cada linha representa uma viagem com todos os campos relevantes corretamente preenchidos.

**Possíveis melhorias futuras**: nenhuma além das já cobertas.

---

## REL-06 — Relatório de Documentos

**Objetivo**: consolidar o status de conformidade documental de toda a frota (motoristas e veículos) em um único relatório, para prestação de contas ou auditoria interna.

**Descrição**: é a exportação formal da mesma visão de `DOC-expiring` (Parte 6), organizada para arquivamento/prestação de contas.

**Critérios de aceite**:

- **Dado** um tenant com 30 motoristas e 20 veículos, **quando** o relatório de documentos é gerado, **então** lista o status (aprovado/vencendo/vencido) de cada documento obrigatório de cada entidade.

**Possíveis melhorias futuras**: geração automática mensal enviada por e-mail ao Gestor como lembrete recorrente de conformidade.
