import { Module } from "@nestjs/common";

/**
 * Modulo Audit (Dossie 13, Secao 20) — exposicao de leitura do log de
 * auditoria imutavel (Dossie 8, Secao 16). Nunca aceita escrita/edicao
 * via API — o registro e gerado internamente por interceptors.
 *
 * ESTADO ATUAL: modulo vazio (fase de fundacao).
 */
@Module({})
export class AuditModule {}
