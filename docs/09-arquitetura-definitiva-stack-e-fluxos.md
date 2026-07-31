# Dossiê 9 — Arquitetura Definitiva, Stack Tecnológica e Fluxos de Comunicação

> Este dossiê fecha a decisão de arquitetura e stack da Rotta como um sistema **multiplataforma completo**: Landing Page, Painel Administrativo Web, App Android, App iOS, Backend, APIs, Banco de Dados, serviço de GPS em tempo real e sistema de notificações — todos publicáveis nas lojas oficiais (Google Play e Apple App Store). Ele aprofunda e torna definitivas as direções já apontadas nos Capítulos 14, 17, 18, 33 e 34 (`docs/04-...md`, `docs/06-...md`, `docs/07-...md`), comparando explicitamente cada alternativa pedida e justificando a escolha final. Continua sendo um documento de arquitetura — nenhum código é escrito aqui.

---

## 1. Decisão consolidada (resumo executivo)

| Camada | Escolha final |
|---|---|
| Frontend Web (Landing + Painel) | **Next.js** (React) |
| Aplicativo mobile (Android + iOS) | **React Native com Expo** (+ EAS Build/Submit) |
| Backend | **NestJS** (Node.js/TypeScript) |
| Banco de dados | **PostgreSQL** (+ PostGIS + particionamento nativo) |
| Autenticação | **JWT** como mecanismo de sessão em toda a plataforma, **OTP por telefone** como método primário para papéis de campo/família, **OAuth (Google)** como SSO para papéis institucionais (V2), **Magic Link** como conveniência para papéis web-only (Escola) |
| Mapas | **Híbrido**: Google Maps Platform (geocodificação e cálculo de rota/distância) + Mapbox (renderização visual do mapa, estilizável no tema escuro da marca) |
| Notificações | **Firebase (FCM/APNs)** direto, orquestrado pelo nosso próprio módulo de notificações — não OneSignal |
| Hospedagem | **Fase MVP**: Vercel (web) + Railway/Render (backend/serviços) · **Fase de escala nacional**: AWS (ECS/EKS, RDS/Aurora Postgres, ElastiCache, S3, CloudFront, SQS) |
| Storage de arquivos | **AWS S3** (com upload direto via URL pré-assinada) |
| Realtime | **Socket.IO** sobre o Realtime Gateway dedicado, para o canal de downlink (mapa ao vivo); uplink de GPS do motorista via HTTP em lote/MQTT, não Socket.IO |

O fio condutor de todas as escolhas de linguagem é deliberado: **TypeScript de ponta a ponta** (backend, painel web e app mobile), permitindo compartilhar tipos, schemas de validação e lógica de cliente de API entre os três através de um monorepo (Capítulo 38) — o maior multiplicador de velocidade de desenvolvimento e de facilidade de manutenção disponível para um time pequeno que precisa entregar quatro produtos (landing, painel, app Android, app iOS) com consistência.

---

## 2. Comparativos técnicos detalhados

### 2.1 Frontend Web — Next.js vs. React (puro) vs. Vue

| Critério | **Next.js** | React (SPA pura) | Vue |
|---|---|---|---|
| SEO / SSR para a Landing Page | ✅ Nativo (SSR/SSG/ISR embutidos) | ❌ Precisa montar infraestrutura própria de SSR | ✅ Via Nuxt (framework equivalente) |
| Velocidade de desenvolvimento do Painel (roteamento, otimização de imagem, API routes) | ✅ Tudo incluso, zero configuração adicional | ❌ Precisa escolher/montar router, bundler, otimizações manualmente | ✅ Boa, via Nuxt |
| Compartilhamento de conhecimento/código com o app mobile (React Native) | ✅ Mesma linguagem de componentes (React), mesmos padrões mentais, possibilidade de compartilhar lógica de UI não visual (hooks, validação) via pacote comum no monorepo | ✅ Idem | ❌ Vue não compartilha modelo de componente com React Native — fragmentaria o time em dois paradigmas de UI diferentes |
| Tamanho do mercado de talentos no Brasil | ✅ Maior pool disponível hoje | ✅ | ⚠️ Pool menor que React no mercado brasileiro |
| Maturidade do ecossistema de design system (shadcn/ui, Radix, Tailwind) | ✅ Ecossistema líder, integra nativamente | ✅ | ⚠️ Equivalentes existem, mas com menos opções prontas de altíssima qualidade visual |

**Decisão**: **Next.js**. A Landing Page exige SSR/SSG de verdade para SEO (motivo suficiente para descartar uma SPA React pura sem framework). Entre Next.js e Vue/Nuxt, o desempate é estratégico, não técnico: como o app mobile já será React Native, manter o time inteiro em React (web e mobile) permite que um engenheiro transite entre painel web e app mobile sem trocar de paradigma mental — ativo especialmente valioso em uma equipe pequena que precisa ser multifuncional nos primeiros anos.

### 2.2 Aplicativo — React Native vs. Flutter

