# Dossiê 2 — Fluxos e Jornadas (Capítulos 6–11)

---

## Capítulo 6. Fluxo completo do sistema

### 6.1 Visão macro (do zero até a viagem em andamento)

```
1. AQUISIÇÃO
   Empresa/motorista descobre a Rotta (marketing, indicação, busca)
        │
2. ONBOARDING DO TENANT
   Cadastro da Empresa → escolha de plano → pagamento (R$39,90/mês) → conta ativa
        │
3. CONFIGURAÇÃO INICIAL
   Cadastro de: Veículos → Motoristas → Monitores → Escolas parceiras
        │
4. CADASTRO DA BASE DE ALUNOS
   Cadastro de Alunos → vínculo com Responsáveis → vínculo com Escola
        │
5. MODELAGEM DE ROTAS
   Criação de Rotas (pontos de embarque/desembarque, horários, ordem de paradas)
   Vínculo de Alunos às Rotas → vínculo de Motorista/Monitor/Veículo à Rota
        │
6. CONVITE E ATIVAÇÃO DOS DEMAIS PERFIS
   Responsável recebe convite (SMS/WhatsApp/link) → baixa o app → aceita vínculo com o(s) filho(s)
   Motorista/Monitor recebem convite → baixam o app → completam cadastro (CNH, documentos)
   Escola recebe convite → acessa portal web
        │
7. OPERAÇÃO DIÁRIA (o "loop" central do produto)
   Motorista abre o app → inicia rota → GPS ativo → chega ao ponto → checklist de embarque
   → notificação automática ao responsável → viagem em andamento → chegada à escola
   → checklist de desembarque → notificação → fim da rota da manhã
   (repete no período da tarde/volta)
        │
8. PÓS-OPERAÇÃO
   Histórico de viagem gravado → disponível para responsável, gestor e (se aplicável) escola
   Ocorrências registradas → notificação a quem for relevante
        │
9. GESTÃO CONTÍNUA
   Gestor acompanha dashboard → recebe alertas (documento vencendo, atraso recorrente)
   Cobrança mensal recorrente da empresa processada automaticamente
```

### 6.2 Os dois "motores" do sistema

O sistema tem dois motores operacionais que rodam em paralelo e se cruzam apenas nos pontos de notificação:

1. **Motor de cadastro/gestão** (baixa frequência, alta importância estrutural): empresas, veículos, motoristas, alunos, responsáveis, escolas, rotas. É o "banco de dados vivo" da operação — muda pouco no dia a dia, mas tudo depende dele estar correto.
2. **Motor de operação em tempo real** (altíssima frequência, efêmero por natureza): posição GPS, eventos de checklist, notificações. É o que gera valor percebido a cada viagem, mas depende inteiramente da qualidade do motor de cadastro (uma rota mal configurada gera uma operação confusa, não importa quão boa seja a tecnologia de GPS).

Esta separação é o principal motivador da arquitetura em módulos descrita no Capítulo 14: o motor de cadastro é um domínio CRUD clássico (consistência forte, baixo volume, baixa latência tolerável), enquanto o motor de tempo real é um domínio de *streaming*/eventos (alta frequência, latência crítica, consistência eventual aceitável).

### 6.3 Diagrama de estados de uma viagem (rota em execução)

```
[Rota agendada] 
      │  (motorista aperta "iniciar rota")
      ▼
[Rota em andamento] ──(chega ao ponto de embarque)──▶ [Aguardando checklist de embarque]
      │                                                        │ (checklist concluído)
      │                                                        ▼
      │                                          [Notificação enviada aos responsáveis]
      │                                                        │
      ◀────────────────────────────────────────────────────────┘
      │ (chega à escola / próximo ponto)
      ▼
[Aguardando checklist de desembarque] ──(concluído)──▶ [Notificação enviada]
      │
      ▼
[Rota finalizada] ──▶ [Histórico da viagem consolidado e disponível]
```

Estados de exceção que o sistema precisa suportar em qualquer ponto do fluxo: **atraso** (comparação automática entre horário previsto e horário real, gatilho de notificação proativa), **ocorrência** (registro manual pelo motorista/monitor: pane, acidente leve, aluno ausente não justificado), **cancelamento de rota** (feriado, imprevisto) e **modo offline** (GPS/checklist continuam sendo registrados localmente no aparelho e sincronizados quando a conexão voltar).

---

## Capítulo 7. Fluxo de cada usuário

Esta seção resume, por perfil, o que cada ator faz no sistema — a jornada detalhada de cada um está nos Capítulos 8–11.

### 7.1 Administrador Rotta (equipe interna)
Acesso cross-tenant restrito. Gerencia: saúde da plataforma, tenants (ativação/suspensão/cobrança), suporte a incidentes, configuração de planos, moderação de conteúdo (ex.: documentos suspeitos), auditoria de segurança.

