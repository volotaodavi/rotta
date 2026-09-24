import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";

/**
 * Os municípios de uma UF que já têm escola no catálogo.
 *
 * A UF é obrigatória, e isso é desenho, não preguiça: sem ela a
 * resposta seria a lista dos ~5.570 municípios do Brasil de uma vez, e
 * pior, com homônimos indistinguíveis ("Bom Jesus" existe em nove
 * estados). Escolher o estado antes é o gesto natural de quem vai
 * escolher uma cidade, e é o que mantém a consulta indexada.
 */
export class ListMunicipiosQueryDto {
  @ApiProperty({ example: "RJ", description: "Sigla da UF (2 letras)." })
  @IsString()
  @Length(2, 2)
  estado!: string;
}