| Critério | **React Native (Expo)** | Flutter |
|---|---|---|
| Linguagem compartilhada com backend/web | ✅ TypeScript — mesmo time, mesmos tipos, mesmos schemas de validação | ❌ Dart — ecossistema isolado, exige squad e conhecimento próprios |
| Velocidade de publicação em ambas as lojas | ✅ EAS Build/Submit automatiza build e envio para Google Play e App Store a partir do mesmo pipeline | ✅ Também publica em ambas, pipeline próprio (Codemagic/Fastlane) |
| Atualização rápida de bugs sem esperar aprovação de loja | ✅ Expo Updates (OTA) para mudanças de JS/lógica de negócio — crítico para um produto de segurança poder corrigir rápido | ⚠️ Existe (Shorebird), mas com adoção/maturidade bem menor que o OTA do Expo |
| Performance para o perfil de uso da Rotta (formulários, listas, mapa, GPS em background) | ✅ Suficiente e comprovada em escala (apps como o próprio app do Uber/da maioria de apps logísticos no Brasil usam RN) — o gargalo real do produto é rede/GPS, não renderização de UI | ✅ Também excelente, com vantagem em UI graficamente intensa (não é o caso central deste produto) |
| Acesso a módulos nativos críticos (geolocalização em segundo plano, notificação push, câmera para reconhecimento facial) | ✅ Ecossistema maduro de bibliotecas (`expo-location`, `expo-notifications`, `expo-camera`), com possibilidade de *custom dev client* quando um módulo nativo específico for necessário | ✅ Também maduro, plugins equivalentes disponíveis |
| Custo de contratação e curva de aprendizado | ✅ Baixo — qualquer desenvolvedor React já sabe 80% do necessário | ⚠️ Exige aprender Dart e o framework de widgets do zero, mesmo para devs React experientes |

**Decisão**: **React Native com Expo**. O critério decisivo explicitamente pedido pelo usuário — "código compartilhado" — é resolvido de forma direta: DTOs, schemas de validação (ex. Zod) e clientes de API gerados a partir do contrato do backend são consumidos, sem duplicação, tanto pelo painel web quanto pelo app. Isso reduz bugs de contrato (campo renomeado no backend quebrando silenciosamente o app) a erros de compilação detectados antes do deploy — ganho direto em "facilidade de manutenção". O Expo, especificamente (em vez de React Native puro/bare), é escolhido pela conveniência de build/submit gerenciado (EAS) e pelo canal de atualização OTA, ambos tratados em detalhe na Seção 6.

### 2.3 Backend — NestJS vs. Laravel vs. Spring Boot

| Critério | **NestJS** | Laravel | Spring Boot |
|---|---|---|---|
| Linguagem compartilhada com frontend/mobile | ✅ TypeScript | ❌ PHP | ❌ Java/Kotlin |
| Velocidade de desenvolvimento no estágio de MVP | ✅ Alta (estrutura modular pronta, decorators, injeção de dependência nativa) | ✅ Alta (framework maduro, muito produtivo para CRUD) | ⚠️ Mais verboso, mais boilerplate, ciclo de iteração mais lento |
| Suporte nativo a WebSocket/Gateway para o Realtime Gateway | ✅ Gateway de WebSocket é cidadão de primeira classe do framework (`@WebSocketGateway`) | ⚠️ Requer infraestrutura adicional (Laravel Echo + Pusher/soketi) — na prática, o realtime acabaria sendo implementado fora do PHP mesmo assim | ✅ Suporte via Spring WebFlux/STOMP, robusto mas mais complexo de configurar |
| Adequação a uma arquitetura modular limpa (fronteiras de domínio do Capítulo 14) | ✅ Módulos, providers e interfaces são conceitos nativos do framework — a arquitetura hexagonal do Capítulo 14.5 mapeia quase 1:1 para as convenções do NestJS | ✅ Possível, mas exige mais disciplina manual (o framework não impõe fronteiras) | ✅ Excelente para isso (é o forte histórico do ecossistema Spring/DDD) |
| Desempenho em cargas I/O-bound (o perfil real da Rotta: muitas conexões concorrentes, pouco processamento pesado por requisição) | ✅ Muito bom (Node.js é otimizado para I/O concorrente, exatamente o padrão de tráfego do produto) | ✅ Bom, com ressalvas de concorrência do modelo tradicional PHP-FPM | ✅ Excelente, JVM é historicamente forte em alta concorrência, mas é "canhão para matar mosquito" no estágio de MVP |
| Custo de infraestrutura (footprint de memória/CPU por instância) | ✅ Leve, inicia rápido, ótimo para containers pequenos | ✅ Leve | ⚠️ JVM tem footprint de memória maior, custo mais alto por instância em escala inicial |
| Tamanho do time necessário para operar bem | ✅ Pequeno (mesmo time full-stack TS consegue cobrir backend) | ✅ Pequeno | ⚠️ Tende a exigir especialistas dedicados de backend Java, adicionando uma segunda especialização ao time cedo demais |

**Decisão**: **NestJS**. Reforça a aposta estratégica central desta arquitetura: um único ecossistema de linguagem (TypeScript) cobrindo 100% da superfície de produto (backend, painel, app), o que é o maior alavancador de velocidade e manutenibilidade para uma equipe enxuta cobrindo quatro frentes de entrega simultâneas. Spring Boot seria a escolha certa se a Rotta já nascesse como uma operação enterprise com dezenas de engenheiros backend dedicados — não é o caso do MVP nem do V2. Laravel perderia de qualquer forma a necessidade de um serviço realtime em Node, fragmentando a stack sem necessidade.

### 2.4 Banco de Dados — PostgreSQL vs. MySQL

*(Já analisado em profundidade no Dossiê 8, Seção 22 — reafirmado aqui em versão resumida para fechar o comparativo pedido.)*

| Critério | **PostgreSQL** | MySQL |
|---|---|---|
| Row-Level Security nativa (pilar do isolamento multi-tenant) | ✅ Nativo | ❌ Sem equivalente nativo maduro |
| Extensão geoespacial (PostGIS) | ✅ Padrão de mercado, maduríssimo | ⚠️ Suporte espacial mais limitado |
| Particionamento declarativo (crítico para a tabela de GPS) | ✅ Nativo e maduro | ⚠️ Existe, ecossistema de ferramentas mais limitado |
| JSONB indexável (configuração de tenant, payload de eventos) | ✅ Nativo e performático | ⚠️ Suporte a JSON menos maduro |

**Decisão**: **PostgreSQL**, sem ressalvas — nenhum dos dois pilares críticos do domínio (isolamento multi-tenant via RLS, geoespacial via PostGIS) é atendido pelo MySQL no mesmo nível de maturidade.

