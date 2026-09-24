import { ApiProperty } from "@nestjs/swagger";

/**
 * Resultado do credenciamento por município.
 *
 * Os três números existem para conferência, não para enfeite: o Admin
 * precisa conseguir comparar "encontradas" com o que ele sabe que subiu
 * na planilha. Se o município tem 62 escolas e aqui diz 58, faltou
 * alguma coisa na importação — e é melhor descobrir agora do que quando
 * uma criança não aparecer em nenhuma rota.
 */
export class CredenciarMunicipioResponseDto {
  @ApiProperty({
    description: "Escolas do município que existem no catálogo e casam com o filtro.",
  })
  encontradas!: number;

  @ApiProperty({ description: "Vínculos criados agora." })
  credenciadas!: number;

  @ApiProperty({ description: "Já estavam credenciadas antes — reexecutar é seguro." })
  jaCredenciadas!: number;

  @ApiProperty({
    description: "Área de atuação criada/confirmada junto, para a cerca valer daqui em diante.",
  })
  areaDeAtuacaoRegistrada!: boolean;
}
