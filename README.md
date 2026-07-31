# Rotta — Documentação de Produto e Arquitetura

**Rotta** é a plataforma SaaS de gestão inteligente para transporte escolar do Brasil. Não é um app de GPS: é um ERP especializado que conecta transportadores, motoristas, monitores, responsáveis e escolas em um único ecossistema, com foco em segurança da criança, operação simples para o transportador e transparência total para a família.

Este repositório contém a documentação completa de produto, UX, arquitetura e engenharia que fundamenta as próximas fases de construção da plataforma. Nenhum código de produto foi escrito ainda — esta é a fase de **desenho**, deliberadamente, para que decisões de arquitetura, modelo de dados e multi-tenancy sejam tomadas antes de qualquer linha de implementação.

## Como este material está organizado

A documentação nasceu de um plano de 40 capítulos organizados em 7 dossiês temáticos, e vem sendo aprofundada com dossiês adicionais dedicados sempre que um tema exige mais profundidade do que um capítulo resumido permite. Cada capítulo justifica o "porquê" técnico e de produto por trás da decisão, não apenas o "o quê".

| Dossiê | Capítulos | Conteúdo | Status |
|---|---|---|---|
| [`docs/01-produto-e-personas.md`](docs/01-produto-e-personas.md) | 1–5 | Visão, Missão, Objetivos, Público-alvo, Personas | ✅ |
| [`docs/02-fluxos-e-jornadas.md`](docs/02-fluxos-e-jornadas.md) | 6–11 | Fluxo completo, fluxo por usuário, jornadas (responsável, motorista, gestor, empresa) | ✅ |
| [`docs/03-funcionalidades-e-regras.md`](docs/03-funcionalidades-e-regras.md) | 12–13 | Funcionalidades por módulo e regras de negócio | ✅ |
| [`docs/04-arquitetura-e-dados.md`](docs/04-arquitetura-e-dados.md) | 14–20 | Arquitetura SaaS, multi-tenant, banco de dados, APIs, integrações, segurança, escalabilidade | ✅ |
| `docs/05-roadmap-e-backlog.md` | 21–25 | Roadmap, MVP, V2, V3, Backlog | ⏳ pendente |
| `docs/06-...` / `docs/07-...` | 26–34 / 35–40 | UX, UI, Design System, telas, estratégia de crescimento, monorepo, boas práticas | ➡️ substituídos e superados em profundidade pelos Dossiês 10 e 11 abaixo |
| [`docs/08-modelagem-de-dados-detalhada.md`](docs/08-modelagem-de-dados-detalhada.md) | Aprofundamento do Cap. 16 | Modelagem completa de dados: multi-tenant, todas as entidades (usuários, empresas, motoristas, veículos, escolas/INEP, responsáveis, alunos, rotas, viagens, GPS, eventos, notificações, agenda, financeiro simplificado, auditoria, logs), relacionamentos, índices, cache, particionamento e escolha de banco | ✅ |
| [`docs/09-arquitetura-definitiva-stack-e-fluxos.md`](docs/09-arquitetura-definitiva-stack-e-fluxos.md) | Aprofundamento dos Cap. 14/17/18/33/34 | Arquitetura definitiva multiplataforma (landing, painel, apps Android/iOS, backend, APIs, banco, GPS, notificações), comparativo justificado de stack (Next.js/React/Vue, RN/Flutter, NestJS/Laravel/Spring, Postgres/MySQL, JWT/OAuth/Magic Link, Google Maps/Mapbox, Firebase/OneSignal, Vercel/Railway/Render/AWS/GCP, Supabase/S3, WebSocket/Socket.IO/Supabase Realtime), diagrama de infraestrutura, fluxos (login, rastreamento, mapa, push, upload, reconhecimento facial) e requisitos de publicação nas lojas | ✅ |
| [`docs/10-design-system-fundamentos.md`](docs/10-design-system-fundamentos.md) | Aprofundamento dos Cap. 26–30 | Princípios de experiência, grid, espaçamento, tipografia, ícones, raios, paleta de cores completa, tema dark/light, responsividade, especificação de todos os componentes (botões, inputs, cards, tabelas, modais, toasts, alertas, loading, skeleton, empty/erro/sucesso), acessibilidade, navegação e lista de componentização | ✅ |
| [`docs/11-experiencia-telas-fluxos-wireframes.md`](docs/11-experiencia-telas-fluxos-wireframes.md) | Aprofundamento dos Cap. 31–34 | Wireframes detalhados da Landing Page, Dashboard da Empresa, Painel do Motorista, Painel do Responsável, Painel da Escola e Admin Rotta; todos os fluxos (cadastro, login, onboarding, criar rota, cadastrar aluno, iniciar/finalizar viagem, embarque/desembarque, ausência, troca de motorista); microinterações | ✅ |
| [`docs/12-backend-arquitetura-fundamentos.md`](docs/12-backend-arquitetura-fundamentos.md) | Aprofundamento de implementação do Cap. 14 | Decisão Monolito Modular + comunicação por eventos (com caminho de migração a microsserviços), estrutura completa de pastas do backend, autenticação (multi-identificador, JWT/refresh/sessões/2FA), RBAC, Prisma/Repository Pattern/transações, segurança (LGPD/rate limit/CORS/Helmet/criptografia), testes, observabilidade, deploy/CI-CD | ✅ |
| [`docs/13-backend-modulos-e-apis.md`](docs/13-backend-modulos-e-apis.md) | Aprofundamento de implementação | Os 24 módulos do backend (Auth, Users, Companies, Schools, Drivers, Monitors, Parents, Students, Vehicles, Routes, Trips, GPS, Notifications, Agenda, Dashboard, Support, Documents, Reports, Settings, Audit, Logs, Analytics) com responsabilidade, entidades e API completa (método, endpoint, payload, resposta, erros) | ✅ |
| [`docs/14-backend-gps-notificacoes-jobs-eventos.md`](docs/14-backend-gps-notificacoes-jobs-eventos.md) | Aprofundamento de implementação | Arquitetura completa de GPS (uplink/downlink, persistência, histórico, bateria, reconexão, offline), notificações (filas BullMQ, retry, logs), catálogo completo de jobs em background e de eventos internos de domínio | ✅ |

