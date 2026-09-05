import type { StatusPillTone } from "@/features/vehicles/components";
import type { AdminRottaPapel } from "@rotta/api-client";

/** Mesmos rótulos de `apps/admin/src/app/(admin)/admin-contas/page.tsx` (paridade Web/App). */
export const ADMIN_PAPEL_LABEL: Record<AdminRottaPapel, string> = {
  GERAL: "Geral (acesso total)",
  SUPORTE: "Suporte",
  FINANCEIRO: "Financeiro",
};

export const ADMIN_PAPEL_TONE: Record<AdminRottaPapel, StatusPillTone> = {
  GERAL: "success",
  SUPORTE: "info",
  FINANCEIRO: "warning",
};
