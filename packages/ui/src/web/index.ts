/**
 * @rotta/ui/web — Design System da Rotta para Next.js (apps/web, apps/admin).
 *
 * Estrutura oficial e catálogo completo: Dossiê 24 (Seção 12.3) e
 * Dossiê 25. Nenhum app importa diretamente de `./atoms/*` etc. — sempre
 * por este barrel. Componentes implementados até aqui (os átomos mais
 * reutilizados, conforme `packages/ui/README.md` — os demais chegam
 * junto com a tela que precisar deles pela primeira vez):
 *
 *   atoms/      Button, Input, Select, Badge, Spinner, Typography
 *   molecules/  FormField
 *   organisms/  Card (Compound: Card.Header/Body/Footer)
 */

export * from "./atoms/Badge";
export * from "./atoms/Button";
export * from "./atoms/Input";
export * from "./atoms/Select";
export * from "./atoms/Spinner";
export * from "./atoms/Typography";
export * from "./molecules/FormField";
export * from "./organisms/Card";
