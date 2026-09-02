/**
 * @rotta/ui/web — Design System da Rotta para Next.js (apps/web, apps/admin).
 *
 * Estrutura oficial e catálogo completo: Dossiê 24 (Seção 12.3) e
 * Dossiê 25. Nenhum app importa diretamente de `./atoms/*` etc. — sempre
 * por este barrel. Componentes implementados até aqui (os átomos mais
 * reutilizados, conforme `packages/ui/README.md` — os demais chegam
 * junto com a tela que precisar deles pela primeira vez):
 *
 *   atoms/      Button, Input, PhoneInput, Select, Badge, Checkbox, Spinner, Skeleton, Typography, ProgressRing
 *   molecules/  FormField, Pagination, Tabs, PanelGreeting, EmptyState, StatTile, TableSkeleton
 *   organisms/  Card (Compound: Card.Header/Body/Footer), Table (data-driven),
 *               Modal (Compound: Modal.Header/Body/Footer, com portal/focus-trap),
 *               Toast (ToastProvider + useToast — feedback de sucesso/erro de mutações),
 *               TrialLockModal (Dossiê 26 — pop-up de assinatura necessária),
 *               Chart (`TrendBarChart` + tema `recharts` — 1ª biblioteca de
 *               gráficos do monorepo, pedido do usuário 02/09/2026:
 *               "trazer mais modernidade" pro Admin)
 */

export * from "./atoms/Badge";
export * from "./atoms/Button";
export * from "./atoms/Checkbox";
export * from "./atoms/Input";
export * from "./atoms/PhoneInput";
export * from "./atoms/ProgressRing";
export * from "./atoms/Select";
export * from "./atoms/Skeleton";
export * from "./atoms/Spinner";
export * from "./atoms/Textarea";
export * from "./atoms/Typography";
export * from "./molecules/EmptyState";
export * from "./molecules/ErrorState";
export * from "./molecules/FormField";
export * from "./molecules/PanelGreeting";
export * from "./molecules/Pagination";
export * from "./molecules/StatTile";
export * from "./molecules/Tabs";
export * from "./molecules/TableSkeleton";
export * from "./organisms/Card";
export * from "./organisms/Chart";
export * from "./organisms/Modal";
export * from "./organisms/Table";
export * from "./organisms/Toast";
export * from "./organisms/TrialLockModal";
