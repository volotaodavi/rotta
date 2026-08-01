import { sign } from "jsonwebtoken";

import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";

/**
 * Assina um JWT de teste com o par de chaves gerado por
 * `setup-env.ts` — usado apenas em testes E2E, nunca em produção
 * (o módulo Auth real, Dossiê 15, ainda não existe).
 */
export function signTestToken(payload: AuthenticatedUser): string {
  return sign(payload, process.env.JWT_PRIVATE_KEY!, { algorithm: "RS256", expiresIn: "1h" });
}
