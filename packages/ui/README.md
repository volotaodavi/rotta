# @rotta/ui

Design System compartilhado da Rotta — a única fonte de componentes visuais consumida por `apps/web`, `apps/admin` e `apps/mobile`. Nenhum app estiliza "por conta própria" (Dossiê 22, Seção 6.2).

**Estado atual: apenas a organização de pastas.** Nenhum componente foi implementado ainda — isso acontece quando a primeira funcionalidade real de produto precisar de uma tela (fora de escopo desta fase de fundação).

Especificação completa: [`docs/10-design-system-fundamentos.md`](../../docs/10-design-system-fundamentos.md) (fundamentos, tokens, especificação de cada componente) e [`docs/11-experiencia-telas-fluxos-wireframes.md`](../../docs/11-experiencia-telas-fluxos-wireframes.md) (telas que consomem esses componentes).

## Estrutura

```
src/
├── web/            # Implementação para Next.js (Tailwind + Radix/shadcn)
│   ├── atoms/        # Botão, Input, Checkbox, Avatar, Badge, Tipografia...
│   ├── molecules/     # Campo de formulário, Card de KPI, Toast, Stepper...
│   └── organisms/       # Tabela, Modal, Drawer, Mapa, Timeline, Wizard...
└── native/         # Implementação para React Native (NativeWind)
    ├── atoms/
    ├── molecules/
    └── organisms/
```

Web e native têm a **mesma nomenclatura de componente** (ex. `Button` existe nos dois), mas implementações de renderização distintas — ambas consumindo os mesmos tokens de `@rotta/theme`. Isso é o que garante paridade visual entre plataformas sem duplicar decisão de design (Dossiê 22, Seção 5.1).

## Regra antes de criar um componente novo

Confira a lista de componentização do Dossiê 10 (Seção 12) — se o componente já está listado lá, ele pertence aqui, nunca inline em um app consumidor.
