# Dossiê 12 — Arquitetura de Backend: Fundamentos

> Este dossiê projeta a arquitetura definitiva do backend da Rotta, antes de qualquer implementação. Aprofunda e torna definitivas as decisões já apontadas nos Capítulos 14–20 (`docs/04-arquitetura-e-dados.md`) e no Dossiê 9 (stack), com o nível de detalhe de engenharia necessário para o time começar a construir sem ambiguidade. Complementado pelo Dossiê 13 (módulos e APIs completas) e pelo Dossiê 14 (GPS, notificações, jobs e eventos). Nenhum código é escrito — é especificação de arquitetura.

---

## 1. Decisão de arquitetura: Monolito Modular com comunicação orientada a eventos

### 1.1 As quatro opções avaliadas — e por que três delas não são, na verdade, alternativas entre si

Um ponto de clareza necessário antes da comparação: **"Monolito Modular" e "Event-Driven" não competem pela mesma decisão** — o primeiro é uma decisão sobre *onde o código roda* (quantos processos/deploys distintos existem), o segundo é uma decisão sobre *como os componentes conversam entre si* (chamada direta vs. eventos assíncronos). A Rotta adota **as duas simultaneamente**: um único processo de deploy no nível macro (Modular Monolith), com comunicação interna entre módulos feita majoritariamente por **eventos de domínio** (Event-Driven como padrão de comunicação), não por chamada direta de um módulo aos repositórios de outro. Isso já foi estabelecido no Capítulo 14.4 — este dossiê aprofunda o "como" e o "quando evoluir".

| Critério | Monolito tradicional (sem módulos) | **Monolito Modular (com eventos internos)** | Microsserviços desde o dia 1 |
|---|---|---|---|
| Velocidade de entrega no MVP (time pequeno) | ✅ Rápido no início, degrada com o tempo (acoplamento cresce sem fronteiras) | ✅ Rápido e sustentável — fronteiras previnem o acoplamento que mata monolitos tradicionais | ❌ Lento — overhead de infraestrutura distribuída (service discovery, tracing, deploy de N serviços) sem um time grande o suficiente para absorver esse custo |
| Complexidade operacional (deploy, observabilidade, debug) | ✅ Baixa | ✅ Baixa (um único processo/deploy) | ❌ Alta desde o primeiro dia — múltiplos pipelines, múltiplos bancos/schemas ou coordenação de dados distribuída, tracing distribuído obrigatório só para depurar um fluxo simples |
| Consistência transacional (ex.: iniciar viagem + registrar evento + validar documento do motorista, tudo precisa ser consistente) | ✅ Transações ACID nativas do banco único | ✅ Idem — módulos compartilham o mesmo banco/transação quando necessário | ⚠️ Exige padrões de consistência eventual/saga para operações que cruzam serviços — complexidade adicional sem benefício real neste estágio |
| Isolamento de fronteiras de domínio (não virar espaguete conforme o time cresce) | ❌ Sem fronteira imposta, degrada previsivelmente | ✅ Fronteiras de módulo com contrato de evento explícito, testável em isolamento | ✅ Isolamento forçado por processo separado |
| Escala de partes específicas (ex.: o Realtime/GPS precisa escalar de forma muito diferente do CRUD de cadastro) | ❌ Tudo escala junto (desperdício de recursos) | ⚠️ Bom, com uma exceção deliberada (Seção 1.3) | ✅ Nativo |
| Caminho de evolução quando o time/escala realmente exigir separação | ❌ Caro (acoplamento não documentado, difícil de separar depois) | ✅ Barato — módulo com fronteira e eventos já definidos é "quase" um microsserviço, faltando só o transporte de rede (Seção 1.4) | — (já nasce assim, mas paga o custo cedo demais) |

### 1.2 Decisão

**Monolito Modular** como arquitetura de deploy, com **comunicação interna orientada a eventos de domínio** entre módulos (nunca um módulo chamando o repositório/service interno de outro diretamente — apenas através de uma interface pública do módulo ou de um evento publicado). Esta é a única opção, das avaliadas, que entrega velocidade de MVP **e** um caminho barato de evolução para microsserviços quando (não se) a escala e o tamanho do time exigirem — sem pagar hoje o custo operacional de uma arquitetura distribuída que o estágio atual da Rotta não precisa.

### 1.3 A exceção deliberada: o Realtime Gateway já nasce separado

Conforme já decidido no Capítulo 14.1 e no Dossiê 9, o **Realtime Gateway** (ingestão de GPS + distribuição via Socket.IO) é um serviço/processo separado desde o MVP — não faz parte do Monolito Modular do Core API. Motivo: seu perfil de carga (altíssima frequência, conexões persistentes com estado, picos previsíveis nas janelas operacionais) é fundamentalmente incompatível com o perfil do Core API (CRUD de baixa frequência, sem estado de conexão). Colocar os dois no mesmo processo obrigaria a escalar o Core API inteiro só para atender o pico de GPS — desperdício de recursos e risco de um pico de tráfego de localização degradar o cadastro de alunos. Esta é a prova de que a arquitetura já pratica, desde o dia 1, o princípio "separar apenas o que precisa ser separado" — nem tudo em um monólito, nem tudo em microsserviços.

