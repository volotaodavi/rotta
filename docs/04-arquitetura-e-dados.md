# Dossiê 4 — Arquitetura e Dados (Capítulos 14–20)

---

## Capítulo 14. Arquitetura do SaaS

### 14.1 Estilo arquitetural escolhido: Monólito Modular (Modular Monolith) evoluindo para serviços extraídos

**Decisão**: no MVP e V2, a Rotta será construída como um **monólito modular** com fronteiras de domínio rígidas (DDD leve — _bounded contexts_ claros), não como microsserviços desde o dia 1, com **exceção** do gateway de tempo real (localização/eventos), que já nasce como serviço separado.

**Justificativa técnica**:

- Microsserviços resolvem um problema que a Rotta não tem no dia 1: múltiplos times grandes trabalhando em paralelo com necessidade de deploy independente. No MVP, o time é pequeno — a complexidade operacional de orquestrar N serviços (service discovery, tracing distribuído, consistência eventual entre serviços) é custo puro sem benefício correspondente.
- Um monólito modular bem desenhado (módulos com interfaces claras, sem acoplamento cruzado de tabelas) entrega 90% do benefício de "fronteiras limpas" dos microsserviços com uma fração da complexidade operacional.
- A extração futura de um módulo para um serviço próprio (ex.: Notificações, ou Rotas/Geolocalização) é uma decisão de **quando**, não de **se** — e só compensa quando um módulo específico tiver um perfil de carga, escala ou time dedicado que justifique o isolamento. Desenhar módulos com fronteiras limpas desde o início é o que torna essa extração futura barata (ver Capítulo 36).
- A exceção é o **gateway de tempo real**: ingestão de GPS de milhares de veículos simultâneos e distribuição via WebSocket/pub-sub tem um perfil de carga (alta frequência, baixa latência, stateful nas conexões) fundamentalmente diferente do resto da API (CRUD, baixa frequência). Colocar os dois no mesmo processo desde o início criaria acoplamento de escala desnecessário (um pico de tráfego de GPS não pode degradar o cadastro de alunos). Este serviço nasce isolado desde o MVP.

### 14.2 Visão de componentes (C4 — nível de contêiner)

```
┌─────────────────┐  ┌──────────────────┐  ┌───────────────────┐
│   App Mobile     │  │   App Mobile      │  │   Painel Web       │
│  (Motorista/      │  │  (Responsável)    │  │  (Empresa/Gestor/  │
│   Monitor)        │  │                   │  │   Escola/Admin)    │
└────────┬─────────┘  └────────┬──────────┘  └─────────┬──────────┘
         │                     │                        │
         │      HTTPS/REST (CRUD) + WebSocket (realtime) │
         ▼                     ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway / BFF                           │
│        (autenticação, rate limiting, roteamento por tenant)      │
└───────┬───────────────────────────────────┬─────────────────────┘
        │                                   │
        ▼                                   ▼
┌──────────────────────────┐      ┌──────────────────────────────┐
│   Core API (monólito      │      │  Realtime Gateway              │
│   modular)                 │      │  (ingestão de GPS + WebSocket  │
│  - Identidade/Acesso       │      │   pub/sub para mapas ao vivo)  │
│  - Empresas/Tenants        │      └───────────┬────────────────────┘
│  - Veículos/Motoristas     │                  │
│  - Alunos/Responsáveis     │                  ▼
│  - Rotas/Escolas           │           ┌──────────────┐
│  - Documentos              │           │  Redis         │
│  - Relatórios              │           │ (pub/sub +     │
└──────────┬─────────────────┘           │  cache)        │
           │                              └──────────────┘
           ▼
┌──────────────────────────┐      ┌──────────────────────────────┐
│  PostgreSQL (+ PostGIS,    │      │  Fila de mensagens             │
│  multi-tenant via RLS)     │      │  (SQS/RabbitMQ)                │
└────────────────────────────┘      └───────────┬────────────────────┘
                                                 ▼
                                     ┌──────────────────────────┐
                                     │  Worker de Notificações    │
                                     │  (push / WhatsApp / SMS)   │
                                     └──────────────┬────────────┘
                                                     ▼
                                     ┌──────────────────────────┐
                                     │  Provedores externos       │
                                     │  (FCM/APNs, WhatsApp Cloud  │
                                     │   API, Twilio/Zenvia)       │
                                     └──────────────────────────┘
```

### 14.3 Módulos do Core API (fronteiras de domínio)

