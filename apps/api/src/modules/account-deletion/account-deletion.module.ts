import { Module } from "@nestjs/common";

import { AccountDeletionController } from "./account-deletion.controller";
import { AccountDeletionService } from "./account-deletion.service";

import { AuditModule } from "@/modules/audit/audit.module";

/**
 * Exclusão definitiva de contas e transportadoras (Admin Rotta).
 *
 * Sem repositório próprio, diferente do resto dos módulos de domínio
 * (Dossiê 12 §6.1): o serviço não consulta nem escreve UMA entidade, ele
 * percorre a ordem de dependência de ~40 tabelas até conseguir apagar a
 * raiz. Essa ordem é uma propriedade do schema, não do domínio — um
 * repositório por entidade só espalharia a mesma transação por 40
 * arquivos e esconderia justamente a parte que precisa ser lida junto.
 * Mesma razão pela qual `DataRetentionService` também fala com o Prisma
 * diretamente.
 *
 * `AuditModule` entra porque a exclusão grava a própria trilha, fora do
 * tenant excluído (ver a nota em `AccountDeletionService`).
 */
@Module({
  imports: [AuditModule],
  controllers: [AccountDeletionController],
  providers: [AccountDeletionService],
})
export class AccountDeletionModule {}