### 1.4 Caminho de migração futura para Microsserviços (como preparar hoje o que será extraído amanhã)

A extração futura de um módulo do Monolito para um serviço próprio é tratada como uma decisão de **infraestrutura**, não de **reescrita de lógica de negócio** — desde que três disciplinas sejam seguidas rigorosamente desde o MVP:

1. **Todo módulo só acessa suas próprias tabelas.** Nenhuma query de um módulo faz `JOIN` direto contra a tabela de outro módulo — se um módulo precisa de dado de outro, ele chama a interface pública (um `Service`/`Port`) daquele módulo, nunca o banco por baixo. Isso significa que, no dia da extração, o módulo já "finge" ser um serviço remoto — só falta trocar a chamada em memória por uma chamada de rede.
2. **Toda comunicação relevante entre módulos já é modelada como evento de domínio**, publicado em um *event bus* interno (Seção 1.5) com um contrato de payload versionado e serializável (JSON), mesmo rodando tudo em um único processo Node hoje. No dia da extração, o mesmo evento passa a trafegar por uma fila real (o BullMQ/Redis já usado para jobs assíncronos, Dossiê 14, é o candidato natural) em vez de um `EventEmitter` em memória — **o código que publica e o código que consome o evento não mudam**, só o transporte por baixo muda.
3. **Cada módulo tem sua própria pasta com fronteira física clara** (Seção 3) e não importa tipos internos de outro módulo além dos DTOs explicitamente exportados em sua interface pública — um *lint rule* de arquitetura (ex. `eslint-plugin-boundaries` ou regra equivalente de import) impede, em tempo de CI, que um módulo importe um arquivo interno de outro módulo por engano.

**Ordem recomendada de extração, quando o sinal de escala justificar** (não uma decisão a tomar agora, mas o roteiro já preparado): (1) o módulo de **Notificações** — perfil de carga de fila assíncrona, já desacoplado por natureza; (2) o módulo de **Documentos/OCR** — processamento pesado (OCR, verificação facial) que se beneficia de escalar/rodar em hardware diferente do resto da API; (3) o módulo de **Relatórios/Analytics** — cargas de consulta pesada que já deveriam rodar contra réplica de leitura, natural candidato a virar um serviço de leitura dedicado. Módulos puramente transacionais de cadastro (Empresas, Motoristas, Veículos, Alunos, Rotas) permanecem no monólito por muito mais tempo — não há perfil de carga que justifique separá-los cedo.

### 1.5 O *event bus* interno

Implementado com o `EventEmitter2` do NestJS (módulo `@nestjs/event-emitter`) na fase de monólito — despacho em memória, síncrono ou assíncrono conforme o handler, sem infraestrutura extra. Todo evento de domínio (lista completa no Dossiê 14) é uma classe tipada com um payload serializável; os módulos consumidores se inscrevem via decorator (`@OnEvent('aluno.embarcou')`) sem conhecer quem publicou o evento. Este é, deliberadamente, o mesmo formato de contrato que seria publicado em uma fila real — a troca de `EventEmitter2` para BullMQ/Redis Streams no dia da extração de um módulo é uma mudança de adaptador de infraestrutura, não de modelagem.

---

## 2. Visão de camadas dentro de cada módulo (arquitetura hexagonal aplicada ao NestJS)

Reafirmando e detalhando o Capítulo 14.5 no nível de implementação NestJS:

```
interface/          → Controllers (REST), Gateways (WebSocket, só no Realtime Gateway), Guards, Pipes de validação de entrada
   ↓ chama
application/         → Use Cases / Application Services — orquestram a regra de negócio, publicam eventos, chamam repositórios via porta (interface)
   ↓ depende de (interface, não implementação)
domain/               → Entidades, Value Objects, regras de negócio puras (RN-* do Capítulo 13/Dossiê 8) — zero dependência de NestJS, Prisma ou HTTP
   ↑ implementado por
infrastructure/        → Repositórios concretos (Prisma), adaptadores de provedores externos (S3, Firebase, WhatsApp, Google Maps, Mapbox, verificação facial)
```

**Regra de dependência (a única não negociável desta seção)**: setas sempre apontam para dentro — `domain/` nunca importa nada de `infrastructure/` ou `interface/`. Isso é o que permite testar toda a regra de negócio crítica de segurança (Capítulo 19.3, RN-12, RN-18) com testes unitários puros, em milissegundos, sem subir banco de dados nem servidor HTTP (Seção 9).

---

## 3. Organização do projeto — estrutura de pastas completa

