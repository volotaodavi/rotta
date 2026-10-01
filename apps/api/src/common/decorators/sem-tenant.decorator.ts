import { SetMetadata } from "@nestjs/common";

export const SEM_TENANT_KEY = "semTenant";

/**
 * Dispensa a EXIGÊNCIA de `tenantId` no `TenantGuard` — para as rotas
 * que agem sobre o próprio ator (`actor.sub`) e não sobre nenhum
 * recurso de uma transportadora.
 *
 * ## O bug que obrigou isto a existir (01/10/2026)
 *
 * Relato: "o transportador entra e tenta verificar a identidade, o app
 * dá erro" — `Forbidden resource`, a mensagem padrão do Nest quando um
 * guard devolve `false`.
 *
 * O culpado era `TenantGuard`: ele reprova todo usuário sem `tenantId`
 * que não seja `ADMIN_ROTTA`/`RESPONSAVEL`. E o Motorista/Monitor
 * autônomo (`AuthService.registerAutonomo`) nasce EXATAMENTE assim —
 * `issueTokens(user, null, ...)`, sem `Company`/`Membership`, porque o
 * vínculo com a transportadora só vem depois.
 *
 * O pior é que a ordem do produto é justamente a inversa: o próprio
 * comentário de `registerAutonomo` diz que a pessoa completa a Didit
 * ANTES de pedir vínculo, e o app leva ela até lá
 * (`VinculoPendenteNavigator` tem a tela "Verificar identidade"). Quem
 * escreveu liberou o papel no `RolesGuard` (`SELF_VERIFICATION_ROLES`)
 * e parou aí — mas `TenantGuard` roda ANTES do `RolesGuard`
 * (`app.module.ts`), então a requisição morria antes de qualquer
 * checagem de papel. O endpoint estava inalcançável exatamente para
 * quem ele foi feito.
 *
 * ## Por que isto é seguro
 *
 * O guard continua publicando `tenantContext`, só que com
 * `{ tenantId: null, bypass: false }` — IDÊNTICO ao que já faz para
 * `Role.RESPONSAVEL`. `bypass: false` é o padrão seguro documentado em
 * `PrismaService`: sem tenant, `withTenant(...)` não mostra NENHUMA
 * linha de NENHUMA tabela com RLS. Isto não abre dado de ninguém; só
 * deixa a requisição chegar ao controller, que por sua vez só sabe
 * trabalhar com `actor.sub`.
 *
 * ## Onde NÃO usar
 *
 * Em qualquer rota que leia ou escreva recurso de uma transportadora.
 * O critério é estreito: a rota age sobre a própria pessoa e o
 * `tenantId` não participaria da decisão nem do filtro. Usar isto para
 * "destravar" uma rota de tenant seria trocar um 403 por um vazamento.
 */
export const SemTenant = () => SetMetadata(SEM_TENANT_KEY, true);