### 2.5 Autenticação — JWT vs. OAuth vs. Magic Link

Estes três não são mutuamente exclusivos — são **peças complementares** que respondem a perguntas diferentes, e tratá-los como alternativas competindo pelo mesmo papel seria um erro de modelagem:

| Mecanismo | Pergunta que responde | Papel na Rotta |
|---|---|---|
| **JWT** | "Como o sistema mantém a sessão autenticada em cada requisição, de forma stateless e escalável?" | **Mecanismo de sessão universal** — todo usuário autenticado, de qualquer papel, por qualquer método de login abaixo, recebe um JWT de acesso de curta duração + refresh token de longa duração revogável. É a base técnica de autorização em toda a plataforma. |
| **OTP por telefone** (não listado explicitamente, mas é o método primário de entrada) | "Como o motorista/responsável, que não pensa em termos de senha, entra no app com fricção mínima?" | Login primário para **Motorista, Monitor e Responsável** — telefone + código enviado por SMS/WhatsApp, sem senha para lembrar. Emite o JWT ao final da verificação. |
| **OAuth (Google)** | "Como uma conta institucional (Empresa/Gestor/Secretaria) entra usando uma identidade corporativa já existente, sem criar mais uma senha?" | SSO opcional para **Gestor e Empresa** a partir de V2 — reduz fricção de onboarding para quem já usa Google Workspace, e delega a robustez de segurança de senha a um provedor especializado. Ao final do fluxo OAuth, a Rotta ainda emite seu próprio JWT — o OAuth só resolve a etapa de *quem é você*, nunca substitui o mecanismo de sessão da Rotta. |
| **Magic Link** | "Como um perfil que só acessa o painel web ocasionalmente (Escola) entra sem precisar lembrar senha nem ter celular à mão para OTP?" | Método de conveniência para o papel **Escola** (e opcionalmente Gestor/Empresa) no painel web — um link de uso único enviado por e-mail, com expiração curta, que loga o usuário e emite o JWT. Evitado para Motorista/Responsável porque exigiria abrir o e-mail no celular no meio de uma rota — pior UX que o OTP por telefone para esse contexto de uso. |

**Decisão final**: JWT como espinha dorsal universal; OTP por telefone (SMS/WhatsApp) como porta de entrada principal para os papéis de campo e família (alinhado ao hábito digital das personas do Capítulo 5); Magic Link como conveniência para Escola; OAuth (Google) como SSO institucional a partir de V2. Autenticação administrativa interna (Admin Rotta) sempre por e-mail/senha com 2FA obrigatório (TOTP), nunca por OTP de telefone ou magic link, dado o nível de acesso cross-tenant desse papel (Capítulo 19).

### 2.6 Mapas — Google Maps vs. Mapbox

| Critério | Google Maps Platform | Mapbox |
|---|---|---|
| Qualidade de geocodificação de endereços no Brasil (incluindo áreas periféricas/rurais, onde grande parte das rotas escolares opera) | ✅ Historicamente superior no Brasil | ⚠️ Boa, mas com lacunas de precisão em regiões menos densas |
| Customização visual do mapa (tema escuro, paleta azul/branco/cinza do design system) | ⚠️ Customizável, mas com menos controle fino de estilo | ✅ Controle de estilo pixel a pixel — encaixe perfeito com o Capítulo 28 (Design System) |
| Custo em escala (milhões de carregamentos de mapa/mês, cenário de operação nacional) | ⚠️ Cobrança por carregamento/requisição tende a crescer rapidamente em escala | ✅ Geralmente mais competitivo em volume alto |
| Reconhecimento/familiaridade do usuário final | ✅ Hábito diário da maioria dos brasileiros | ⚠️ Menos familiar visualmente, mas irrelevante dentro de um app com UI própria |

**Decisão**: **abordagem híbrida**, abstraída atrás do `MapaGateway` já definido no Capítulo 18.3 (de forma que qualquer lado possa ser trocado sem tocar em regra de negócio):
- **Google Maps Platform** para as chamadas de **Geocoding API** (converter endereço em coordenada no cadastro de aluno/escola/parada) e **Directions/Distance Matrix API** (cálculo de rota e ETA) — onde a qualidade do dado é operacionalmente crítica e o volume de chamadas é relativamente baixo (acontece no cadastro, não a cada segundo de rastreamento).
- **Mapbox** para a **renderização visual do mapa** dentro do app e do painel — onde o volume de "tiles" carregados é altíssimo (todo motorista, toda tela de mapa ao vivo, todo responsável acompanhando), e onde o controle de estilo escuro/customizado é um requisito direto de design premium (Capítulo 27/28).

Este desenho paga o melhor dos dois mundos sem comprometer nenhum dos dois critérios (precisão de dado x controle visual/custo).

### 2.7 Notificações — Firebase (FCM/APNs) vs. OneSignal

| Critério | **Firebase direto** | OneSignal |
|---|---|---|
| Controle sobre lógica de orquestração multicanal (push + WhatsApp + SMS + prioridade crítica) | ✅ Total — já temos um módulo próprio de notificações desenhado (Capítulo 14.3/18) que orquestra os 4 canais; adicionar o Firebase como "mais um canal" dentro dele é consistente | ⚠️ OneSignal resolveria só o canal push, deixando WhatsApp/SMS de qualquer forma orquestrados por código próprio — duas fontes de lógica de retry/prioridade a manter |
| Custo em escala | ✅ Gratuito para volume de push | ⚠️ Camadas pagas relevantes em alto volume |
| Superfície de dados de terceiros (LGPD) | ✅ Um fornecedor a menos com acesso a tokens de dispositivo/dados de usuário | ⚠️ Mais um processador de dados a mapear no RIPD (Capítulo 19.4) |
| Velocidade de implementação de features avançadas (segmentação, A/B test de notificação) | ⚠️ Precisamos construir nós mesmos | ✅ Pronto de fábrica |

