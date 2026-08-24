import { ForbiddenException } from "@nestjs/common";

/**
 * Lançada por `TrialGuard` quando uma empresa em `TRIAL` já passou de
 * `Company.trialExpiraEm` e tenta uma ação de escrita. `AllExceptionsFilter`
 * deriva `code` do nome da classe (`exception.constructor.name.replace(/
 * Exception$/, "").toUpperCase()`) — mesma convenção de toda a API, sem
 * precisar de nenhuma mudança no filtro. O front (`packages/api-client`)
 * reconhece esse `code` exato (`TRIALEXPIRADO`) pra mostrar o modal de
 * cadeado em vez do toast de erro genérico — ver `TrialLockModal`.
 */
export class TrialExpiradoException extends ForbiddenException {
  constructor() {
    super(
      "Seu período de teste grátis acabou. Contrate o plano Starter para continuar usando a Rotta.",
    );
  }
}
