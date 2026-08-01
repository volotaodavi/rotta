# @rotta/docs — Documentação Viva

Site de documentação viva da Rotta (Dossiê 22, Seção 4.7 e Dossiê 23, Seção 16.1). Hospedará:

1. **Storybook** de `@rotta/ui` — documentação de componente gerada a partir do próprio código, nunca escrita à parte (a implementar junto com o primeiro componente real do Design System).
2. **Dossiês de arquitetura navegáveis** — os documentos hoje em [`docs/`](../../docs) na raiz do monorepo, renderizados como site (não apenas arquivos Markdown soltos).
3. **Documentação de API (OpenAPI/Swagger)** — já gerada automaticamente pelo `apps/api` a partir dos decorators do NestJS (disponível em `/v1/docs` no próprio backend); este app poderá agregá-la ou linká-la.

## Estado atual

Apenas o `package.json` de reserva do workspace — deliberadamente mínimo (Dossiê 22, Seção 4.7: "deploy próprio, de baixíssima criticidade operacional"). Nenhuma ferramenta de site de documentação foi instalada ainda; a escolha (Storybook + Docusaurus, ou uma solução única) e a configuração real acontecem quando `@rotta/ui` tiver componentes suficientes para justificar o investimento.