**Decisão**: **Firebase (FCM para Android, APNs via Firebase para iOS)**, integrado diretamente ao módulo próprio de notificações já desenhado. A "conveniência de fábrica" do OneSignal não compensa introduzir um terceiro fornecedor no caminho crítico de uma notificação de segurança (embarque/desembarque/SOS) quando já existe, por desenho, um orquestrador multicanal próprio que precisa lidar com WhatsApp e SMS de qualquer forma — manter os 4 canais sob a mesma lógica de retry/prioridade (RN-17) é mais simples de manter do que metade nativa, metade terceirizada.

### 2.8 Hospedagem — Vercel vs. Railway vs. Render vs. AWS vs. GCP

| Critério | Vercel | Railway | Render | **AWS** | GCP |
|---|---|---|---|---|---|
| Ideal para hospedar o Next.js (Landing + Painel) | ✅ Melhor DX do mercado para Next.js | ⚠️ Possível, não especializado | ⚠️ Possível, não especializado | ✅ Via Amplify/CloudFront+S3, mais setup | ✅ Via Cloud Run, mais setup |
| Adequado para o Core API (NestJS) + Realtime Gateway (WebSocket persistente, workers) | ❌ Funções serverless não sustentam WebSocket persistente nem workers de longa duração | ✅ Ótimo para MVP (containers simples, DX rápida) | ✅ Ótimo para MVP (idem) | ✅ Melhor opção para escala nacional (ECS Fargate → EKS) | ✅ Também excelente (Cloud Run/GKE) |
| Controle fino de autoscaling, redes privadas (VPC), certificações de compliance para clientes públicos (V3 B2G) | ❌ | ⚠️ Limitado | ⚠️ Limitado | ✅ Mais maduro e mais reconhecido por órgãos públicos em licitação | ✅ Também maduro |
| Custo/operação na fase MVP (equipe pequena, sem DevOps dedicado) | ✅ | ✅ | ✅ | ⚠️ Exige mais conhecimento operacional desde o início | ⚠️ Idem |
| Tamanho do pool de talento DevOps/SRE no Brasil | — | — | — | ✅ Maior | ⚠️ Menor que AWS |

**Decisão em duas fases** (mudança de infraestrutura sem mudança de arquitetura de aplicação, graças aos serviços já serem containerizados desde o início):
- **Fase MVP/V2 inicial**: **Vercel** para Landing Page e Painel Web (Next.js) — DX incomparável e custo baixo neste estágio; **Railway ou Render** para o Core API, Realtime Gateway e Workers (containers Docker), incluindo Postgres e Redis gerenciados — permite ao time focar 100% em produto, sem operar Kubernetes prematuramente.
- **Fase de escala nacional (V2 avançado/V3)**: migração do backend para **AWS** (ECS Fargate evoluindo para EKS conforme a necessidade real de orquestração cresça), RDS/Aurora PostgreSQL, ElastiCache (Redis), S3, CloudFront, SQS, e (quando aplicável) IoT Core/EMQX para MQTT — pela combinação de maturidade de autoscaling fino, maior pool de talento DevOps brasileiro e maior reconhecimento de compliance/segurança em processos de licitação pública (relevante para o objetivo B2G do Capítulo 24). GCP permanece uma alternativa tecnicamente equivalente e viável, mas AWS é a recomendação de desempate por esses dois fatores práticos.
- Vercel pode permanecer hospedando o frontend indefinidamente (ele consome as mesmas APIs independentemente de onde rodam) — a migração de fase não exige trocar tudo de uma vez.

### 2.9 Storage — Supabase vs. AWS S3

| Critério | Supabase Storage | **AWS S3** |
|---|---|---|
| Maturidade de políticas de ciclo de vida (arquivamento automático de GPS histórico/documentos antigos, Capítulo 21.4) | ⚠️ Básico | ✅ Lifecycle policies maduras (transição automática para armazenamento frio) |
| Controle de acesso fino por tenant/objeto (IAM por prefixo) | ⚠️ Mais limitado | ✅ Políticas de IAM granulares por bucket/prefixo — essencial para isolamento multi-tenant de documentos |
| Upload direto do cliente sem passar pelo backend (URL pré-assinada) | ✅ Suportado | ✅ Padrão de mercado, extremamente maduro |
| CDN global integrada | ⚠️ Depende de configuração adicional | ✅ CloudFront nativo |
| Independência de qualquer decisão sobre banco de dados/BaaS | — | ✅ S3 pode ser adotado independentemente de qual banco/hospedagem for usado na fase MVP |

**Decisão**: **AWS S3** desde o MVP, independentemente da escolha de hospedagem da fase inicial (Seção 2.8) — padronizar em S3 desde o dia 1 evita uma migração futura de potencialmente milhões de arquivos binários (documentos, fotos de alunos) quando a Rotta migrar de Railway/Render para AWS no backend. Uploads sempre via **URL pré-assinada** (o cliente — app ou painel — sobe o arquivo direto para o S3, sem o arquivo trafegar pelo Core API), reduzindo custo e latência do backend.

### 2.10 Realtime — WebSockets vs. Socket.IO vs. Supabase Realtime

| Critério | WebSocket puro | **Socket.IO** | Supabase Realtime |
|---|---|---|---|
| Reconexão automática e fallback em redes instáveis (relevante: motoristas em áreas periféricas/rurais com conectividade ruim) | ❌ Precisa implementar manualmente | ✅ Nativo (fallback para long-polling quando WebSocket é bloqueado) | ✅ Também lida com reconexão |
| Modelo de "salas"/canais por permissão (tenant, rota, aluno — RN-08/09/25) | ❌ Precisa implementar manualmente | ✅ Nativo (namespaces/rooms) | ⚠️ Modelo baseado em mudanças de linha do Postgres, menos natural para canais de permissão customizados |
| Integração nativa com o framework do backend (NestJS) | ⚠️ Manual | ✅ Adaptador oficial do NestJS (`@nestjs/platform-socket.io`) | ❌ Amarra a arquitetura de realtime ao Supabase especificamente |
| Adequação ao caso de uso (o payload de posição no mapa **não é** a linha bruta do banco — é uma posição já processada por geofencing/ETA) | ✅ Se implementado à mão para isso | ✅ | ❌ O modelo "notifique quando uma linha do Postgres mudar" não encaixa bem quando é preciso computar geofencing/ETA no servidor antes de emitir |