```
rotta-backend/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── infrastructure/
│   │   │   ├── interface/
│   │   │   ├── events/
│   │   │   └── auth.module.ts
│   │   ├── users/
│   │   ├── companies/
│   │   ├── schools/
│   │   ├── drivers/
│   │   ├── monitors/
│   │   ├── parents/
│   │   ├── students/
│   │   ├── vehicles/
│   │   ├── routes/
│   │   ├── trips/
│   │   ├── gps/
│   │   ├── notifications/
│   │   ├── agenda/
│   │   ├── dashboard/
│   │   ├── support/
│   │   ├── documents/
│   │   ├── reports/
│   │   ├── settings/
│   │   ├── audit/
│   │   ├── logs/
│   │   └── analytics/
│   │       └── (cada módulo replica a mesma estrutura interna da Seção 2)
│   │
│   ├── common/
│   │   ├── decorators/        → @CurrentUser(), @Roles(), @Public(), @Tenant()
│   │   ├── guards/             → JwtAuthGuard, RolesGuard, TenantGuard
│   │   ├── interceptors/       → LoggingInterceptor, TransformResponseInterceptor, TimeoutInterceptor
│   │   ├── filters/            → AllExceptionsFilter (formato padronizado de erro, Seção 8 do Dossiê 13)
│   │   ├── pipes/              → ValidationPipe customizado, ParseUuidPipe
│   │   └── base/               → BaseController, BaseRepository (interface), BaseUseCase
│   │
│   ├── shared/
│   │   ├── dtos/               → DTOs verdadeiramente compartilhados entre módulos (ex. PaginationDto, AddressDto)
│   │   ├── enums/               → Role, TenantStatus, DocumentStatus, TripStatus, EventType (fonte única da verdade, evita duplicar enum em cada módulo)
│   │   ├── types/                → Tipos utilitários compartilhados (ex. Result<T, E>, DomainEvent base)
│   │   └── constants/            → Constantes de negócio (limiares padrão, TTLs de cache)
│   │
│   ├── infra/
│   │   ├── database/              → PrismaService (client singleton), middlewares do Prisma (ex. injeção automática de tenant_id)
│   │   ├── cache/                  → RedisModule, wrapper de cache (get/set/invalidate por padrão de chave)
│   │   ├── queue/                   → BullMQModule, definição de filas (notifications, reports, documents, gps-persistence)
│   │   ├── storage/                  → S3Adapter (upload/URL pré-assinada)
│   │   ├── realtime/                   → Cliente Redis Pub/Sub usado pelo Core API para publicar eventos que o Realtime Gateway consome
│   │   ├── providers/
│   │   │   ├── push/                    → FirebaseAdapter
│   │   │   ├── whatsapp/                 → WhatsAppCloudApiAdapter
│   │   │   ├── sms/                       → TwilioZenviaAdapter
│   │   │   ├── maps/                       → GoogleMapsAdapter, MapboxAdapter
│   │   │   └── facial/                      → FacialVerificationAdapter
│   │   └── observability/                    → configuração de logger estruturado, tracing, métricas (Seção 10)
│   │
│   ├── config/
│   │   ├── env.validation.ts     → schema de validação das variáveis de ambiente (falha o boot se algo obrigatório faltar)
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   ├── auth.config.ts
│   │   └── app.config.ts
│   │
│   ├── app.module.ts
│   └── main.ts
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── test/
│   ├── unit/                    → espelha a estrutura de modules/ (um diretório de teste por módulo)
│   ├── integration/              → testes que sobem um Postgres/Redis real (Testcontainers)
│   └── e2e/                       → testes de ponta a ponta via HTTP contra a aplicação inteira
│
├── docker/
│   ├── Dockerfile
│   ├── Dockerfile.worker          → imagem separada para os workers de fila (Dossiê 14)
│   └── docker-compose.yml         → ambiente local (Postgres, Redis, Core API, Worker)
│
├── .github/workflows/            → pipelines de CI/CD (Seção 12)
├── .env.example
└── package.json
```

### 3.1 Responsabilidade de cada parte de alto nível

- **`modules/`**: toda a regra de negócio da plataforma, um módulo por domínio (Dossiê 13 detalha os 24). É a única parte do código que muda quando um requisito de produto muda.
- **`common/`**: infraestrutura transversal de *framework* (guards, interceptors, decorators) — código que **sabe** que existe HTTP/NestJS, mas **não sabe nada** sobre regra de negócio de transporte escolar. Reutilizado por todos os módulos.
- **`shared/`**: o "kernel compartilhado" de tipos e enums que mais de um módulo precisa referenciar sem criar dependência circular entre módulos de negócio — deliberadamente mantido pequeno (um enum `Role` aqui é aceitável; uma regra de negócio aqui não é).
- **`infra/`**: toda integração com o mundo externo (banco, cache, fila, storage, provedores terceiros) — implementa as interfaces (`Ports`) que o `domain`/`application` de cada módulo define, nunca o contrário.
- **`config/`**: única fonte de verdade de configuração, validada no boot (falha rápido — a aplicação nunca sobe com uma variável de ambiente crítica faltando ou malformada).
- **`prisma/`**: schema de banco, migrations e seed — nenhuma query SQL manual fora deste diretório.
- **`test/`**: espelha a estrutura de `modules/`, nunca misturado dentro de cada módulo como arquivos `.spec.ts` soltos — decisão de manter os três níveis de teste (Seção 9) fisicamente separados por velocidade de execução (unitário roda em segundos no watch mode; integração/E2E rodam à parte, no CI).