### 7.2 Empresa (conta-mãe do tenant)
O "dono" da assinatura. Cadastra a organização, define o(s) Gestor(es), assina o plano, acompanha faturamento. Em empresas pequenas, o dono costuma acumular o papel de Gestor.

### 7.3 Gestor
Opera o dia a dia administrativo: cadastra motoristas, veículos, alunos, responsáveis, escolas e rotas; acompanha o dashboard operacional; recebe e trata alertas; gera relatórios; gerencia documentos e vencimentos.

### 7.4 Motorista
Perfil de campo. Faz login no app mobile, visualiza a rota do dia, inicia a viagem, faz o checklist de embarque/desembarque, comunica ocorrências, mantém seus documentos atualizados.

### 7.5 Monitor
Perfil de campo, auxiliar do motorista. Mesma superfície de checklist que o motorista (podem operar de forma independente ou colaborativa na mesma viagem), mas sem permissão de dirigir/iniciar rota (o início da rota é sempre disparado pelo motorista, por ser o responsável legal pelo veículo).

### 7.6 Responsável
Perfil "consumidor" do produto, 100% mobile, gratuito. Visualiza localização em tempo real do veículo do(s) filho(s), recebe notificações de embarque/desembarque/atraso, acessa histórico de viagens, gerencia dados de contato e autorizações (ex.: quem mais pode buscar a criança).

### 7.7 Escola
Perfil "espectador informado". Acesso via portal web, visão somente leitura sobre quais alunos da escola estão em rota, horários previstos, e ocorrências relevantes. Não interfere na operação (a escola não é dona da rota, o transportador é).

---

## Capítulo 8. Jornada do responsável

### 8.1 Etapa 1 — Convite e ativação
O responsável recebe um convite (link via SMS/WhatsApp, ou entregue verbalmente pelo motorista/empresa com um código) → baixa o app Rotta → cria conta com telefone/e-mail → confirma vínculo com o(s) aluno(s) já pré-cadastrados pela empresa/escola.

**Decisão de design**: o responsável **nunca** cadastra o aluno do zero — o cadastro do aluno é sempre originado pela empresa (evita duplicidade e inconsistência de rotas). O responsável apenas *confirma* e *complementa* dados (ex.: foto do aluno, contatos de emergência, autorizados a buscar).

### 8.2 Etapa 2 — Configuração pessoal
Ativa notificações push, escolhe canais preferenciais (push, WhatsApp, SMS), cadastra pessoas autorizadas a buscar a criança (nome, parentesco, foto opcional), revisa endereço de embarque/desembarque.

### 8.3 Etapa 3 — Rotina diária (o momento de maior valor percebido)
- **Manhã, X minutos antes do horário previsto**: notificação "a van do(a) [nome do motorista] sai em breve".
- **Van a caminho**: mapa em tempo real disponível no app, com ETA (tempo estimado de chegada) até o ponto do próprio filho — não o mapa da rota inteira (privacidade e foco: o responsável só precisa saber sobre o trecho do filho dele).
- **Embarque confirmado**: notificação imediata "[nome do aluno] embarcou às 07h12".
- **Chegada à escola**: notificação "[nome do aluno] chegou à escola às 07h38".
- **Tarde, fluxo espelhado**: embarque na escola → notificação → desembarque em casa → notificação final "[nome do aluno] chegou em casa às 12h05".

### 8.4 Etapa 4 — Exceções
- **Atraso**: se o atraso ultrapassar um limiar configurável (ex.: 10 minutos), notificação proativa automática é disparada, sem que o responsável precise perguntar nada.
- **Ausência do aluno**: se o aluno não embarcar no horário e não houver justificativa prévia (ver Capítulo 13 — regra de "falta comunicada"), o app pergunta ao responsável se o aluno faltará, e alerta o motorista.
- **Ocorrência registrada pelo motorista**: o responsável recebe uma notificação com o resumo da ocorrência (ex.: "pequeno atraso por trânsito", "problema mecânico, van substituta a caminho").

### 8.5 Etapa 5 — Histórico e confiança de longo prazo
O app mantém histórico de viagens (dia, horário de embarque/desembarque, eventuais ocorrências) por um período configurável (ver retenção no Capítulo 19), permitindo ao responsável revisitar "como foi a semana" e servindo como registro objetivo em caso de disputa com o transportador ou a escola.

### 8.6 Momentos críticos de confiança (o que não pode falhar)
1. A notificação de embarque **tem que chegar** — é o momento de maior ansiedade resolvida do produto. Falha aqui é a pior experiência possível.
2. O mapa em tempo real **não pode "sumir"** ou mostrar posição desatualizada sem indicar claramente que está desatualizada (ex.: "última atualização há 4 minutos").
3. Qualquer ocorrência de segurança real precisa ter um caminho de comunicação **mais rápido que o app** (ligação direta/SOS) — o app nunca deve ser o único canal em uma emergência real.