## Princípios inegociáveis do produto

Toda decisão de produto e engenharia documentada aqui é filtrada por oito critérios, nesta ordem de desempate quando há conflito:

1. **Segurança da criança** — qualquer ambiguidade entre UX e segurança é resolvida a favor da segurança.
2. **UX extremamente simples** — motoristas autônomos e mães/pais sem letramento digital avançado são o piso de usabilidade, não o teto.
3. **Multi-tenant desde o dia zero** — nenhuma tabela, nenhuma tela e nenhum endpoint é desenhado sem a pergunta "de qual empresa é isso?".
4. **Mobile first** — o motorista e o responsável vivem no celular; o painel web é uma ferramenta de gestão, não o produto principal.
5. **Escalabilidade** — a arquitetura do MVP precisa suportar 10 empresas sem operação de infraestrutura e as decisões precisam permitir 100 mil empresas sem reescrita.
6. **Performance** — rastreamento em tempo real não tolera lag perceptível; o app do motorista não pode drenar a bateria.
7. **Design premium e minimalista** — tema escuro, azul, branco e cinza; nada compete por atenção com o mapa e os dados operacionais.
8. **Manutenibilidade** — arquitetura limpa, monorepo bem organizado, módulos com fronteiras de domínio claras.

## Sobre o modelo de negócio

Plano único, R$ 39,90/mês por empresa cadastrada (o "tenant" pagante). Responsáveis, motoristas, monitores e escolas nunca pagam — o valor econômico é capturado inteiramente do lado do transportador, o que simplifica a proposta de valor e elimina fricção de adoção para os demais perfis, que são, ao mesmo tempo, a fonte de rede e retenção do produto (efeito de rede: quanto mais responsáveis usam, mais indispensável a Rotta se torna para a empresa trocar de ferramenta).
