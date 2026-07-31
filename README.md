# Rotta — Documentação de Produto e Arquitetura

**Rotta** é a plataforma SaaS de gestão inteligente para transporte escolar do Brasil. Não é um app de GPS: é um ERP especializado que conecta transportadores, motoristas, monitores, responsáveis e escolas em um único ecossistema, com foco em segurança da criança, operação simples para o transportador e transparência total para a família.

Este repositório contém a documentação completa de produto, UX, arquitetura e engenharia que fundamenta as próximas fases de construção da plataforma. Nenhum código de produto foi escrito ainda — esta é a fase de **desenho**, deliberadamente, para que decisões de arquitetura, modelo de dados e multi-tenancy sejam tomadas antes de qualquer linha de implementação.

## Como este material está organizado

A documentação está dividida em 7 dossiês temáticos dentro de `docs/`, cobrindo os 40 capítulos solicitados. Cada capítulo justifica o "porquê" técnico e de produto por trás da decisão, não apenas o "o quê".

| Dossiê | Capítulos | Conteúdo |
|---|---|---|
| [`docs/01-produto-e-personas.md`](docs/01-produto-e-personas.md) | 1–5 | Visão, Missão, Objetivos, Público-alvo, Personas |
| [`docs/02-fluxos-e-jornadas.md`](docs/02-fluxos-e-jornadas.md) | 6–11 | Fluxo completo, fluxo por usuário, jornadas (responsável, motorista, gestor, empresa) |
| [`docs/03-funcionalidades-e-regras.md`](docs/03-funcionalidades-e-regras.md) | 12–13 | Funcionalidades por módulo e regras de negócio |
| [`docs/04-arquitetura-e-dados.md`](docs/04-arquitetura-e-dados.md) | 14–20 | Arquitetura SaaS, multi-tenant, banco de dados, APIs, integrações, segurança, escalabilidade |
| [`docs/05-roadmap-e-backlog.md`](docs/05-roadmap-e-backlog.md) | 21–25 | Roadmap, MVP, V2, V3, Backlog |
| [`docs/06-ux-ui-design-system.md`](docs/06-ux-ui-design-system.md) | 26–34 | UX, UI, Design System, Componentes, telas, Dashboard, Landing Page, App, Painel Web |
| [`docs/07-estrategia-tecnica-e-stack.md`](docs/07-estrategia-tecnica-e-stack.md) | 35–40 | Estratégia de crescimento, arquitetura recomendada, stack, monorepo, estrutura de pastas, boas práticas |
| [`docs/08-modelagem-de-dados-detalhada.md`](docs/08-modelagem-de-dados-detalhada.md) | Aprofundamento do Cap. 16 | Modelagem completa de dados: multi-tenant, todas as entidades (usuários, empresas, motoristas, veículos, escolas/INEP, responsáveis, alunos, rotas, viagens, GPS, eventos, notificações, agenda, financeiro simplificado, auditoria, logs), relacionamentos, índices, cache, particionamento e escolha de banco |

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
