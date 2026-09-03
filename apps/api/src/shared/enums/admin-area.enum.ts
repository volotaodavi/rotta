/**
 * Áreas do painel Admin usadas por `AdminAreaGuard` pra restringir sub-
 * papéis DENTRO de `Role.ADMIN_ROTTA` (pedido do usuário 03/09/2026:
 * "Suporte... só aparecerá o suporte (toda área de suporte deverá
 * aparecer, incluindo validação de identidade, veículos etc.)...
 * Financeiro... só poderá analisar as áreas financeiras, mas não
 * poderão fazer transferências"). Não confundir com `Role` — este
 * enum só importa quando `AuthenticatedUser.role === Role.ADMIN_ROTTA`;
 * nenhum outro papel é afetado por ele. Ver `User.adminRottaPapel`
 * (Prisma) pro mapeamento papel → áreas permitidas.
 */
export enum AdminArea {
  SUPORTE = "suporte",
  IDENTIDADE = "identidade",
  VEICULOS = "veiculos",
  FINANCEIRO = "financeiro",
}