---

## 4. Autenticação

### 4.1 Múltiplos identificadores de login (e-mail, celular, CPF)

O usuário informa **qualquer um** dos três identificadores na tela de login; o backend resolve qual `Usuario` aquilo corresponde através de um índice único combinado (e-mail único quando presente, telefone único quando presente, CPF único quando presente — os três campos são opcionalmente preenchidos na entidade `Usuario`, Dossiê 8 Seção 2, mas ao menos um é obrigatório). CPF como identificador de login é relevante especialmente para o papel Motorista/Responsável em cenários onde a pessoa não lembra qual telefone/e-mail usou no cadastro (cenário comum reportado por produtos B2C brasileiros de perfil semelhante). O método de verificação subsequente (Seção 4.2) depende do papel, não do identificador usado para localizar a conta.

### 4.2 Fluxo de emissão de tokens

Reafirma e detalha o Dossiê 9 (Seção 5.1) do ponto de vista de implementação:

1. Identificação (Seção 4.1) → resolução do(s) `VinculoPapel` ativo(s).
2. Verificação: OTP (motorista/monitor/responsável) via SMS/WhatsApp, ou e-mail+senha (+2FA quando habilitado, gestor/empresa/escola/admin).
3. Emissão de **JWT de acesso** (algoritmo assimétrico RS256 — permite que outros serviços, como o Realtime Gateway, validem o token com a chave pública sem precisar consultar o Core API a cada conexão) com claims mínimas: `sub` (usuario_id), `tenant_id`, `papel`, `vinculo_id`, `iat`/`exp` (curta duração — 15 minutos).
4. Emissão de **refresh token** opaco (não JWT — um identificador aleatório de alta entropia), persistido no banco com hash (nunca em texto plano, mesmo sendo um token interno), vinculado a um registro de **sessão** (Seção 4.3), com duração longa (30 dias) e rotação a cada uso (Seção 4.4).

### 4.3 Sessões e dispositivos confiáveis

Cada refresh token emitido está associado a um registro de `Sessao`: `usuario_id`, `dispositivo` (modelo, SO, identificador único de instalação do app — não IMEI, por privacidade, mas um UUID gerado na instalação), `ip_criacao`, `user_agent`, `data_criacao`, `data_ultimo_uso`, `revogado_em` (nulo se ativa). Isso permite:
- **Tela "Meus dispositivos"** no perfil do usuário (Dossiê 11, Seção 3.6/4.6), listando todas as sessões ativas com opção de revogar individualmente qualquer uma (ex. "sair remotamente" de um celular perdido).
- **Dispositivo confiável**: um dispositivo que já completou OTP com sucesso uma vez pode ser marcado como confiável (opt-in do usuário), reduzindo a fricção de exigir OTP a cada login subsequente **naquele mesmo dispositivo** — mas nunca elimina a exigência de OTP em um dispositivo novo/desconhecido, que é o principal vetor de proteção contra conta comprometida.

### 4.4 Refresh, revogação e logout

- **Refresh com rotação**: a cada uso do refresh token para obter um novo par de tokens, o refresh token antigo é invalidado e um novo é emitido (*refresh token rotation*) — se um refresh token já usado for apresentado novamente (sinal de que foi roubado e usado por duas partes), **toda a família de tokens daquela sessão é revogada preventivamente** e o usuário é forçado a autenticar novamente.
- **Logout**: revoga o refresh token (e a sessão associada) daquele dispositivo especificamente — o JWT de acesso em memória continua tecnicamente válido até expirar (máximo 15 minutos), risco aceito e documentado dado o curto tempo de vida.
- **Revogação administrativa**: o Gestor pode revogar todas as sessões de um Motorista desligado; o Admin Rotta pode revogar todas as sessões de um tenant inteiro (ex. suspeita de comprometimento) — ambas as ações são eventos auditados (Capítulo 16 do Dossiê 8).
- **Lista de negação (denylist) de curta duração**: para o caso raro em que um JWT de acesso precisa ser invalidado antes de expirar (ex. usuário teve papel removido no meio da validade do token), um cache Redis de denylist por `jti` (identificador único do token) é consultado no middleware de autenticação — TTL do registro de denylist igual ao tempo restante de validade do token, nunca mais que isso.

### 4.5 2FA (estrutura preparada desde o MVP, ativação em V2)

