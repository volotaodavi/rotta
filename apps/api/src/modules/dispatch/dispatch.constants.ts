/** Token de injeção do repositório do painel do despachante. */
export const DISPATCH_REPOSITORY = Symbol("DISPATCH_REPOSITORY");

/**
 * Quantos eventos recentes o painel devolve.
 *
 * Dez porque a faixa da direita da tela mostra isso sem rolar, e
 * porque o painel é lido de relance: quem precisa do histórico
 * completo abre a viagem, não a tela inicial.
 */
export const LIMITE_DE_EVENTOS_RECENTES = 10;

/**
 * Minutos de atraso sobre o horário previsto da primeira parada antes
 * de a rota ser considerada atrasada.
 *
 * Dez minutos é o mesmo número que o briefing do despachante usa como
 * exemplo ("atraso em trânsito de 10 min"). Fica aqui, nomeado, em vez
 * de solto na conta: o dia em que a prefeitura pedir outro limite,
 * muda-se um número e não uma expressão no meio de um `map`.
 */
export const MINUTOS_PARA_ROTA_ATRASADA = 10;

/**
 * Km/h a partir dos quais o veículo conta como EM MOVIMENTO.
 *
 * Não é zero de propósito. GPS parado oscila: um ônibus no pátio
 * reporta 0,8 km/h, 1,4 km/h, 0,3 km/h sem sair do lugar, e um limiar
 * em zero faria o marcador piscar entre "parado" e "em movimento" a
 * cada posição. Cinco km/h é mais devagar que uma pessoa correndo e
 * mais rápido que qualquer tremor de sinal.
 */
export const VELOCIDADE_MINIMA_DE_MOVIMENTO_KMH = 5;