**Decisão**: **Socket.IO**, rodando dentro do Realtime Gateway (serviço já separado desde o MVP, Capítulo 14.1), para o **downlink** (servidor → painel do gestor, servidor → app do responsável assistindo o mapa ao vivo). Para o **uplink** (motorista → servidor), reafirma-se a recomendação do Capítulo 20.2: HTTP em lote (a cada 5–10s) ou MQTT, nunca uma conexão Socket.IO persistente do lado do motorista — o uplink prioriza eficiência de bateria/rede acima de tudo, enquanto o downlink prioriza a robustez de reconexão e o modelo de salas que o Socket.IO já resolve prontamente.

---

## 3. Diagrama de infraestrutura completa

```
                                   ┌───────────────────────┐        ┌───────────────────────┐
                                   │   Google Play Store    │        │   Apple App Store       │
                                   └───────────┬───────────┘        └───────────┬───────────┘
                                               │ distribuição de binário         │
                                   ┌───────────▼─────────────────────────────────▼───────────┐
                                   │        App Mobile (React Native + Expo)                  │
                                   │   Motorista/Monitor  |  Responsável                       │
                                   └───────────┬──────────────────────┬────────────────────────┘
                                               │ HTTPS/REST (JWT)      │ WebSocket (Socket.IO)
                                               │                        │
        ┌──────────────────┐        ┌─────────▼────────────────────────▼─────────┐
        │   Vercel (CDN)     │        │            API Gateway / BFF                │
        │  Landing Page       │◀──────┤  (auth JWT, rate limit, roteamento tenant) │
        │  Painel Web (Next.js│        └─────────┬────────────────────────┬─────────┘
        │  React Query/SWR)   │                  │                        │
        └──────────┬──────────┘         ┌────────▼─────────┐    ┌─────────▼──────────┐
                    │ HTTPS/REST (JWT)   │    Core API        │    │  Realtime Gateway    │
                    │ + Socket.IO        │    (NestJS)         │    │  (NestJS + Socket.IO)│
                    └───────────────────▶│  identity·tenancy·  │    │  ingestão de GPS ·    │
                                          │  fleet·people·      │    │  geofencing · ETA ·   │
                                          │  students·routing·  │    │  pub/sub de posição   │
                                          │  schools·checklist·  │    └─────────┬────────────┘
                                          │  documents·reporting │              │
                                          │  ·billing            │              │
                                          └────────┬─────────────┘              │
                                                    │                             │
                        ┌───────────────────────────┼─────────────────────────────┤
                        │                            │                             │
                 ┌──────▼───────┐          ┌────────▼─────────┐          ┌────────▼────────┐
                 │  PostgreSQL    │          │      Redis         │          │  Fila (SQS/       │
                 │  + PostGIS     │◀────────▶│  (cache + pub/sub) │          │  RabbitMQ)         │
                 │  (RLS multi-   │          └────────────────────┘          └────────┬───────────┘
                 │   tenant,      │                                                    │
                 │   particionado)│                                          ┌─────────▼───────────┐
                 └───────┬────────┘                                          │  Worker de             │
                         │                                                    │  Notificações           │
                 ┌───────▼────────┐                                          │  (NestJS)               │
                 │   AWS S3         │                                         └─────────┬───────────────┘
                 │  (documentos,    │                                                   │
                 │   fotos, GPS     │                          ┌────────────────────────┼─────────────────────────┐
                 │   arquivado)     │                          │                        │                          │
                 └──────────────────┘                 ┌────────▼───────┐      ┌────────▼────────┐      ┌──────────▼─────────┐
                                                        │ Firebase (FCM/  │      │  WhatsApp Cloud   │      │  Twilio/Zenvia (SMS)│
                                                        │  APNs) — Push   │      │  API              │      └────────────────────┘
                                                        └─────────────────┘      └───────────────────┘

        Serviços auxiliares (chamados pelo Core API/Realtime Gateway conforme o fluxo):
        ┌───────────────────────┐   ┌───────────────────────┐   ┌──────────────────────────────┐
        │ Google Maps Platform    │   │  Mapbox (renderização    │   │  Serviço de Verificação        │
        │ (Geocoding/Directions)  │   │  de mapa no cliente)     │   │  Facial (adapter dedicado)      │
        └───────────────────────┘   └───────────────────────┘   └──────────────────────────────┘
```

---

## 4. Como cada serviço conversa com o outro (visão de contrato)