| Módulo                        | Responsabilidade                                          | Não faz                                                                           |
| ----------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `identity`                    | Autenticação, sessões, papéis, permissões                 | Não conhece regras de rota ou veículo                                             |
| `tenancy`                     | Ciclo de vida de Empresas, planos, cobrança               | Não conhece detalhes operacionais de rota                                         |
| `fleet`                       | Veículos e seus documentos                                | Não conhece alunos                                                                |
| `people`                      | Motoristas, monitores e seus documentos                   | Não decide quem dirige qual rota (isso é `routing`)                               |
| `students`                    | Alunos, responsáveis, vínculos, autorizados               | Não conhece geolocalização                                                        |
| `routing`                     | Rotas, paradas, atribuição motorista/veículo/aluno        | Não processa GPS bruto (isso é `realtime`)                                        |
| `schools`                     | Escolas e portal de visualização                          | Somente leitura sobre os demais módulos                                           |
| `realtime` (serviço separado) | Ingestão de GPS, geofencing, cálculo de ETA, pub/sub      | Não guarda regras de negócio de cadastro                                          |
| `checklist`                   | Estados de embarque/desembarque, confirmação de van vazia | —                                                                                 |
| `notifications`               | Orquestração de envio multicanal, templates               | Não decide _quando_ notificar (isso é publicado como evento pelos outros módulos) |
| `documents`                   | Repositório de arquivos, OCR, alertas de vencimento       | —                                                                                 |
| `reporting`                   | Agregações e exportações                                  | Somente leitura de dados de outros módulos                                        |
| `billing`                     | Assinatura, cobrança recorrente, inadimplência            | —                                                                                 |

### 14.4 Comunicação entre módulos: eventos de domínio, não chamadas diretas de banco

Cada módulo só acessa suas próprias tabelas diretamente. Comunicação entre módulos ocorre via **eventos de domínio internos** (ex.: `AlunoEmbarcou`, `RotaIniciada`, `DocumentoVencendo`) publicados em um _event bus_ interno (na fase de monólito, um bus in-process; na fase de serviços extraídos, o mesmo contrato de evento passa a trafegar pela fila de mensagens sem mudança de código de negócio). Esta é a decisão arquitetural mais importante do documento: **o contrato de eventos é desenhado desde o MVP como se os módulos já fossem serviços distintos**, mesmo rodando no mesmo processo — é isso que torna a futura extração de serviços uma mudança de infraestrutura, não uma reescrita de lógica de negócio.

### 14.5 Padrão de camadas dentro de cada módulo (Arquitetura Limpa / Hexagonal)

```
[Controller/Resolver HTTP]  →  [Caso de Uso / Application Service]  →  [Domínio (entidades, regras)]
                                          ↓
                              [Porta de Repositório (interface)]
                                          ↓
                          [Adaptador de Persistência (Postgres/Prisma)]
```

- **Camada de domínio**: entidades e regras de negócio puras, sem dependência de framework, banco ou HTTP — é onde vivem as regras do Capítulo 13 (ex.: "rota só finaliza com confirmação de van vazia"), testável em isolamento total.
- **Camada de aplicação**: orquestra casos de uso (ex.: `IniciarRotaUseCase`), coordena chamadas a repositórios e publicação de eventos.
- **Camada de infraestrutura**: implementações concretas (Postgres, provedores externos, filas) atrás de interfaces definidas pelo domínio — permite trocar Postgres por outro provedor, ou trocar o provedor de WhatsApp, sem tocar em regra de negócio.
- **Motivo técnico**: esta separação é o que permite que a suíte de testes unitários de regras de negócio críticas (segurança da criança) rode em milissegundos, sem banco de dados, e sirva como rede de segurança para qualquer refatoração futura.

---

## Capítulo 15. Estrutura Multi-Tenant

### 15.1 Modelo de isolamento escolhido: Banco compartilhado, schema compartilhado, isolamento por linha (Shared DB, Shared Schema, Row-Level Security)

Três modelos foram avaliados:

| Modelo                                                                           | Isolamento                        | Custo operacional                                      | Escala a milhares de tenants?                    |
| -------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------ | ------------------------------------------------ |
| Banco dedicado por tenant                                                        | Máximo                            | Altíssimo (N bancos para gerenciar, migrar, monitorar) | Não escala além de centenas sem automação pesada |
| Schema dedicado por tenant (mesmo banco)                                         | Alto                              | Alto (migrations em N schemas, conexões por schema)    | Escala mal além de milhares                      |
| **Schema compartilhado + `tenant_id` em toda tabela + Row-Level Security (RLS)** | Forte, com defesa em profundidade | Baixo (uma migration, um pool de conexão)              | **Escala a centenas de milhares**                |

