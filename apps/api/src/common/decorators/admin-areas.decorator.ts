import { SetMetadata } from "@nestjs/common";

import type { AdminArea } from "@/shared/enums";

export const ADMIN_AREAS_KEY = "adminAreas";

/**
 * Marca a QUE área(s) do painel Admin esta rota pertence — consumido
 * por `AdminAreaGuard` (só entra em ação pra `Role.ADMIN_ROTTA` com
 * `adminRottaPapel !== GERAL`; GERAL sempre passa, todo outro papel
 * (Empresa, Responsável etc.) nunca é afetado). Coexiste com `@Roles`
 * na mesma rota — nunca a substitui.
 *
 * Rota SEM este decorator = GERAL-only por padrão (`AdminAreaGuard`
 * recusa qualquer sub-papel restrito) — escolha deliberada: uma rota
 * nova/esquecida nunca vaza pra um papel restrito só por omissão. Ex.:
 * `@AdminAreas(AdminArea.SUPORTE)`.
 */
export const AdminAreas = (...areas: AdminArea[]) => SetMetadata(ADMIN_AREAS_KEY, areas);