| De | Para | Protocolo | Conteúdo |
|---|---|---|---|
| App Mobile / Painel Web | API Gateway | HTTPS/REST | Todo CRUD (cadastro, checklist, documentos, relatórios), autenticado por JWT Bearer |
| App Mobile (motorista) | Realtime Gateway | HTTP em lote (ou MQTT) | Posições GPS, a cada 5–10s, em lote quando reconectar após período offline |
| App Mobile (responsável) / Painel Web (gestor) | Realtime Gateway | WebSocket (Socket.IO) | Assinatura de canal (`tenant/{id}/rota/{id}` ou `responsavel/{id}/aluno/{id}`), recebendo posições e eventos de checklist ao vivo |
| Core API | PostgreSQL | SQL (via ORM) | Toda leitura/escrita de cadastro e transacional, com `tenant_id` sempre resolvido pela sessão |
| Realtime Gateway | Redis | Pub/Sub + chave de última posição | Posição mais recente por veículo (leitura de baixíssima latência), canal de distribuição para os Sockets conectados |
| Realtime Gateway | PostgreSQL | SQL (assíncrono, em lote) | Persistência da trilha completa de `PosicaoGPS` na tabela particionada, fora do caminho síncrono de resposta ao cliente |
| Core API / Realtime Gateway | Fila (SQS/RabbitMQ) | Mensageria assíncrona | Eventos de domínio (`AlunoEmbarcou`, `DocumentoVencendo`, `RotaChegouAoPonto`) publicados para consumo pelo Worker de Notificações e por outros módulos interessados |
| Worker de Notificações | Firebase / WhatsApp Cloud API / Twilio-Zenvia | HTTPS (API de cada provedor) | Envio efetivo por canal, com retorno de status de entrega processado de volta para a tabela `Notificacao` |
| Core API | AWS S3 | HTTPS (URL pré-assinada) | Geração de URL de upload/download; o arquivo em si nunca trafega pelo Core API |
| Core API | Google Maps Platform | HTTPS/REST | Geocodificação de endereço no cadastro, cálculo de distância/tempo estimado ao montar uma rota |
| App/Painel (cliente) | Mapbox | HTTPS/SDK | Carregamento de tiles do mapa e renderização visual (não passa pelo backend da Rotta) |
| App Mobile (motorista) | Serviço de Verificação Facial | HTTPS (adapter dedicado) | Envio do *embedding* facial derivado (nunca a imagem bruta) para validação de identidade antes de iniciar rota |

---

## 5. Fluxos detalhados

### 5.1 Login (multi-perfil)

1. O usuário abre o app (motorista/monitor/responsável) ou o painel web (gestor/empresa/escola/admin) e informa telefone ou e-mail.
2. O Core API identifica, pelo identificador informado, quais `VinculoPapel` existem para aquele `Usuario` e qual o método de autenticação esperado para o papel predominante (Seção 2.5): **motorista/monitor/responsável → OTP por telefone**; **gestor/empresa → e-mail+senha, com opção de OAuth Google (V2)**; **escola → e-mail+senha ou Magic Link**; **admin Rotta → e-mail+senha + 2FA obrigatório**.
3. **Caminho OTP**: o Core API gera um código de uso único, publica um evento de notificação (Seção 5.4) que o Worker envia via WhatsApp/SMS; o usuário digita o código no app; o Core API valida, resolve o(s) `VinculoPapel` ativo(s) daquele usuário e, se houver mais de um tenant/papel, pergunta em qual perfil deseja entrar.
4. **Caminho e-mail/senha**: validação de hash de senha (Argon2/bcrypt) e, se 2FA habilitado, validação adicional do código TOTP.
5. **Caminho Magic Link**: o Core API gera um link assinado de curta expiração, enviado por e-mail; ao clicar, o backend valida a assinatura/expiração e autentica.
6. **Caminho OAuth (V2)**: o navegador redireciona ao provedor (Google), retorna com um código de autorização trocado pelo backend por informações de identidade do usuário — a Rotta usa isso apenas para confirmar "quem é", nunca delega a sessão a ele.
7. Em qualquer caminho, ao final, o Core API emite **JWT de acesso** (curta duração, minutos) e **refresh token** (longa duração, revogável, armazenado com hash no banco), ambos carregando/resolvendo `tenant_id` e `papel` ativo.
8. O app armazena os tokens em armazenamento seguro do dispositivo (Keychain no iOS, Keystore no Android, via `expo-secure-store`); o painel web armazena em cookie `httpOnly`/`secure` (nunca em `localStorage`, para mitigar XSS).
9. Toda requisição subsequente carrega o JWT de acesso; ao expirar, o cliente usa o refresh token para obter um novo par, de forma transparente ao usuário.

### 5.2 Rastreamento em tempo real (uplink do motorista)

1. Motorista aperta "Iniciar rota" no app → o app solicita/confirma permissão de localização em segundo plano (com explicação clara do porquê, exigida também pelas políticas de loja — Seção 6.3) e inicia a tarefa de geolocalização em background.
2. O dispositivo captura posições GPS a cada 5–10s; cada leitura é gravada primeiro em uma **fila local no próprio aparelho** (essencial para tolerar perda momentânea de conectividade em áreas rurais/periféricas).
3. A cada poucos segundos (ou ao reconectar, se esteve offline), o app envia o lote de posições acumuladas ao **Realtime Gateway** via HTTPS (ou MQTT, dependendo da definição final de protocolo de uplink validada com dado real de bateria em campo).
4. O Realtime Gateway valida o JWT, confirma que existe uma `Viagem` em andamento para aquele motorista/rota, e processa cada posição: grava a mais recente no Redis (chave `posicao:veiculo:{id}`), verifica geofencing contra a próxima `ParadaRota` (detectando chegada automática ao ponto), e enfileira a gravação assíncrona na tabela particionada `PosicaoGPS` do PostgreSQL.
5. Ao detectar entrada no geofence de uma parada, o Realtime Gateway publica o evento de domínio `RotaChegouAoPonto`, que dispara, em paralelo: (a) abertura automática da tela de checklist no app do motorista/monitor para aquela parada, e (b) o fluxo de notificação (Seção 5.4) preparando o aviso ao(s) responsável(is) daquele ponto, disparado de fato assim que o checklist for confirmado.

### 5.3 Atualização do mapa (downlink para responsável/gestor)