**Decisão**: **Shared Schema com RLS**, pelos seguintes motivos técnicos:

1. A imensa maioria dos tenants da Rotta é **pequena** (1 motorista, 1 van) — um banco dedicado por tenant desperdiçaria recursos (idle connections, overhead de manutenção) em uma escala massiva de tenants pequenos, que é exatamente o perfil de mercado (Capítulo 4).
2. Migrations de schema em um único banco são ordens de magnitude mais simples de operar do que coordenar migrations consistentes em milhares de bancos/schemas isolados — impacto direto no objetivo técnico de "nenhuma migration exige downtime" (Capítulo 3).
3. RLS do PostgreSQL aplica o isolamento **no nível do banco de dados**, não apenas na camada de aplicação — isso significa que mesmo um bug de aplicação que "esqueça" de filtrar por tenant não consegue vazar dados entre empresas, porque o próprio Postgres rejeita a leitura. Esta é a principal mitigação de risco do requisito de segurança "zero incidentes de vazamento entre tenants" (Capítulo 3).

### 15.2 Como o isolamento funciona na prática

- Toda tabela de negócio possui uma coluna `tenant_id` (não anulável, indexada, sempre a primeira coluna de qualquer índice composto).
- Uma _policy_ de RLS em cada tabela restringe toda leitura/escrita a `tenant_id = current_setting('app.tenant_id')`.
- A aplicação define `app.tenant_id` como a primeira ação de cada requisição autenticada, a partir do token de sessão (nunca a partir de um parâmetro vindo do cliente) — o tenant do usuário é resolvido no momento do login e carimbado no token, imutável durante a sessão.
- O **Administrador Rotta** opera com uma _policy_ de bypass auditado (role de banco separada, com todo acesso logado) — nunca reutilizando a mesma sessão de aplicação usada por tenants comuns.

### 15.3 Tenancy hierárquico (para suportar V3 — Secretarias/Prefeituras)

Para o caso B2G, uma Secretaria de Educação precisa enxergar dados agregados de múltiplas Empresas terceirizadas, sem que essas empresas enxerguem uma à outra. O modelo de dados já nasce preparado para isso:

- Toda `Empresa` (tenant) possui um campo opcional `organizacao_pai_id`, permitindo formar uma árvore de tenancy (Secretaria no topo, Empresas terceirizadas como filhas).
- RLS é estendida com uma segunda _policy_ que permite leitura (nunca escrita) de tenants filhos por um usuário com papel "Secretaria" vinculado ao tenant pai — mantendo o mesmo mecanismo de defesa em profundidade, sem introduzir um modelo de dados paralelo.
- Este desenho evita a armadilha comum de "vamos remodelar tudo quando chegarmos no B2G" — o custo de suportar a hierarquia é pago uma vez, cedo, como uma coluna nula que não afeta tenants comuns.

### 15.4 Identificação de tenant na borda (roteamento)

- **App mobile e painel web**: o tenant é resolvido implicitamente pela sessão do usuário autenticado (um usuário sempre sabe a qual tenant pertence no momento do login) — não há necessidade de subdomínio por tenant para os apps operacionais.
- **Landing page e cadastro público**: domínio único (`app.rotta.com.br` ou similar), sem necessidade de subdomínios por empresa — mantém a simplicidade de infraestrutura (certificados, DNS) e é consistente com o modelo de app mobile-first, onde subdomínio por tenant não faz sentido de UX.
- **Exceção futura (V3, B2G)**: portal de transparência pública por município pode justificar um subdomínio dedicado (ex.: `transporte.prefeitura-x.rotta.com.br`) por exigência de identidade visual institucional — decisão de branding, não de arquitetura de dados.

### 15.5 Limites e quotas por tenant

Ainda que o plano seja único e sem limite de uso "duro" (não há cobrança por veículo/aluno), a plataforma implementa **guard-rails técnicos** por tenant (não comerciais) para proteger a infraestrutura compartilhada de uso anômalo (ex.: um script mal configurado gerando milhares de rotas): limites de taxa de requisição por tenant na API Gateway, e alertas internos quando um tenant foge muito do perfil de uso esperado (ex.: 10x a mediana de veículos) para revisão manual antes de qualquer bloqueio.

