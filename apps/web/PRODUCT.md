# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Transportadoras** (empresas de transporte escolar) — donos/gestores e equipe operacional que assinam a Rotta para administrar frota, motoristas, monitores, alunos, rotas e cobrança dos responsáveis. Usam o painel autenticado (`/dashboard`, `/financeiro`, etc.) no dia a dia.
- **Visitantes/leads** — donos de transportadora ainda não-clientes, avaliando a plataforma na landing page pública antes de assinar (trial gratuito de 15 dias).

## Product Purpose

Rotta é uma plataforma SaaS de gestão de transporte escolar para o mercado brasileiro. `apps/web` cobre duas frentes: o site público que converte visitantes em assinantes, e o painel da transportadora onde a empresa cliente gerencia toda a operação (frota, motoristas/monitores, alunos, rotas, ocorrências, chamados de suporte, financeiro/assinatura).

## Positioning

Rastreamento de rota em tempo real (GPS) integrado a um app dedicado para os responsáveis (`apps/mobile`), cobrança recorrente via Asaas (Pix/cartão), suporte e financeiro dentro do mesmo painel — sem depender de planilhas ou grupos de WhatsApp soltos para operar a rotina de transporte escolar.

## Operating Context

- Empresa assina um plano (com trial gratuito de 15 dias), cadastra frota/motoristas/monitores/alunos/rotas.
- Cobrança dos responsáveis e da própria assinatura da transportadora passam pela Asaas (Pix, cartão).
- Motoristas e monitores operam as viagens de verdade pelo `apps/mobile`, não pelo `apps/web`.
- Responsáveis acompanham viagens dos filhos também pelo `apps/mobile`.
- Suporte da transportadora com a equipe Rotta acontece via ticket (Central de Atendimento), com e-mail para caixas fixas (`suporte@rottabr.com.br`, `financeiro@rottabr.com.br`).

## Capabilities and Constraints

- Multi-tenant real (isolamento por empresa via RLS no Postgres) — nunca dado de uma transportadora vaza pra outra.
- Cobrança 100% Asaas (AbacatePay foi completamente removido).
- Notificações por canal (push/e-mail/WhatsApp/SMS) escolhidas por tipo de evento, nunca aleatório.
- Next.js (App Router), monorepo compartilhando `packages/ui`, `packages/theme`, `packages/auth` com `apps/admin`.
- Nunca inventar/fabricar dado exibido (gráficos, históricos, estatísticas) — sempre dado real vindo da API, ou estado vazio honesto.

## Brand Commitments

- Nome: Rotta.
- Cor de marca: azul (mesma cor da logo) usado como cor primária de CTA/ação.
- Produto e comunicação em português do Brasil.

## Evidence on Hand

- API real em produção: `https://rotta-vt7i.onrender.com` (Render, plano free).
- Domínio de e-mail: `rottabr.com.br` (`contato@`, `suporte@`, `financeiro@`).
- Nenhum dado de caso de cliente, depoimento ou métrica pública pra usar como prova social ainda — não inventar nada disso na landing page até existir de verdade.

## Product Principles

- Dado real ou estado vazio honesto — nunca número/gráfico fabricado.
- Confiança e segurança em primeiro lugar (é transporte de crianças — qualquer UI que toque em rastreamento/status de viagem precisa ser clara e nunca ambígua).
- Autoatendimento pra transportadora (painel resolve o dia a dia sozinho) sem abrir mão de suporte humano real quando precisa.
- Consistência visual com `apps/admin` via `packages/theme`/`packages/ui` — mesmo design system, papéis de usuário diferentes.