1. O responsável abre a tela de mapa no app (ou o gestor abre o dashboard operacional no painel) → o cliente conecta um socket ao **Realtime Gateway** via Socket.IO, autenticado pelo JWT.
2. O Gateway valida a assinatura de canal solicitada contra as permissões do usuário (RN-08/09/25 — o responsável só pode assinar o canal do próprio filho; o gestor assina o canal do tenant inteiro).
3. O Gateway inscreve o socket no canal correspondente (ex.: `responsavel/{id}/aluno/{id}` ou `tenant/{id}/todas-rotas`).
4. A cada nova posição processada (Seção 5.2, passo 4), o Gateway publica no canal Redis correspondente; o Gateway relaying esse evento para todos os sockets inscritos naquele canal específico.
5. O cliente (app/painel) recebe a posição, atualiza o marcador do veículo no mapa Mapbox (posição + heading), e recalcula/atualiza o ETA exibido (o cálculo de ETA em si é feito no backend com Google Directions/Distance Matrix de forma espaçada — não a cada mensagem de posição — para não gerar custo/latência desnecessários).
6. Se a conexão cair (rede instável), o Socket.IO tenta reconectar automaticamente e, ao reconectar, o cliente pede o estado atual mais recente via um endpoint REST simples de "snapshot", evitando exibir uma posição obsoleta silenciosamente.

### 5.4 Push Notifications (multicanal)

1. Um módulo de domínio publica um evento (ex. `AlunoEmbarcou`, gerado ao confirmar o checklist de embarque).
2. O módulo de Notificações consome o evento, resolve o(s) destinatário(s) e seus canais/preferências, renderiza o template apropriado, e cria um registro `Notificacao` por destinatário/canal com status `enfileirada`, publicado na fila (SQS/RabbitMQ).
3. O Worker de Notificações consome a fila e envia: push via Firebase (FCM para Android, APNs via Firebase para iOS), mensagem via WhatsApp Cloud API, ou SMS via Twilio/Zenvia — respeitando o canal preferido do usuário e o *fallback* configurado.
4. Eventos críticos (SOS, ocorrência grave) são publicados com prioridade `critica`, o que faz o Worker disparar **múltiplos canais em paralelo** (não em sequência de fallback), ignorando preferência de silêncio (RN-17).
5. O provedor (Firebase/WhatsApp/Twilio) retorna status de entrega (via webhook ou resposta síncrona), que o Worker usa para atualizar o status da `Notificacao` (`enviada` → `entregue`/`falhou`), retentando com backoff quando aplicável.

### 5.5 Upload de documentos

1. O app/painel solicita ao Core API uma **URL de upload pré-assinada**, informando o tipo de entidade (motorista/veículo/empresa) e o tipo de documento.
2. O Core API valida a permissão do solicitante sobre aquela entidade/tenant, gera a URL pré-assinada do S3 (curta expiração) e a devolve ao cliente.
3. O cliente faz upload do arquivo **diretamente para o S3**, sem o binário passar pelo Core API (menor custo, menor latência, sem sobrecarregar o backend com tráfego de arquivo).
4. Ao concluir, o cliente confirma o upload ao Core API (ou o próprio S3 dispara uma notificação de evento de objeto criado), que cria o registro `Documento` com status `pendente_verificacao`.
5. O documento entra na fila de validação: no MVP, validação manual pelo Gestor; em V2, uma etapa automática de OCR extrai e sugere os campos (data de validade, número do documento) antes da confirmação humana.
6. A confirmação (ou rejeição) do documento recalcula automaticamente o status derivado (`aprovado`/`bloqueado_documento_vencido`) do Motorista ou Veículo associado (RN-29/30).

### 5.6 Reconhecimento facial

