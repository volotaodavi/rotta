import type { StatusTone } from "@rotta/ui/native";

/**
 * O contrato de dados da tela de Pagamentos do responsável.
 *
 * ## Por que este arquivo existe antes do backend
 *
 * A tela 13 do conceito visual de 16/10/2026 é a única das 31 que não
 * existe no app, e ela não está parada por falta de desenho: depende da
 * arquitetura de split, que espera o comercial do Asaas, a decisão
 * entre Pix Automático e cartão, e a liberação do white label.
 *
 * Decisão do fundador em 16/10/2026: construir a tela agora e, quando a
 * resposta chegar, "só integrar e colocar os botões para funcionar".
 *
 * Então estes tipos são o contrato que o backend vai precisar cumprir,
 * escrito antes para a tela não inventar formato. **Nada aqui existe no
 * `schema.prisma` hoje**: cobrança da família não foi implementada, e
 * os cinco contratos que existem no banco estão com valor R$ 0,00.
 *
 * ## Valores chegam formatados
 *
 * Porque moeda depende de locale e o dado nasce em centavos inteiros.
 * Componente que formata moeda sozinho é componente que arredonda
 * errado em algum lugar, e aqui o erro apareceria na fatura de uma
 * família.
 */
export type FaturaStatus = "PAGA" | "A_VENCER" | "VENCIDA" | "CANCELADA" | "ESTORNADA";

/**
 * O tom de cada estado, em um lugar só.
 *
 * O conceito visual tinha quatro estados, sendo dois vermelhos ("Não
 * paga" e "Vencida"), e este mapa já pintava os dois igual porque pedem
 * a mesma ação da família. O backend tem um: `VENCIDA`. `NAO_PAGA` saiu
 * daqui em 17/10/2026 por ser a mesma coisa com outro nome — manter dois
 * rótulos para um estado faria a pessoa procurar significado onde não
 * há.
 *
 * `CANCELADA` e `ESTORNADA` não estavam no conceito porque são do mundo
 * real do dinheiro, não da tela: cinza, porque não pedem nada da
 * família.
 */
export const TOM_DA_FATURA: Record<FaturaStatus, StatusTone> = {
  PAGA: "success",
  A_VENCER: "warning",
  VENCIDA: "danger",
  CANCELADA: "neutral",
  ESTORNADA: "neutral",
};

export const ROTULO_DA_FATURA: Record<FaturaStatus, string> = {
  PAGA: "Paga",
  A_VENCER: "A vencer",
  VENCIDA: "Vencida",
  CANCELADA: "Cancelada",
  ESTORNADA: "Estornada",
};

/** Estados que ainda pedem pagamento. */
export const FATURA_EM_ABERTO: FaturaStatus[] = ["A_VENCER", "VENCIDA"];

export interface Fatura {
  id: string;
  /** Mês de competência já escrito, por exemplo "Abr/2026". */
  competencia: string;
  /** Já formatado, por exemplo "R$ 660,00". */
  valorFormatado: string;
  status: FaturaStatus;
  /** Já formatada, por exemplo "05/04/2026". */
  vencimentoFormatado: string;
}

export interface ResumoDeFaturas {
  status: FaturaStatus;
  quantidade: number;
  /** Soma do grupo, já formatada. `null` quando não se sabe. */
  totalFormatado: string | null;
}

export interface PagamentosDoResponsavel {
  alunoNome: string;
  resumo: ResumoDeFaturas[];
  faturas: Fatura[];
  /** Total em aberto, já formatado. `null` quando não há nada em aberto. */
  totalEmAbertoFormatado: string | null;
}

/**
 * Meios de pagamento da tela.
 *
 * `motivoIndisponivel` existe porque parte deles depende de decisão que
 * não é técnica. O cartão recorrente, em particular, só entra se a
 * captura acontecer fora do nosso servidor: o Asaas confirmou em
 * 16/10/2026 que não há SDK nem tokenização pelo front, o que colocaria
 * a Rotta em escopo PCI DSS. Pix Automático resolve recorrência sem
 * cartão, sem MDR e sem essa exposição, e por isso nasce como o trilho
 * principal aqui.
 */
export interface MeioDePagamento {
  chave: string;
  rotulo: string;
  motivoIndisponivel?: string;
}