---

## Capítulo 9. Jornada do motorista

### 9.1 Etapa 1 — Cadastro e verificação
Motorista recebe convite da empresa (ou se autocadastra, no caso de autônomo/MEI que assina diretamente) → baixa o app → preenche dados pessoais → faz upload de CNH (com categoria compatível), documento do veículo (CRLV) e, quando aplicável, certidão de antecedentes/curso especializado exigido por regulação municipal → dados ficam com status "em verificação" até validação (automática via OCR + regras, ou manual pela empresa/Rotta — ver Capítulo 13).

### 9.2 Etapa 2 — Configuração da rotina
Visualiza veículo(s) vinculado(s) e rota(s) atribuída(s) pelo gestor. Em empresas pequenas (motorista = dono), ele mesmo cria a rota; em empresas maiores, a rota é atribuída pelo gestor e o motorista apenas a visualiza.

### 9.3 Etapa 3 — Início do dia operacional
Abre o app → tela inicial mostra a(s) rota(s) do dia (manhã/tarde) com horário previsto de início → aperta **"Iniciar rota"** → app solicita permissão de localização em segundo plano (se ainda não concedida, com explicação clara do porquê) → GPS começa a transmitir.

### 9.4 Etapa 4 — Execução da rota
- Ao se aproximar de um ponto de parada (geofencing), o app destaca automaticamente a próxima parada e abre a lista de alunos esperados naquele ponto.
- Motorista (ou monitor) toca em cada aluno para marcar **embarcou** / **não veio** (com submotivo opcional: "faltou", "atraso do responsável", etc.).
- O sistema dispara notificação ao(s) responsável(is) automaticamente ao confirmar o checklist daquele ponto — o motorista não precisa "avisar" manualmente.
- Processo se repete em cada parada até a chegada à escola, onde ocorre o checklist de desembarque coletivo (idealmente com dupla conferência van vazia — ver regra de negócio no Capítulo 13).

### 9.5 Etapa 5 — Registro de ocorrências
Botão sempre visível para registrar ocorrência (categorias pré-definidas: atraso por trânsito, problema mecânico, comportamento de aluno, acidente leve, outro) — texto curto + foto opcional. Ocorrências graves (acidente, emergência médica) têm um fluxo distinto e prioritário (botão SOS, ver Capítulo 12).

### 9.6 Etapa 6 — Fim da rota
Ao concluir o desembarque do último aluno, o app pede confirmação **"van vazia, confirmar fim da rota"** (checagem ativa, nunca automática por tempo/geolocalização apenas — para evitar o cenário de criança esquecida a bordo). Rota é marcada como finalizada, GPS para de transmitir em alta frequência (passa a modo economia).

### 9.7 Etapa 7 — Gestão da própria conta
Fora do horário operacional, o motorista acessa: seus documentos e vencimentos, seu histórico de viagens realizadas, dados de pagamento/vínculo com a empresa (se autônomo, dados da própria assinatura).

### 9.8 Momentos críticos
1. O app **precisa iniciar o GPS de forma confiável** mesmo em aparelhos de entrada com gestão agressiva de bateria (Android, principalmente Xiaomi/Samsung) — este é historicamente o maior ponto de falha de apps de rastreamento no Brasil, e será tratado como requisito técnico de primeira classe (Capítulo 33).
2. O checklist precisa ser **operável com uma mão, em movimento, em poucos segundos por criança** — o motorista está gerenciando trânsito e crianças ao mesmo tempo.
3. Confirmação de "van vazia" é **inegociável** e não pode ser contornável por engano — é a principal barreira tecnológica contra o pior cenário de segurança do produto.

---

## Capítulo 10. Jornada do gestor

### 10.1 Etapa 1 — Configuração inicial da operação
Após o cadastro da empresa, o gestor é o responsável por popular a base: veículos (placa, modelo, capacidade, documentos), motoristas e monitores (convite + documentos), escolas parceiras, alunos e responsáveis, e finalmente as rotas que conectam tudo.

### 10.2 Etapa 2 — Modelagem de rotas
Cria rotas definindo: nome, turno (manhã/tarde/integral), veículo e motorista/monitor padrão, sequência de pontos de parada (endereço + geolocalização), horário previsto por ponto, e lista de alunos vinculados a cada ponto. Interface pensada para arrastar/reordenar paradas visualmente no mapa (ver Capítulo 30).

### 10.3 Etapa 3 — Operação do dia a dia (modo "torre de controle")
Abre o dashboard operacional (Capítulo 31) pela manhã: visão consolidada de todas as rotas do dia, status (não iniciada / em andamento / concluída / atrasada), veículos no mapa, alertas em destaque (atraso, documento vencido, ocorrência registrada).

