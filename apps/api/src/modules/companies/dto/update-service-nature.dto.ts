import { ApiProperty } from "@nestjs/swagger";
import { ServiceNature } from "@prisma/client";
import { IsEnum } from "class-validator";

/**
 * Declara quem paga pelo transporte desta transportadora
 * (25/09/2026, "faça a distinção, por favor. Não quero mistura").
 *
 * Endpoint SÓ do Admin da Rotta, e isso é a regra inteira: marcar uma
 * empresa como `PUBLICO_LICITADO` desliga a cobrança do responsável.
 * Se a própria empresa pudesse fazer isso, ela escolheria sozinha
 * quando a plataforma para de faturar por ela — e se pudesse fazer o
 * contrário, ligaria cobrança para pais de um município que já pagou.
 */
export class UpdateServiceNatureDto {
  @ApiProperty({
    enum: ServiceNature,
    description:
      "PRIVADO: o responsável contrata e paga. PUBLICO_LICITADO: o município custeia e o responsável nunca é cobrado.",
  })
  @IsEnum(ServiceNature)
  naturezaServico!: ServiceNature;
}