O schema de `Usuario` já reserva os campos (`totp_secret` criptografado, `totp_habilitado`) desde o MVP, mesmo que a ativação de 2FA por TOTP (Google Authenticator/Authy) só seja exposta na UI a partir de V2 para papéis administrativos (Gestor/Empresa/Admin Rotta) — evita uma migração de schema disruptiva quando a funcionalidade for priorizada. O fluxo de login (Seção 4.2, passo 3) já contempla o passo condicional de 2FA como parte do contrato desde o desenho inicial.

### 4.6 Armazenamento de token no cliente

- **App mobile**: `expo-secure-store` (Keychain no iOS, Keystore no Android) — nunca `AsyncStorage` puro, que não é criptografado.
- **Painel Web**: cookie `httpOnly`, `secure`, `sameSite=strict` para o refresh token (inacessível a JavaScript, mitigando XSS); o JWT de acesso pode viver em memória da aplicação (nunca em `localStorage`).

---

## 5. Autorização — RBAC aplicado

### 5.1 Modelo de implementação

Cada requisição autenticada carrega, no JWT, `tenant_id` e `papel` (resolvidos no login). Um `RolesGuard` (NestJS) intercepta toda rota decorada com `@Roles(...)`, validando o papel do usuário contra a lista de papéis permitidos daquela rota **antes** de qualquer código de controller executar. Um `TenantGuard` complementar garante que todo `tenant_id` usado em qualquer operação vem do token (nunca de um parâmetro de URL/body do cliente), e o inicializa como contexto de sessão do Prisma para que a RLS do PostgreSQL (Capítulo 15) seja a última linha de defesa, mesmo que o `RolesGuard` tenha uma falha.

### 5.2 Matriz de permissões (reafirmando e fechando o Dossiê 8, Seção 2.4, no nível de política de autorização de API)

| Papel | Escopo de acesso | Observação de implementação |
|---|---|---|
| **Admin Rotta** | Cross-tenant, mediante guard próprio (`AdminGuard`) distinto do `TenantGuard` comum — nunca o mesmo caminho de código dos demais papéis | Toda rota do namespace `/admin/*` exige esse guard; toda chamada gera evento de auditoria automaticamente via interceptor dedicado |
| **Empresa** | Tenant próprio, inclusive configurações de cobrança/plano | Único papel autorizado nas rotas `/companies/:id/billing/*` |
| **Gestor** | Tenant próprio, tudo exceto cobrança/plano | Superset de permissões operacionais dentro do tenant |
| **Motorista** | Apenas as próprias rotas/viagens atribuídas; escrita restrita a checklist/ocorrência/localização | `RolesGuard` + verificação adicional de posse (o motorista só pode escrever em uma `Viagem` cujo `motorista_id` bate com o `sub` do token) |
| **Monitor** | Mesmo escopo do Motorista, exceto iniciar/finalizar viagem | — |
| **Responsável** | Apenas os próprios alunos vinculados (`AlunoResponsavel`) | Toda rota de leitura de aluno/viagem/localização filtra adicionalmente por esse vínculo, não apenas por tenant |
| **Escola** | Somente leitura, apenas alunos vinculados àquela escola | Nenhuma rota de escrita é exposta a este papel fora do próprio perfil/configurações |

### 5.3 Autorização de grão fino (além do papel)

Para casos onde "papel" não é suficiente (ex. um Responsável não pode ver dados de outro aluno mesmo sendo do mesmo papel), a checagem de posse/vínculo é feita na camada de `application` (caso de uso), nunca deixada apenas para a RLS de banco — a RLS é a rede de segurança final, não a primeira linha de decisão de produto (que precisa retornar um erro 403 claro, não um resultado vazio silencioso que confundiria o usuário).

---

## 6. Banco de dados: Prisma, Repository Pattern, Services e Transactions

### 6.1 Por que Repository Pattern por cima do Prisma, e não Prisma direto no Service

O Prisma Client já é, por si só, um bom *data mapper* — mas usá-lo diretamente dentro de cada `Service`/caso de uso acopla a lógica de aplicação à API específica do Prisma, dificultando tanto o teste unitário (precisaria mockar o Prisma inteiro) quanto uma eventual troca de estratégia de acesso a dado em um módulo específico (ex. um módulo que precise de uma query SQL crua otimizada para um relatório pesado). A Rotta define, por módulo, uma **interface de repositório** (`ex.: AlunoRepository`, um `Port` no sentido da arquitetura hexagonal, Seção 2) na camada `domain`/`application`, implementada concretamente por uma classe Prisma na camada `infrastructure`. O caso de uso depende só da interface — em teste unitário, uma implementação em memória da mesma interface substitui o Prisma sem esforço.

### 6.2 Onde a transação vive

