import { ApiProperty } from "@nestjs/swagger";

/**
 * Um município do catálogo, do jeito que a tela precisa dele.
 *
 * O `escolas` é a parte que importa: o Admin confere esse número contra
 * o que ele sabe que subiu na planilha ANTES de credenciar a
 * transportadora. "Maricá — 62 escolas" responde "vai pegar todas?" no
 * momento de escolher, e não depois de um credenciamento em massa que
 * não dá para desfazer com um clique.
 */
export class MunicipioResponseDto {
  @ApiProperty({ example: "Maricá", description: "Nome com acento e caixa — é o que aparece." })
  cidade!: string;

  @ApiProperty({ example: "RJ" })
  estado!: string;

  @ApiProperty({
    example: "marica",
    description: "Chave de busca sem acento nem caixa — é o que o filtro usa.",
  })
  cidadeNormalizada!: string;

  @ApiProperty({ example: 62, description: "Escolas ATIVAS neste município." })
  escolas!: number;
}
