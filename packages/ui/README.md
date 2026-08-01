# @rotta/ui

Design System **oficial e único** da Rotta — a única fonte de componentes visuais consumida por `apps/web`, `apps/admin` e `apps/mobile`. Nenhum app estiliza "por conta própria" (Dossiê 22, Seção 6.2). Nenhum componente é criado fora do catálogo abaixo (Dossiê 24, Seção 12.5).

**Estado atual: apenas a organização de pastas.** Nenhum componente foi implementado ainda — a implementação começa pelos átomos mais reutilizados (`Button`, `Input`, `Card`, `Avatar`, `Badge`) assim que a primeira tela real de produto precisar deles (módulo `auth`, Dossiê 15).

Especificação completa e vinculante:

- [`docs/24-design-system-oficial-fundamentos.md`](../../docs/24-design-system-oficial-fundamentos.md) — identidade de marca, todos os tokens (colors, spacing, radius, typography, elevation, border, motion, opacity, breakpoints, z-index, transitions), temas, ícones, grid, responsividade, acessibilidade, animações, mapas e a estratégia de componentização.
- [`docs/25-design-system-oficial-catalogo-de-componentes.md`](../../docs/25-design-system-oficial-catalogo-de-componentes.md) — anatomia, variantes, estados, API conceitual e acessibilidade dos 53 componentes oficiais.

Os tokens consumidos aqui vêm de `@rotta/theme` (`packages/theme`) — nunca um valor solto (cor, espaçamento, raio) declarado diretamente em um componente.

## Estratégia de componentização

**Atomic Design** (estrutura física de pastas: `atoms/` → `molecules/` → `organisms/`) + **Compound Components** (API pública de qualquer componente com múltiplas partes relacionadas, ex. `Tabs`, `Select`, `Card`, `Modal`) — decisão e justificativa completas no Dossiê 24, Seção 12.1/12.2. **Feature-Based** é usado em outra camada do produto (pasta `features/` de cada app, Dossiê 23 Seção 1.1), nunca aqui — componentes deste Design System são agnósticos de domínio.

## Estrutura de pastas

```
src/
├── web/                          # Implementação Next.js/React (Tailwind + Radix)
│   ├── tokens/                     # Re-exportação tipada de @rotta/theme para CSS-in-JS quando necessário
│   ├── atoms/
│   │   ├── Button/
│   │   ├── IconButton/
│   │   ├── Fab/
│   │   ├── Input/
│   │   ├── Checkbox/
│   │   ├── Radio/
│   │   ├── Switch/
│   │   ├── Avatar/
│   │   ├── Badge/
│   │   ├── Chip/
│   │   ├── Divider/
│   │   ├── Spinner/
│   │   ├── Skeleton/
│   │   └── Typography/              # Display/Headline/Title/Subtitle/Body/BodySmall/Caption/Overline/Button
│   ├── molecules/
│   │   ├── PasswordInput/
│   │   ├── OtpInput/
│   │   ├── Textarea/
│   │   ├── SearchInput/
│   │   ├── FormField/                 # label + input + helper/erro (compõe qualquer atom de input)
│   │   ├── Autocomplete/
│   │   ├── Pagination/
│   │   ├── ProgressBar/
│   │   ├── EmptyState/
│   │   ├── ErrorState/
│   │   ├── OfflineState/
│   │   ├── Alert/
│   │   ├── Banner/
│   │   ├── Toast/                     # inclui "Snackbar" — mesmo componente, um único nome (Dossiê 25, Seção 3.14)
│   │   └── StatisticCard/
│   ├── organisms/
│   │   ├── Select/                    # Compound: Select.Trigger, Select.Options, Select.Option
│   │   ├── Tabs/                       # Compound: Tabs.List, Tabs.Tab, Tabs.Panel
│   │   ├── Accordion/                  # Compound: Accordion.Item, Accordion.Trigger, Accordion.Content
│   │   ├── Stepper/
│   │   ├── Table/                       # Compound: Table.Header, Table.Row, Table.Cell
│   │   ├── Modal/                        # Compound: Modal.Header, Modal.Body, Modal.Footer
│   │   ├── Drawer/                        # Compound: herda Modal.Header/Body/Footer
│   │   ├── Dialog/
│   │   ├── Tooltip/
│   │   ├── Calendar/
│   │   ├── DatePicker/
│   │   ├── TimePicker/
│   │   ├── Card/                          # Compound: Card.Header, Card.Body, Card.Footer (base de todos os *Card)
│   │   ├── MapCard/
│   │   ├── GpsCard/
│   │   ├── VehicleCard/
│   │   ├── StudentCard/
│   │   ├── DriverCard/
│   │   ├── RouteCard/
│   │   ├── CompanyCard/
│   │   ├── SchoolCard/
│   │   ├── ProfileCard/
│   │   ├── NotificationCard/
│   │   └── ChartCard/
│   └── index.ts                            # Barrel — única porta de entrada consumida pelos apps
│
└── native/                          # Implementação React Native (NativeWind) — MESMA nomenclatura, MESMA API pública
    ├── atoms/ ...                     # espelha 1:1 a estrutura de web/
    ├── molecules/ ...
    └── organisms/ ...
```

`native/` espelha exatamente `web/` — mesmo nome de componente, mesma API pública (props), exceto nos três pontos de divergência de convenção nativa documentados no Dossiê 25, Seção 1.2 (`onClick`/`onPress`, `<img>`/`<Image>`, rolagem nativa).

## Convenções de nomenclatura

Ver Dossiê 24, Seção 12.4 (resumo): componente em `PascalCase` nunca abreviado; sub-componente de Compound Component como `Componente.Parte`; prop de variante visual `variant`; prop de tamanho `size` com valores `sm`/`md`/`lg`; prop de estado booleano com prefixo `is`/`has`; handler de evento seguindo a convenção nativa de cada plataforma (`onClick` web, `onPress` native — nunca unificados).

## Regra antes de criar um componente novo

Nenhum componente é criado sem antes verificar exaustivamente a lista de 53 componentes do Dossiê 25. Se uma tela precisa de uma variação, a pergunta correta é "isso é uma nova `variant`/`size` de um componente já existente, ou genuinamente um componente novo?" — na esmagadora maioria dos casos, é uma variante. Um componente novo só é criado quando nenhuma composição dos existentes resolve, e sua adição atualiza obrigatoriamente o Dossiê 24 (Seção 12) e o Dossiê 25 no mesmo Pull Request.