Toda operação que precisa de atomicidade entre múltiplas escritas (ex.: confirmar checklist de desembarque da última parada + gravar evento `van_vazia_confirmada` + marcar `Viagem` como finalizada) é executada dentro de uma transação Prisma (`$transaction`) **orquestrada na camada de aplicação** (o caso de uso decide o que precisa ser atômico), nunca espalhada implicitamente dentro de múltiplos repositórios que não sabem uns dos outros. Eventos de domínio (Seção 1.5) são publicados **depois** que a transação de banco confirma com sucesso (nunca dentro da transação) — garante que nenhum evento é emitido para uma escrita que acabou sendo revertida.

### 6.3 Middleware de tenant no Prisma

Um middleware do Prisma Client injeta automaticamente a cláusula `tenant_id` em toda query de leitura/escrita de tabelas multi-tenant, como reforço de aplicação **em adição** (nunca em substituição) à RLS de banco (Capítulo 15) — defesa em profundidade: mesmo que um desenvolvedor esqueça de filtrar por tenant em uma query nova, duas camadas independentes (middleware Prisma + RLS Postgres) previnem o vazamento, cada uma capaz de falhar sem que a outra falhe junto.

### 6.4 Migrations

Seguem estritamente o padrão *expand/contract* já definido no Capítulo 16.4 — geridas via Prisma Migrate, aplicadas em pipeline de CI/CD (Seção 12) nunca manualmente em produção, com revisão obrigatória de todo arquivo de migration gerado antes do merge (checagem manual de que a migration não trava a tabela `PosicaoGPS`/`Evento` por mais que um limiar aceitável).

---

## 7. Segurança

### 7.1 Camadas de proteção HTTP padrão

- **Helmet**: cabeçalhos de segurança HTTP padrão (`Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security`, etc.) aplicados globalmente na aplicação NestJS.
- **CORS**: lista explícita de origens permitidas (domínio da Landing Page, domínio do Painel Web) — nunca `*` em produção; o app mobile não é afetado por CORS (não é contexto de navegador), mas ainda assim autenticado por JWT normalmente.
- **Rate limiting**: por IP e por usuário autenticado, com limiares mais agressivos em rotas sensíveis (login, solicitação de OTP, recuperação de senha) para mitigar força bruta e *SMS/WhatsApp pumping* (abuso que gera custo de envio); implementado via um *guard* dedicado apoiado em contadores Redis (Seção 11 do Dossiê 8).
- **CSRF**: mitigado estruturalmente pelo uso de JWT Bearer (não cookie de sessão tradicional) para todas as rotas de API — o único cookie usado é o refresh token `httpOnly`/`sameSite=strict` do painel web (Seção 4.6), que por si só já neutraliza o vetor clássico de CSRF (o atributo `SameSite=Strict` impede o envio do cookie em requisições cross-site).
- **SQL Injection**: mitigado estruturalmente pelo uso exclusivo do Prisma (queries parametrizadas por padrão) — qualquer necessidade pontual de SQL cru (`$queryRaw`, usado apenas em relatórios/analytics de alta performance) é obrigatoriamente parametrizada, nunca por concatenação de string, com revisão de código obrigatória para qualquer uso de `$queryRawUnsafe`.
- **XSS**: o backend nunca renderiza HTML a partir de dado de usuário (é uma API pura); toda saída de texto livre fornecida por usuário (ex. descrição de ocorrência) é tratada como dado, nunca interpretada — a responsabilidade de *escaping* na exibição é do cliente (React/React Native escapam por padrão), reforçada por uma política de `Content-Security-Policy` estrita no painel web.

### 7.2 Criptografia e hashing

- Senhas: hash com **Argon2id** (vencedor da Password Hashing Competition, preferível a bcrypt para novos sistemas), parâmetros calibrados para custo computacional adequado sem degradar a experiência de login.
- Refresh tokens e códigos OTP: armazenados como hash (SHA-256 é suficiente aqui, já que são tokens de alta entropia gerados pelo sistema, não senhas escolhidas por humanos — o vetor de ataque é diferente).
- Dados sensíveis específicos (CPF completo, `biometria_facial_hash`): criptografia de aplicação adicional (AES-256-GCM) com chave gerida por um serviço de gestão de chaves (AWS KMS) — nunca a chave hardcoded ou em variável de ambiente simples.
- Toda comunicação, interna e externa, via TLS 1.2+.

### 7.3 LGPD (aprofundamento operacional do Capítulo 19.4)

- Todo endpoint de leitura aplica minimização de campo por papel **na camada de serialização de resposta** (um `Response DTO` específico por papel consumidor, nunca a entidade completa serializada e "confiada" ao frontend para esconder campos — o frontend nunca deveria ser a única barreira de exposição de dado).
- Endpoint dedicado de **exportação de dados** e **exclusão sob solicitação** (RN-24) para o responsável legal, com fluxo de confirmação e prazo de atendimento monitorado.
- Toda tabela com dado pessoal possui um plano de retenção documentado (Dossiê 8, Seções 16.5/21.4) e um job periódico (Dossiê 14) que aplica expurgo/anonimização automaticamente ao vencer o prazo.

