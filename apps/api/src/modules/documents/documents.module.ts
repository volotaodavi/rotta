import { Module } from "@nestjs/common";

/**
 * Modulo Documents (Dossie 13, Secao 17) — repositorio central de
 * arquivos (upload via URL pre-assinada do Supabase Storage,
 * verificacao, vencimento) referenciado de forma polimorfica por outros
 * modulos (Motorista, Veiculo, Empresa).
 *
 * ESTADO ATUAL: modulo vazio (fase de fundacao).
 */
@Module({})
export class DocumentsModule {}