---

## Capítulo 16. Banco de Dados (modelo conceitual)

### 16.1 Escolha de tecnologia

**PostgreSQL** como banco relacional primário, com as extensões:

- **PostGIS**: para armazenamento e consulta eficiente de geometria/geografia (pontos de parada, geofences, cálculo de distância) — essencial para geofencing e ETA.
- **TimescaleDB** (ou tabela particionada por tempo nativa do Postgres, dependendo da escala real observada): para a série temporal de posições GPS (alto volume de escrita, consultas por janela de tempo, downsampling para histórico de longo prazo).

**Justificativa**: um banco relacional forte com extensões geoespaciais maduras remove a necessidade de operar um banco especializado adicional (ex.: MongoDB para "documentos", um banco de séries temporais separado) no MVP — menos peças móveis, mais velocidade de entrega, com a extensibilidade (JSONB para campos semi-estruturados quando necessário) já embutida no Postgres.

### 16.2 Modelo conceitual de entidades (visão de alto nível)

```
Organizacao (opcional, hierarquia B2G)
   └── Empresa (tenant) ───────────────┬─────────────────────────────┐
         │                              │                              │
         ├── Assinatura/Cobrança        ├── Veiculo ── Documento       ├── Escola
         │                              │                              │
         ├── Usuario (papel: Gestor) ───┼── Motorista ── Documento     ├── Aluno ── Responsavel (N:N)
         │                              │        │                     │      │
         │                              ├── Monitor ── Documento       │      └── AutorizadoRetirada
         │                              │                              │
         │                              └── Rota ──┬── ParadaRota      │
         │                                          ├── Motorista(FK)  │
         │                                          ├── Veiculo(FK)    │
         │                                          └── AlunoRota (N:N, com ParadaRota)
         │
         └── Viagem (execução concreta de uma Rota em um dia)
                ├── PosicaoGPS (série temporal)
                ├── ChecklistEmbarque (por Aluno/Parada)
                ├── ChecklistDesembarque (por Aluno/Parada)
                └── Ocorrencia
```

### 16.3 Entidades principais e atributos-chave

**Empresa** (tenant): id, razão social/nome, CNPJ/CPF, tipo (autônomo/MEI/empresa/terceirizada pública), status (ativo/restrito/suspenso), plano, data de criação, organização-pai (opcional).

**Usuario**: id, nome, telefone, e-mail, hash de senha (quando aplicável), status. Um Usuario pode ter múltiplos `VinculoPapel` (tenant_id, papel: gestor/motorista/monitor/responsável/escola, status), permitindo o mesmo usuário atuar em múltiplos tenants com papéis diferentes (RN-06).

**Veiculo**: id, tenant_id, placa, modelo, capacidade, status de documentos (derivado dos Documentos vinculados).

**Motorista / Monitor**: id, tenant_id, usuario_id, dados de habilitação, status de verificação documental.

**Documento**: id, entidade_tipo (veículo/motorista/empresa), entidade_id, tipo_documento, arquivo (referência a storage de objetos), data_emissao, data_vencimento, status.

**Aluno**: id, tenant_id, escola_id, nome, data_nascimento, endereço de embarque/desembarque (geolocalizado), necessidades especiais (campo estruturado + observação livre), foto.

**Responsavel**: id, tenant_id, usuario_id, relação com o(s) aluno(s) via tabela associativa `AlunoResponsavel` (aluno_id, responsavel_id, tipo de parentesco, é responsável financeiro/legal).

**Escola**: id, tenant_id, nome, endereço, contato. _(Nota: no modelo de dados, `Escola` é sempre um registro pertencente a um tenant — mesmo que a mesma escola física seja cadastrada por duas empresas transportadoras diferentes, cada uma tem seu próprio registro. Um cadastro global de escolas deduplicado é uma otimização de V2/V3, não um requisito de correção do MVP.)_

**Rota**: id, tenant_id, nome, turno, dias da semana, veiculo_id (padrão), motorista_id (padrão), lista ordenada de `ParadaRota` (sequência, geolocalização, horário previsto).

**AlunoRota**: associação N:N entre Aluno e Rota, com referência à `ParadaRota` específica de embarque/desembarque do aluno (um aluno pode embarcar em um ponto e desembarcar em outro diferente do padrão, ex.: fica na casa da avó em alguns dias — suportado via exceção pontual, V2).