### 7.4 Proteção adicional contra ataques automatizados

- **Força bruta de login/OTP**: bloqueio progressivo (exponential backoff) por combinação de IP+identificador após tentativas falhas consecutivas, com CAPTCHA (ou equivalente) acionado a partir de um limiar, antes de um bloqueio total.
- **Enumeração de usuário**: mensagens de erro de login/recuperação de senha nunca revelam se o identificador existe ou não ("Se este e-mail existir, enviaremos instruções"), mitigando reconhecimento de contas válidas.
- **Abuso de webhook/callback de provedores externos** (pagamento, WhatsApp): toda rota de webhook valida assinatura criptográfica do provedor antes de processar qualquer payload.

---

## 8. Cache (Redis) — reafirmação operacional

O Dossiê 8 (Seção 20) já define o que vai/não vai para cache do ponto de vista de dado. Do ponto de vista de implementação no backend: um módulo `infra/cache` expõe uma interface simples (`get`, `set`, `invalidate`, `getOrSet`) usada pelos casos de uso via injeção de dependência — nunca o cliente Redis chamado diretamente dentro de um módulo de negócio, pelo mesmo motivo do Repository Pattern (Seção 6.1): testabilidade e possibilidade de trocar a implementação sem tocar em regra de negócio. Toda chave de cache segue o padrão `{contexto}:{tenant_id}:{identificador}` (ex. `config:tenant:{id}`, `sessao-rota:{rota_id}:hoje`) — o `tenant_id` sempre presente na chave, mesmo para dados de baixo risco, como disciplina consistente de "nunca esquecer o tenant em lugar nenhum do sistema".

---

## 9. Testes

### 9.1 Pirâmide de testes

| Nível | O que cobre | Ferramenta | Velocidade | Quando roda |
|---|---|---|---|---|
| **Unitário** | Regras de negócio puras da camada `domain` e orquestração da camada `application` (com repositórios/adaptadores mockados) | Jest | Milissegundos por teste, milhares de testes em segundos | A cada salvamento (watch mode local) e em todo push |
| **Integração** | Repositórios reais contra um Postgres/Redis efêmero (Testcontainers), validando que a query Prisma + RLS realmente isola tenants, que migrations aplicam corretamente | Jest + Testcontainers | Segundos a poucos minutos | A cada push/PR |
| **E2E** | Fluxos completos via HTTP contra a aplicação NestJS inteira subida (ex.: login → criar rota → cadastrar aluno → iniciar viagem → checklist → finalizar), incluindo os principais cenários de erro (RN-12, RN-18) | Jest + Supertest (ou Playwright para fluxos que envolvem o painel web) | Minutos | Em todo PR antes de merge, e antes de cada deploy |

### 9.2 O que é obrigatoriamente coberto por teste unitário (não negociável)

Toda regra de negócio numerada (RN-01 a RN-34 dos Capítulos 13/Dossiê 8) tem um teste unitário correspondente, nomeado de forma rastreável à regra (ex. `RN-12: não permite finalizar viagem sem confirmação de van vazia`). Isso transforma a documentação de regras de negócio deste projeto em uma suíte de testes executável — qualquer alteração futura que quebre uma regra de segurança quebra o CI antes de chegar a produção.

### 9.3 Testes de isolamento multi-tenant (categoria própria, tratada com prioridade máxima)

Uma suíte de integração dedicada (rodando contra Postgres real) tenta ativamente "vazar" dado entre dois tenants fictícios em cada endpoint de leitura da API — gerado semi-automaticamente a partir da lista de rotas registradas, garantindo que nenhum endpoint novo seja esquecido dessa cobertura (Capítulo 3, objetivo "zero incidentes de vazamento entre tenants").

---

## 10. Monitoramento e Observabilidade

### 10.1 Health checks

Endpoint `/health` (liveness — o processo está de pé) e `/health/ready` (readiness — o processo está pronto para tráfego, checando conectividade real com Postgres, Redis e a fila) — usados pelo orquestrador de containers (Seção 12) para decidir reinício e roteamento de tráfego.

### 10.2 Métricas

Exposição de métricas no formato Prometheus (`/metrics`): latência por rota (p50/p95/p99), taxa de erro por rota, tamanho e idade das filas BullMQ, número de conexões WebSocket ativas no Realtime Gateway, hit rate do cache Redis. Dashboards (Grafana ou equivalente) construídos sobre essas métricas para visão operacional em tempo real.

### 10.3 Logs estruturados

Reafirmando o Capítulo 17 (Dossiê 8) do ponto de vista de implementação: todo log é um objeto JSON (nunca `console.log` de string livre), emitido através de um logger central (`infra/observability`) injetado via interceptor global que já anexa automaticamente `tenant_id`, `usuario_id`, `id de correlação da requisição` (gerado no início de cada request e propagado por todo o ciclo de vida daquela chamada, inclusive para jobs assíncronos disparados a partir dela) a todo log emitido — nenhum módulo de negócio precisa lembrar de anexar esse contexto manualmente.

