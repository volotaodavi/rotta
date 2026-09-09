# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

- **Motorista** — dirige o veículo, inicia/encerra viagens, vê a fila de alunos da rota.
- **Monitor** — acompanha a viagem junto do motorista, controla embarque/desembarque dos alunos, GPS próprio.
- **Responsável** — pai/mãe/responsável que acompanha em tempo real a viagem do(s) filho(s), recebe notificações, conversa com motorista/monitor.
- **Admin Rotta (reduzido)** — equipe interna da Rotta com uma área simplificada dentro do mesmo app (Início/Aprovações/Suporte/Notificações/Perfil + Financeiro pra quem tem sub-papel Geral/Financeiro), pra acompanhar o essencial fora do painel completo (`apps/admin`, web, é a ferramenta completa).

Um único app (React Native/Expo) serve os quatro papéis; a navegação muda de acordo com o papel logado (`RootNavigator`).

## Product Purpose

Rodar a operação do transporte escolar em tempo real: motorista/monitor executam a viagem e registram embarque/desembarque; o responsável acompanha ao vivo e se comunica; o Admin Rotta reduzido resolve pendências rápidas (aprovações, suporte, financeiro) sem precisar abrir o painel completo num computador.

## Positioning

Um único app cobre motorista, monitor, responsável e admin (com telas dedicadas por papel), com rastreamento GPS ao vivo, notificações push reais, acesso rápido por PIN/biometria e chat direto responsável↔motorista/monitor — sem depender de grupo de WhatsApp solto pra avisos do dia a dia da rota.

## Operating Context

- Usado ao vivo, nos horários reais de rota (manhã/tarde), por motorista e monitor durante a viagem.
- Responsável usa em qualquer horário pra acompanhar a viagem ativa ou consultar histórico.
- Exige localização em segundo plano (compliance Google Play já tratado) pro rastreamento funcionar mesmo com o app minimizado.
- Admin Rotta reduzido usa esporadicamente, fora de um computador, pra aprovações/suporte/financeiro urgentes.
- Login persistente (sessão silenciosa via refresh token) + PIN/Face ID/digital como atalho opcional (nunca obrigatório) pra reentrar sem digitar senha toda vez.

## Capabilities and Constraints

- React Native + Expo (SDK 52), monorepo compartilhando `@rotta/auth`, `@rotta/api-client`, `@rotta/ui` (native), `@rotta/theme`, `@rotta/icons` com o resto do projeto.
- Mapa via MapLibre Native + tiles CARTO (`packages/maps`), modo GPS com follow-mode real durante viagem ativa.
- PIN e biometria (`expo-local-authentication`, cobre Face ID/Touch ID/impressão digital com uma API só) — ambos opcionais, nunca obrigatórios, independentes um do outro.
- Notificações push reais via Expo Push Service.
- Primeiro lançamento é só Android; iOS/Google Play tratados com o mesmo design (não é redesign nativo por SO — visual e componentes (`SlideToAction`, cores, etc.) são um design system próprio da Rotta, não Material Design nem Human Interface Guidelines).
- Nunca fabricar dado histórico/gráfico que a API não retorna de verdade (ex.: saldo financeiro do Admin usa só pontos reais, nunca série inventada).

## Brand Commitments

- Nome: Rotta. Cor de marca: azul da logo, usado como cor primária/CTA (ex. botão "Entrar" no acesso rápido).
- Tokens de identidade visual `driver*` (cores/estilo do Modo Operacional) são exclusivos do papel Motorista/Monitor — não devem vazar pra telas de Responsável ou Admin.
- Produto e comunicação em português do Brasil.

## Evidence on Hand

- API real em produção: `https://rotta-vt7i.onrender.com`.
- Nenhuma loja (Play Store/App Store) com publicação ainda — sem link de loja, avaliações ou contagem de downloads reais pra usar como prova em qualquer tela.

## Product Principles

- Confiabilidade em primeiro lugar — é o app que mostra "onde está a criança agora", ambiguidade ou atraso de estado é inaceitável.
- Rápido de usar sob pressão (motorista/monitor operam durante a viagem, não têm tempo pra UI complicada).
- Acesso simplificado nunca obrigatório — PIN/biometria facilitam, senha continua sempre funcionando.
- Dado real ou estado vazio honesto — igual ao princípio do `apps/web`, nunca fabricar histórico/gráfico.