**Viagem**: id, tenant_id, rota_id, data, status (agendada/em andamento/finalizada/cancelada), horário real de início/fim.

**PosicaoGPS**: viagem_id, timestamp, latitude, longitude, velocidade, precisão — tabela de altíssimo volume, particionada por tempo, com política de retenção/downsampling (dado bruto de alta frequência mantido por curto período; trilha simplificada mantida por mais tempo para histórico).

**ChecklistEmbarque / ChecklistDesembarque**: viagem_id, aluno_id, parada_id, timestamp, status (embarcou/ausente/ausente_justificado), registrado_por (motorista/monitor).

**Ocorrencia**: viagem_id, tipo, descrição, timestamp, gravidade, anexo (foto opcional).

### 16.4 Estratégia de evolução de schema

- Toda migration é **aditiva** (expand/contract): adicionar coluna nova como opcional → backfill em background → tornar obrigatória apenas após confirmação de que todo código já escreve o novo campo → remover coluna antiga em uma migration separada e posterior. Isso elimina a necessidade de downtime mesmo em uma tabela de milhões de linhas (ex.: `PosicaoGPS`).
- Migrations são versionadas e aplicadas via ferramenta de migração declarativa (ex.: Prisma Migrate ou equivalente), nunca editadas manualmente em produção.

### 16.5 Política de retenção de dados

- **PosicaoGPS bruto**: retido em alta resolução por 90 dias (suficiente para disputas operacionais recentes), depois downsampled para um ponto a cada 5 minutos e retido por até 2 anos para fins de histórico/relatório, depois arquivado (storage frio) ou expurgado conforme política de privacidade e o exercício de direito de exclusão do titular (RN-24).
- **Checklists e Ocorrências**: retidos por período mais longo (ex.: 5 anos), por serem registros de baixo volume e alto valor probatório em eventual disputa ou processo.

---

## Capítulo 17. APIs necessárias

### 17.1 Estilo de API

**REST** como padrão principal para o Core API (CRUD de cadastro, simples de documentar, cachear e consumir por qualquer cliente, incluindo integrações futuras de terceiros/parceiros). **WebSocket** dedicado para o canal de tempo real (posição de veículo, eventos de checklist ao vivo) — um modelo de requisição/resposta como REST não é adequado para push contínuo de localização. GraphQL foi avaliado e descartado para o MVP: adiciona complexidade de cache e de exposição de schema que não se paga no estágio atual, podendo ser reconsiderado como uma camada de agregação para o painel web em V2/V3 caso a necessidade de composição de dados cresça.

### 17.2 Superfícies de API (grupos de endpoints por módulo, ilustrativo)

- **Auth**: login (senha / OTP), refresh de token, logout, recuperação de conta.
- **Tenancy**: criação de empresa, gestão de assinatura, webhook de pagamento.
- **Fleet**: CRUD de veículos, upload de documentos.
- **People**: CRUD de motoristas/monitores, convite, upload de documentos, status de verificação.
- **Students**: CRUD de alunos, vínculo com responsáveis, autorizados.
- **Routing**: CRUD de rotas e paradas, atribuição de veículo/motorista, vínculo de alunos.
- **Schools**: CRUD de escolas, endpoints de leitura do portal escolar.
- **Trips (Viagens)**: iniciar/finalizar viagem, registrar checklist, registrar ocorrência.
- **Realtime** (via WebSocket, não REST): canal `subscribe:tenant/{id}/rota/{id}`, canal `subscribe:responsavel/{id}/aluno/{id}` — cada assinatura de canal é validada contra a permissão do usuário no momento da conexão (RN-08/09/25).
- **Notifications**: preferências de canal, histórico de notificações recebidas.
- **Documents**: upload, listagem, status de vencimento.
- **Reports**: geração e exportação de relatórios.
- **Billing**: status de assinatura, histórico de faturas, atualização de forma de pagamento.
- **Admin** (namespace isolado, cross-tenant, exclusivo do Administrador Rotta): gestão de tenants, suporte, auditoria.

### 17.3 Padrões e convenções