1. No cadastro (onboarding) do motorista, o app captura uma foto de referência via câmera; o processamento de detecção facial roda **no próprio dispositivo** (SDK de visão computacional embarcado), gerando um *embedding* (representação matemática do rosto, não reversível para a imagem original).
2. Esse *embedding* é enviado, via o adapter `FacialVerificationGateway` (Capítulo 18.3), a um serviço especializado de verificação facial (ex. AWS Rekognition ou provedor equivalente), que o associa de forma segura ao perfil do motorista (`biometria_facial_hash`, criptografado, nunca exposto a nenhum papel humano — RN-33).
3. No início de cada rota (V2), o app solicita nova captura rápida (com checagem de vivacidade/*liveness* para impedir uso de foto estática), gera um novo *embedding* localmente, e o envia para comparação contra o *embedding* de referência.
4. O serviço retorna apenas um resultado binário de correspondência (sim/não) mais um score de confiança — nunca a imagem, nunca o *embedding* de volta ao cliente além do necessário para a comparação.
5. Falha na verificação bloqueia o início da rota e alerta o Gestor, para confirmação manual (nunca um bloqueio silencioso sem caminho de resolução humana).
6. A imagem bruta capturada nunca é persistida além da janela transitória da própria verificação — apenas o *embedding* de referência (não reversível) é retido, minimizando a superfície de dado biométrico exposto (LGPD, Capítulo 19.4).

### 5.7 Comunicação entre aplicativo e backend (síntese)

- **CRUD e ações transacionais** (cadastro, checklist, ocorrências, preferências): HTTPS/REST através do API Gateway, autenticado por JWT, servido pelo Core API.
- **Tempo real (downlink)**: Socket.IO através do Realtime Gateway.
- **Tempo real (uplink de GPS)**: HTTP em lote/MQTT através do Realtime Gateway, dissociado do Core API para não competir por recursos com o tráfego de cadastro.
- **Arquivos**: URL pré-assinada direta para o S3, nunca proxeado pelo backend.
- **Offline-first**: toda ação crítica de campo (checklist, posição GPS) é enfileirada localmente no dispositivo e sincronizada com idempotência ao reconectar — o app nunca "trava" esperando rede para permitir que o motorista continue operando a rota.

### 5.8 Comunicação entre backend e painel web (síntese)

- O painel web (Next.js) consome exatamente a **mesma Core API** que o app mobile consome — nenhuma duplicação de lógica de negócio ou de contrato entre os dois clientes.
- Busca e cache de dados no cliente via React Query/SWR, com invalidação orientada a eventos (ex.: ao editar uma rota, invalida o cache local de "rotas do tenant").
- Páginas iniciais do painel podem usar Server-Side Rendering do Next.js para chamar o Core API do lado do servidor (usando o token de sessão do usuário, propagado via cookie `httpOnly`), reduzindo o tempo até o primeiro conteúdo útil percebido pelo Gestor ao abrir o dashboard pela manhã.
- O mapa ao vivo do painel usa o mesmo cliente Socket.IO e o mesmo modelo de canais/permissões do app — não existe um "segundo protocolo de realtime" exclusivo do painel.

---

## 6. Arquitetura de publicação nas lojas (Google Play e Apple App Store)

### 6.1 Pipeline de build e submissão

- **EAS Build** (Expo Application Services) compila os binários nativos para Android (`.aab`) e iOS (`.ipa`) a partir do mesmo código-fonte TypeScript, em ambiente de build gerenciado na nuvem — elimina a necessidade de manter um Mac físico dedicado só para compilar o app iOS.
- **EAS Submit** automatiza o envio dos binários compilados diretamente ao Google Play Console e ao App Store Connect, integrado ao pipeline de CI/CD (Capítulo 38), reduzindo o processo de publicação a um comando disparado por um workflow de release.
- **Gestão de certificados e assinatura**: perfis de provisionamento e certificados do Apple Developer Program, e a chave de assinatura do Google Play App Signing, são gerenciados pelo EAS de forma centralizada — nenhum desenvolvedor individual precisa guardar segredos de assinatura na própria máquina.

### 6.2 Atualização rápida sem depender da aprovação de loja (Expo Updates / OTA)

- Mudanças de **lógica JavaScript/TypeScript** (a maior parte dos ajustes de produto e correções de bug) podem ser publicadas via **Expo Updates** — o app baixa o novo pacote JS na próxima abertura, sem passar por revisão de loja, reduzindo o tempo de correção de horas/dias para minutos.
- Mudanças que envolvem **módulos nativos novos** (ex. uma nova permissão do sistema, uma nova biblioteca nativa) exigem, obrigatoriamente, um novo build completo e nova submissão às lojas — o time precisa reconhecer essa fronteira explicitamente na esteira de release para não assumir que "tudo pode ser corrigido via OTA".
- Esta capacidade é tratada como requisito de produto, não apenas conveniência técnica: em um app de segurança infantil, a capacidade de corrigir um bug crítico em minutos (não dias, esperando revisão da Apple) é parte do compromisso de missão do Capítulo 2.

### 6.3 Requisitos de conformidade das lojas específicos deste produto

- **Localização em segundo plano**: tanto a Apple quanto o Google escrutinam pesadamente apps que solicitam localização contínua em background. É necessário: (a) uma notificação persistente e visível ao usuário enquanto o rastreamento estiver ativo (exigência do Android, e boa prática de transparência mesmo onde não obrigatória), (b) uma justificativa clara e específica no texto de solicitação de permissão e nas notas de revisão enviadas à Apple, explicando o caso de uso de segurança de transporte escolar, e (c) desativação automática do rastreamento de alta frequência fora da janela operacional da rota (a permissão nunca é usada "sempre", apenas durante uma viagem ativa) — o que também reduz o risco de rejeição na revisão por uso excessivo/injustificado de localização contínua.
- **Rótulos de privacidade**: a "Privacy Nutrition Label" da Apple e o formulário "Data Safety" do Google Play precisam declarar com precisão a coleta de localização, dados biométricos (Seção 5.6) e dados de contato de menores — divergência entre o que é declarado e o que o app realmente faz é motivo comum de rejeição/remoção de app nas duas lojas.
- **Dados de menores**: como o produto lida com dados de crianças (ainda que a conta seja sempre do responsável legal, nunca da criança), a política de privacidade pública precisa deixar explícito o tratamento dado a esse dado, alinhado tanto à LGPD (Capítulo 19.4) quanto às políticas específicas de cada loja sobre apps que tratam dados de menores.
- **Publicação faseada**: uso de *staged rollout* (percentual gradual) no Google Play e de **TestFlight** no iOS antes de cada release em produção, permitindo capturar regressões com uma fração pequena da base antes do lançamento completo — particularmente relevante dado que qualquer regressão no fluxo de checklist/GPS tem impacto direto em segurança operacional, não apenas em experiência de uso.

---

## 7. Por que esta arquitetura não precisa ser refeita para crescer

Cada decisão deste dossiê já foi tomada olhando para o topo da curva de crescimento, não apenas para o MVP:

1. **TypeScript de ponta a ponta** mantém o custo de manutenção baixo mesmo quando o time crescer de poucos engenheiros para múltiplos squads, porque o contrato entre backend/painel/app é verificado em tempo de compilação, não descoberto em produção.
2. **Realtime Gateway já isolado do Core API desde o MVP** significa que o componente que mais precisa escalar horizontalmente nos picos operacionais (Capítulo 20.1) já pode ser escalado independentemente, sem exigir uma extração arquitetural disruptiva no meio do crescimento.
3. **Hospedagem em duas fases** (Vercel/Railway → AWS) é uma migração de infraestrutura sobre containers já padronizados (Docker), não uma reescrita de aplicação — o código não sabe nem precisa saber onde está rodando.
4. **S3 e Socket.IO/Mapbox/Google Maps abstraídos atrás de adapters próprios** (Capítulo 18.3) significam que qualquer um desses fornecedores pode ser trocado por motivo de custo ou performance em escala nacional sem tocar em regra de negócio.
5. **EAS/Expo Updates** garantem que a velocidade de iteração de produto não fica refém do ciclo de revisão das lojas à medida que a base de usuários (e, portanto, a pressão por correções rápidas) cresce para milhões.
