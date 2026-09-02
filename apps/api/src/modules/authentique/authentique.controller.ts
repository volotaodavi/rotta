import { Body, Controller, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { AuthentiqueService } from "./authentique.service";
import { PrepararDocumentoAssinaturaDto } from "./dto/preparar-documento-assinatura.dto";

import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";


/**
 * Achado em auditoria de segurança 02/09/2026: sem `@Roles(...)`, o
 * `RolesGuard` libera QUALQUER papel autenticado (ver
 * `RolesGuard.canActivate` — sem metadata de roles, retorna `true`).
 * Como `AuthentiqueService.prepararDocumentoParaAssinatura` hoje é só
 * um stub honesto (sempre recusa, nunca lê o `Contract`), não havia
 * exploração real possível ainda — mas o dia que a integração de
 * verdade for implementada, esse endpoint teria virado um jeito de
 * QUALQUER usuário (inclusive Responsável de outra empresa) disparar a
 * preparação de assinatura de um `contractId` alheio, sem checagem de
 * tenant. Restrito aqui a quem administra contrato de verdade — mesmo
 * papel de quem chama isso internamente (`ContractsService.gerarContrato`,
 * uma chamada de método direta, nunca passa por este Guard).
 */
const MANAGE_ROLES = [Role.EMPRESA, Role.GESTOR, Role.ADMIN_ROTTA] as const;

@ApiTags("authentique")
@ApiBearerAuth()
@Controller("authentique")
export class AuthentiqueController {
  constructor(private readonly authentiqueService: AuthentiqueService) {}

  @Post("preparar-documento")
  @Roles(...MANAGE_ROLES)
  prepararDocumento(@Body() dto: PrepararDocumentoAssinaturaDto) {
    return this.authentiqueService.prepararDocumentoParaAssinatura(dto);
  }
}