- Versionamento de API por prefixo de caminho (`/v1/...`), permitindo evolução sem quebra de clientes mobile já publicados (app store não permite forçar atualização instantânea — a API precisa tolerar versões de app antigas por um período de transição).
- Todo endpoint de escrita é idempotente quando fizer sentido (ex.: registrar checklist de embarque usa uma chave de idempotência para tolerar reenvio em caso de app offline reconectando).
- Paginação por cursor (não offset) em listagens de alto volume (ex.: histórico de posições, lista de viagens) para performance e consistência sob escrita concorrente.
- Erros seguem um formato padronizado (código, mensagem, campo, id de rastreio) para permitir tratamento consistente no cliente e correlação com logs/observability.
- Toda API exige HTTPS/TLS 1.2+, autenticação via JWT de curta duração + refresh token, e todo endpoint (exceto os explicitamente públicos, como health-check) exige tenant resolvido (Capítulo 15).

### 17.4 BFF (Backend for Frontend) vs. API única

**Decisão**: uma única Core API serve tanto o app mobile quanto o painel web no MVP, evitando duplicar lógica de negócio em dois backends. Uma camada fina de **API Gateway/BFF** pode agregar/formatar respostas de forma diferente por tipo de cliente (ex.: o app do responsável recebe um payload mais enxuto, otimizado para uso de dados móveis) sem duplicar regra de negócio — apenas composição e formatação na borda.

---

## Capítulo 18. Integrações

### 18.1 Integrações essenciais ao MVP

| Integração                      | Propósito                                                                           | Fornecedor recomendado                                                                                                                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Notificação Push                | Embarque/desembarque/atraso em tempo real                                           | Firebase Cloud Messaging (Android) + APNs (iOS), via um serviço unificador                                                                                                                   |
| WhatsApp Business               | Canal preferido de muitas famílias, maior taxa de leitura que push em alguns perfis | Meta WhatsApp Cloud API (direto) ou um BSP (Zenvia, Twilio) para simplificar compliance de template/aprovação                                                                                |
| SMS                             | Fallback quando push/WhatsApp falham ou não há app instalado                        | Twilio ou provedor nacional (Zenvia)                                                                                                                                                         |
| Gateway de pagamento recorrente | Cobrança mensal da Empresa                                                          | Stripe (cartão internacional/nacional) e/ou um provedor nacional com Pix recorrente (ex.: Pagar.me, Iugu) — decisão final depende de cobertura de Pix recorrente no momento da implementação |
| Mapas e geocodificação          | Exibição de mapa, cálculo de rota/ETA, geocodificação de endereço                   | Google Maps Platform (maior cobertura e qualidade de dados no Brasil) — com abstração de provedor para permitir troca futura (Mapbox como alternativa de custo em escala)                    |
| Armazenamento de arquivos       | Documentos, fotos de alunos, comprovantes                                           | Object storage compatível com S3 (AWS S3 ou equivalente)                                                                                                                                     |

### 18.2 Integrações de V2/V3

- **OCR de documentos** (ex.: Google Vision, AWS Textract) para extração assistida de dados de CNH/CRLV.
- **Assinatura eletrônica** (ex.: D4Sign, Clicksign) para contratos.
- **Emissão de nota fiscal/boleto** para o módulo financeiro de cobrança do transportador aos responsáveis.
- **Sistemas de gestão escolar (ERPs educacionais)** — integração de matrícula/frequência via API própria da Rotta, para escolas parceiras que já possuem sistema de gestão (V3, quando o volume de escolas parceiras justificar o esforço de integração dedicada).
- **Hardware de rastreamento veicular dedicado** (para frotas que já possuem equipamento instalado) como fonte alternativa/redundante de GPS — via protocolo padrão do setor (ex.: FMS/OBD ou API do fabricante).

### 18.3 Princípio de integração: adaptador, nunca acoplamento direto

Toda integração externa é acessada através de uma interface própria definida no domínio (ex.: `NotificacaoGateway`, `PagamentoGateway`, `MapaGateway`), com a implementação concreta do fornecedor injetada na camada de infraestrutura (Capítulo 14.5). Isso significa que trocar de Twilio para outro provedor de SMS, ou de Google Maps para Mapbox, é uma mudança confinada a um único adaptador, sem tocar em regra de negócio — decisão que paga dividendos especialmente em integrações de custo variável por volume (mapas, SMS), onde a Rotta pode precisar renegociar/trocar fornecedor à medida que a escala cresce.

---

## Capítulo 19. Segurança

### 19.1 Modelo de ameaças específico do domínio

Diferente de um SaaS B2B genérico, a Rotta lida com **dados de crianças** e com um cenário de **segurança física real** (a criança precisa efetivamente estar segura, não apenas os dados sobre ela). O modelo de segurança cobre três camadas:

1. **Segurança de dados** (confidencialidade/integridade/disponibilidade clássicas de um SaaS).
2. **Segurança operacional** (o sistema não pode, por bug ou ausência de validação, contribuir para um cenário de risco físico — ex.: van marcada como "vazia" quando não está).
3. **Conformidade legal** (LGPD, com atenção redobrada por envolver dados de menores, que exigem tratamento com consentimento dos responsáveis legais, nunca da própria criança).

### 19.2 Segurança de dados

- **Isolamento multi-tenant via RLS** (Capítulo 15) como primeira linha de defesa contra vazamento entre empresas.
- **Criptografia em trânsito**: TLS 1.2+ obrigatório em toda comunicação (API, WebSocket, apps).
- **Criptografia em repouso**: disco do banco de dados e object storage criptografados; campos de dado especialmente sensível (ex.: CPF, documentos de identidade) com criptografia adicional em nível de aplicação.
- **Gestão de segredos**: nenhuma credencial em código-fonte ou variável de ambiente exposta em repositório — uso de um gerenciador de segredos dedicado (AWS Secrets Manager/Vault), com rotação periódica.
- **Autenticação**: senha com hash forte (Argon2/bcrypt) quando aplicável; OTP com expiração curta para telefone; JWT de curta duração (minutos) + refresh token de longa duração revogável; 2FA obrigatório para papéis administrativos (Gestor/Empresa/Admin Rotta), opcional (mas incentivado) para os demais.
- **Autorização**: RBAC reforçado por tenant em toda camada (aplicação **e** banco via RLS — defesa em profundidade, nunca confiar em uma única camada).
- **Auditoria**: log imutável (append-only) de toda ação sensível (acesso do Admin Rotta a um tenant, alteração de composição de rota, exclusão de aluno/responsável) — essencial tanto para investigação de incidentes quanto para conformidade legal.

### 19.3 Segurança operacional (específica do domínio escolar)

- Confirmação ativa de "van vazia" nunca automatizável (RN-12) — decisão de segurança que prevalece sobre qualquer ganho de conveniência de UX.
- Bloqueio técnico (não apenas alerta) de início de rota com documento vencido (RN-18/19).
- Validação de coerência geoespacial: o sistema sinaliza (não bloqueia, mas alerta o gestor) quando a posição de GPS reportada é fisicamente incompatível com o histórico recente (ex.: salto de localização impossível), como proteção contra GPS falso/spoofing por dispositivo comprometido ou app modificado.
- Botão de emergência/SOS com prioridade máxima de entrega (bypassa filas de notificação padrão) e, quando tecnicamente viável por integração municipal futura, notificação direta a serviços de emergência (V3, dependente de parcerias locais).

### 19.4 LGPD e privacidade por padrão (Privacy by Design)

- **Base legal**: consentimento do responsável legal para tratamento de dados do menor (nunca da criança, que não tem capacidade civil para consentir) — coletado explicitamente no fluxo de ativação do responsável (Capítulo 8.1).
- **Minimização de dados**: cada perfil só recebe/visualiza o dado estritamente necessário à sua função (ver regras RN-08, RN-09, RN-25 do Capítulo 13) — o princípio de minimização é aplicado tanto na modelagem de permissões quanto na própria superfície de API (um endpoint nunca retorna mais campos do que o perfil solicitante tem direito de ver, mesmo que tecnicamente "mais fácil" retornar o objeto completo).
- **Direitos do titular**: exportação e exclusão de dados sob solicitação do responsável legal (RN-24), com prazo de atendimento definido em política de privacidade pública.
- **DPO (Encarregado de Dados)**: papel formal definido desde o MVP, mesmo em uma empresa pequena — ponto de contato único para solicitações de titulares e para a ANPD, caso necessário.
- **Relatório de Impacto à Proteção de Dados (RIPD)**: conduzido antes do lançamento, dado o tratamento de dados de menores em escala — não é opcional para este domínio.

### 19.5 Segurança de infraestrutura e aplicação

- **WAF e proteção contra DDoS** na borda (Cloudflare ou equivalente do provedor de nuvem).
- **Rate limiting** por IP, por usuário e por tenant, com atenção especial a endpoints de autenticação (força bruta) e ao endpoint de ingestão de GPS (abuso/flooding).
- **Dependências e supply chain**: scanner automatizado de vulnerabilidades em dependências (Dependabot/Snyk) no pipeline de CI, bloqueando merge de dependência com vulnerabilidade crítica conhecida sem _patch_.
- **Pentest**: teste de intrusão externo antes do lançamento público e recorrente (mínimo anual, ou a cada mudança arquitetural significativa), com escopo obrigatório em isolamento multi-tenant.
- **Backups e disaster recovery**: backup automatizado do banco (point-in-time recovery), testado periodicamente com restauração real (backup nunca testado não é backup confiável); RPO/RTO definidos e documentados (meta inicial: RPO ≤ 15 minutos, RTO ≤ 1 hora para o MVP, revisado à medida que a base cresce).

