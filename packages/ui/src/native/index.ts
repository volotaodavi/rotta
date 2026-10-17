/**
 * @rotta/ui/native — Design System da Rotta para React Native (apps/mobile).
 *
 * Mesma organizacao e mesmos tokens de `@rotta/ui/web` (Dossie 22, Secao 5.1)
 * — a paridade visual entre plataformas vem da fonte de tokens
 * compartilhada (`@rotta/theme`), nao da implementacao de componente, que e
 * necessariamente distinta por plataforma (RN nao tem `<div>`).
 *
 * Componentes implementados até aqui (Dossiê 37 — Prompt "UX/UI Master
 * do Marketplace": primeiros dois componentes reais deste barrel,
 * construídos quando uma tela real precisou deles — mesmo princípio de
 * `@rotta/ui/web`):
 *
 *   molecules/  Timeline (etapas de status real — solicitação/contrato)
 *   organisms/  BottomSheet (Animated + PanResponder, sem dependência
 *               de gestos nova — ver nota no próprio componente)
 *
 * Cada componente recebe `theme: Theme` explicitamente (nunca importa
 * um Context de tema) — este pacote não pode depender do
 * `ThemeProvider` específico de `apps/mobile`; quem chama já resolve
 * `useTheme().theme` e repassa.
 *
 * Ver `../web/index.ts` para a estrutura completa de atoms/molecules/organisms.
 */

export * from "./atoms/ContentSheet";
export * from "./atoms/Texto";
export * from "./atoms/StatusPill";
export * from "./molecules/ActionGrid";
export * from "./molecules/AppHeader";
export * from "./molecules/BalanceCard";
export * from "./molecules/EmptyState";
export * from "./molecules/InfoTile";
export * from "./molecules/ListRow";
export * from "./molecules/MovementRow";
export * from "./molecules/SummaryCards";
export * from "./molecules/FilterTabs";
export * from "./molecules/PersonRow";
export * from "./molecules/SectionHeader";
export * from "./molecules/Timeline";
export * from "./organisms/AccountHeader";
export * from "./organisms/BottomSheet";
export * from "./organisms/SlideToAction";
