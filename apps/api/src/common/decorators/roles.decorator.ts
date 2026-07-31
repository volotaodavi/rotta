import { SetMetadata } from "@nestjs/common";

import type { Role } from "@/shared/enums";

export const ROLES_KEY = "roles";

/**
 * Restringe uma rota aos papeis informados — consumido pelo `RolesGuard`
 * (Dossie 12, Secao 5.1). Ex.: `@Roles(Role.GESTOR, Role.EMPRESA)`.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