---

## Capítulo 20. Escalabilidade

### 20.1 Onde a escala dói primeiro (perfil de carga real do produto)

O gargalo de escala da Rotta não é volume de tenants (a maioria pequena) nem volume de escrita de cadastro (baixo) — é o **tráfego de tempo real durante a janela operacional concentrada**: todas as rotas do país operam essencialmente em duas janelas curtas por dia (manhã e tarde, tipicamente entre 6h30–8h30 e 11h30–13h30/17h–19h), gerando um pico massivo e previsível de ingestão de GPS e de conexões WebSocket simultâneas, seguido de vale profundo o resto do dia.

### 20.2 Estratégias de escala por componente

- **Realtime Gateway**: escalado horizontalmente de forma independente do Core API (justamente por já ser um serviço separado desde o MVP, Capítulo 14.1) — permite provisionar capacidade elástica especificamente para os picos previsíveis das janelas operacionais (scaling agendado/preditivo, não apenas reativo), com custo controlado nos vales.
- **Ingestão de GPS**: recebida via um protocolo leve (MQTT preferencialmente a WebSocket bruto para o uplink do motorista, por menor overhead de bateria e melhor tolerância a rede instável — ver Capítulo 33), publicada em Redis pub/sub, e persistida de forma assíncrona/em lote na tabela particionada de `PosicaoGPS`, nunca de forma síncrona bloqueante por requisição.
- **Banco de dados**: leitura escalada via réplicas de leitura (read replicas) para dashboards e relatórios, mantendo a escrita primária dedicada aos fluxos operacionais críticos (checklist, GPS); particionamento por tempo na tabela de posições GPS; à medida que o número de tenants cresça para a casa das centenas de milhares, avaliação de _sharding_ horizontal por `tenant_id` (hash-based) como próximo degrau — decisão adiada deliberadamente até haver sinal real de necessidade, para não pagar complexidade de sharding prematuramente.
- **Cache**: Redis para dados de leitura frequente e de baixa mutabilidade (ex.: configuração de rota do dia, status de assinatura do tenant), reduzindo carga repetida no Postgres durante os picos.
- **CDN**: todo asset estático (app landing page, imagens, mapas de tile quando aplicável) servido via CDN, nunca diretamente pela API.
- **Filas assíncronas**: todo processamento não crítico ao caminho síncrono da requisição (envio de notificação, geração de relatório, OCR de documento) é desacoplado via fila, absorvendo picos sem degradar a experiência do fluxo síncrono principal (checklist, início de rota).

### 20.3 Escala organizacional da arquitetura (permitir crescer o time sem travar)

- Fronteiras de módulo (Capítulo 14.3) definidas de forma que times futuros possam ser organizados por domínio (ex.: um time "Operação em Tempo Real", um time "Cadastro e Compliance", um time "Growth/Onboarding") sem conflito constante de código no mesmo módulo.
- Contratos de evento entre módulos (Capítulo 14.4) documentados e versionados desde o início, permitindo que a extração de um módulo para serviço próprio, quando necessária, seja uma decisão de infraestrutura isolada de um time específico, não um projeto de reescrita coordenado entre todos os times.

### 20.4 Metas de performance (SLOs de referência para o MVP, revisados com dado real de produção)

| Métrica                                                                    | Meta MVP                              |
| -------------------------------------------------------------------------- | ------------------------------------- |
| Latência p95 de API de leitura (Core API)                                  | < 300ms                               |
| Latência p95 de API de escrita (checklist, início de rota)                 | < 500ms                               |
| Latência de entrega de posição GPS (do dispositivo ao mapa do responsável) | < 5s                                  |
| Latência de notificação de embarque (do evento ao push recebido)           | < 10s                                 |
| Disponibilidade do Realtime Gateway nas janelas operacionais               | ≥ 99.9%                               |
| Disponibilidade geral da plataforma                                        | ≥ 99.5% (MVP) evoluindo a 99.9% (V2+) |