### 10.4 Etapa 4 — Gestão de exceções
Recebe alerta de rota que não iniciou no horário esperado → pode contatar o motorista diretamente pelo app → em caso de indisponibilidade do motorista titular, reatribui rapidamente a rota a um motorista substituto cadastrado.

### 10.5 Etapa 5 — Gestão de conformidade documental
Painel de documentos com semáforo de vencimento (verde/amarelo/vermelho) para CNH de motoristas, CRLV e seguro de veículos, e demais documentos regulatórios exigidos pelo município. Recebe alertas automáticos 30/15/5 dias antes do vencimento.

### 10.6 Etapa 6 — Comunicação em massa
Envia comunicados (ex.: "não haverá transporte no feriado de amanhã") para todos os responsáveis de uma rota, de uma escola, ou de toda a base, via push + WhatsApp.

### 10.7 Etapa 7 — Relatórios e prestação de contas
Gera relatórios de: pontualidade por rota/motorista, frequência de alunos, ocorrências no período, uso da frota — exportáveis em PDF/planilha para prestação de contas a escolas ou (no caso B2G futuro) ao poder público.

### 10.8 Etapa 8 — Gestão financeira da própria assinatura
Acompanha status do plano Rotta (pagamento em dia, próxima cobrança), e — funcionalidade de valor agregado — pode (a partir de V2) gerenciar a cobrança dos próprios clientes (mensalidade do transporte cobrada dos responsáveis), ver Capítulo 23.

---

## Capítulo 11. Jornada da empresa

*(A "Empresa" é a entidade-tenant; na prática, os primeiros passos abaixo costumam ser executados pela mesma pessoa física que depois assume o papel de Gestor — mas o modelo de dados sempre separa os dois papéis, ver Capítulo 15.)*

### 11.1 Etapa 1 — Descoberta e decisão
Chega até a Rotta via marketing digital direcionado (busca, redes sociais, indicação de outro transportador já cliente), landing page comunica claramente o valor ("substitua caderno, WhatsApp e rastreador genérico por R$ 39,90/mês") — ver Capítulo 32.

### 11.2 Etapa 2 — Cadastro (self-service, sem necessidade de contato comercial no MVP)
Formulário simples: nome da empresa/razão social (ou CPF, no caso do MEI/autônomo), CNPJ (opcional para autônomo pessoa física), dados do responsável legal, e-mail e telefone → criação da conta → escolha do meio de pagamento (cartão de crédito recorrente, Pix recorrente) → tenant é provisionado automaticamente (sem intervenção manual da equipe Rotta).

### 11.3 Etapa 3 — Onboarding guiado
Wizard de primeiros passos dentro do painel: "1. Cadastre seu primeiro veículo → 2. Cadastre seu primeiro motorista → 3. Cadastre seus primeiros alunos → 4. Crie sua primeira rota → 5. Convide os responsáveis". Progresso visível (barra/checklist), com a opção de pular etapas.

### 11.4 Etapa 4 — Ativação plena (primeiro valor real)
O momento de "aha" acontece na primeira viagem real rastreada e no primeiro responsável recebendo a notificação de embarque — este é o evento de ativação que a equipe de produto deve instrumentar e otimizar antes de qualquer outra métrica (ver Capítulo 35).

### 11.5 Etapa 5 — Expansão de uso dentro do tenant
Empresa cresce (adiciona mais veículos/motoristas/rotas) organicamente à medida que a operação real dela cresce — o modelo de cobrança fixo por empresa (não por veículo/aluno) remove qualquer atrito de "vou pagar mais se cadastrar mais um van", incentivando o cadastro completo da operação real (requisito de UX e também de qualidade de dado: quanto mais completo o cadastro, melhor o produto funciona).

### 11.6 Etapa 6 — Retenção e cobrança recorrente
Cobrança automática mensal; em caso de falha de pagamento, fluxo de recuperação (nova tentativa, notificação, período de carência antes de suspensão de funcionalidades operacionais — nunca suspensão abrupta que colocaria crianças em risco no meio de uma rota ativa).

### 11.7 Etapa 7 — Advocacia e indicação
Empresa satisfeita indica a Rotta a outros transportadores (a persona "Diego" costuma conhecer outros donos de empresas de transporte escolar na mesma cidade/região — efeito de rede geográfico) — motor de crescimento orgânico tratado no Capítulo 35.

### 11.8 Etapa 8 (V2/V3) — Upgrade para operação multi-filial ou vínculo com secretaria
Empresas que crescem para múltiplas filiais/bases operacionais passam a usar a estrutura de tenancy hierárquico (Capítulo 15); empresas terceirizadas do transporte público passam a operar dentro do módulo de compliance B2G (Capítulo 24).