### 10.4 Alertas

Regras de alerta configuradas sobre as métricas da Seção 10.2 (ex. taxa de erro 5xx acima de 1% em 5 minutos, fila de notificações crescendo sem ser drenada, latência p95 acima do SLO do Capítulo 20.4), notificando o time via canal dedicado (Slack/PagerDuty), com rota de escalonamento clara para incidentes que envolvam o caminho crítico de segurança (checklist, GPS, notificação de embarque).

### 10.5 Tracing distribuído

Adotado desde o MVP, mesmo em arquitetura de monólito (com um único serviço adicional, o Realtime Gateway, já cruzando o processo) — via OpenTelemetry, propagando o `id de correlação` entre Core API, Realtime Gateway e Worker de Notificações. Investimento que se paga cedo: no dia em que um módulo for extraído (Seção 1.4), a observabilidade entre serviços já existe, em vez de precisar ser construída às pressas no momento da migração.

---

## 11. Uploads e armazenamento de arquivos (visão de arquitetura backend)

Reafirmando o padrão do Dossiê 9 (Seção 5.5) do ponto de vista de backend: o Core API **nunca recebe o binário do arquivo** em nenhuma rota (documentos de motorista/veículo, fotos de perfil, fotos de aluno). O fluxo é sempre: (1) cliente solicita URL pré-assinada informando tipo de entidade/documento, (2) Core API valida permissão e gera a URL do S3 com política restrita (bucket privado, prefixo por tenant, expiração curta), (3) cliente faz upload direto ao S3, (4) cliente confirma ao Core API (ou um evento de criação de objeto no S3 dispara um webhook interno), (5) Core API cria o registro `Documento` e, quando aplicável, enfileira o job assíncrono de OCR/validação (Dossiê 14). Vantagem arquitetural: o Core API nunca precisa de mais memória/CPU/banda por causa de upload de arquivo — esse custo é inteiramente absorvido pelo S3.

---

## 12. Deploy e CI/CD

### 12.1 Containerização

Duas imagens Docker distintas a partir do mesmo código-fonte: uma para o **Core API** (processo HTTP/WebSocket do Realtime Gateway) e uma para o **Worker** (consumidor das filas BullMQ, Dossiê 14) — permite escalar API e Worker de forma independente (mais réplicas de Worker em horários de pico de processamento assíncrono, sem replicar o Core API desnecessariamente). `docker-compose.yml` local sobe Postgres, Redis, Core API e Worker para desenvolvimento com paridade de produção.

### 12.2 Pipeline de CI (a cada Pull Request)

1. Instalação de dependências (com cache de lockfile).
2. Lint + checagem de tipos TypeScript (falha o build em qualquer erro de tipo — reforça o contrato compartilhado do monorepo, Capítulo 38).
3. Testes unitários (Seção 9.1).
4. Testes de integração (sobem Postgres/Redis efêmeros via Testcontainers no próprio runner de CI).
5. Build da imagem Docker (validação de que o build de produção realmente compila).
6. Verificação de vulnerabilidades de dependências (Dependabot/Snyk, Capítulo 19.5) — bloqueia merge em caso de vulnerabilidade crítica sem *patch*.

### 12.3 Pipeline de CD (deploy)

1. Merge na branch principal dispara build da imagem de produção, taggeada com o hash do commit.
2. Testes E2E rodam contra um ambiente de *staging* provisionado com a nova imagem.
3. Migration do banco aplicada (sempre aditiva, Seção 6.4) como etapa própria e auditável do pipeline, nunca embutida silenciosamente no boot da aplicação.
4. Deploy em produção via estratégia de *rolling update* (múltiplas réplicas, substituição gradual, sem downtime) — o health check de readiness (Seção 10.1) garante que tráfego só é roteado para uma réplica nova depois que ela confirma estar pronta.
5. Rollback automático se as métricas de erro da nova versão excederem um limiar imediatamente após o deploy (monitoramento ativo por uma janela curta pós-deploy).

### 12.4 Variáveis de ambiente e segredos

Toda configuração sensível (credenciais de banco, chaves JWT, credenciais de provedores externos) é injetada via variáveis de ambiente **nunca commitadas** — geridas por um gerenciador de segredos (AWS Secrets Manager/Parameter Store, ou o equivalente do provedor de hospedagem na fase inicial, Dossiê 9 Seção 2.8), com rotação periódica das credenciais mais sensíveis (chave de assinatura JWT, credenciais de banco). O arquivo `.env.example` no repositório documenta **quais** variáveis existem e seu propósito, nunca valores reais. O schema de validação de ambiente (`config/env.validation.ts`) garante que a aplicação recusa subir se uma variável obrigatória estiver ausente ou com formato inválido — falha explícita no boot é sempre preferível a uma falha silenciosa em produção horas depois.
