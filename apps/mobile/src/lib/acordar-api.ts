import { AppState, type AppStateStatus, type NativeEventSubscription } from "react-native";

import { env } from "@/config/env";

/** A API já inclui o prefixo `/v1` na URL; aqui só falta o caminho. */
const CAMINHO = "/health";

/**
 * Acorda a API no instante em que o app abre.
 *
 * ## Por que existe
 *
 * A API roda no plano gratuito do Render, que desliga o serviço depois
 * de 15 minutos sem tráfego e leva perto de 90 segundos para voltar
 * (medido em 03/09/2026, nota completa em
 * `apps/web/src/lib/wake-api.ts`).
 *
 * A web já resolvia isso: ela chama `wakeApi()` quando alguém entra na
 * Landing Page, e a pessoa gasta o cold start lendo a página. O app não
 * tinha nada equivalente, então quem pagava a espera inteira era o
 * usuário, parado na splash.
 *
 * Em 06/10/2026 isso apareceu como "o app da Rotta não está abrindo". A
 * outra metade do conserto está em `TIMEOUT_PARTIDA_FRIA_MS`: o app
 * desistia aos 60 segundos, antes de o servidor ficar pronto aos 90.
 * Esticar o teto sem acordar a API faria a pessoa esperar 90 segundos
 * olhando a splash; acordar sem esticar o teto continuaria estourando.
 * Os dois juntos é que resolvem.
 *
 * ## Por que não é um ping de 24 horas
 *
 * Porque isso consumiria quase toda a cota gratuita de 750h/mês do
 * Render à toa, de madrugada, sem ninguém usando. Dispara só com
 * abertura real do app: a pessoa já estava vindo de qualquer jeito.
 *
 * Falha aqui nunca aparece para ninguém. É otimização de latência, e o
 * fluxo real (renovar sessão, entrar) já trata servidor lento ou fora do
 * ar com as próprias mensagens.
 */
export function acordarApi(): void {
  if (!env.EXPO_PUBLIC_API_URL) return;

  void fetch(`${env.EXPO_PUBLIC_API_URL}${CAMINHO}`, { method: "GET" }).catch(() => undefined);
}

/**
 * Tempo mínimo entre duas chamadas de `acordarApi` pelo ciclo de vida.
 *
 * O serviço hiberna com 15 minutos de silêncio, então 10 minutos nunca
 * deixam os 15 completarem. Mais curto que isso não acorda nada que já
 * não estivesse acordado e só gasta a cota.
 */
const INTERVALO_MINIMO_MS = 10 * 60 * 1000;

let ultimaChamadaEm = 0;

/**
 * Acorda a API quando o app VOLTA para o primeiro plano.
 *
 * ## O buraco que isto fecha
 *
 * `acordarApi` disparava uma vez, na abertura. Numa operação de
 * transporte escolar isso não cobre o dia: o motorista abre o app às
 * 5h40, bloqueia o celular, dirige duas horas, e volta ao app na
 * escola. Nesse intervalo, se nenhuma outra requisição aconteceu, o
 * serviço hibernou, e quem paga os 90 segundos de volta é ele, parado
 * na porta da escola com criança esperando para descer.
 *
 * Durante a viagem em andamento o relato de GPS a cada 15 segundos já
 * mantém a API acordada sozinho. O caso que sobra, e que isto cobre, é
 * o app aberto ANTES de a viagem começar e depois de ela terminar.
 *
 * ## Por que o intervalo mínimo
 *
 * Alternar entre apps dispara `active` várias vezes por minuto, e cada
 * uma viraria uma requisição. A cota gratuita do Render é de 750 horas
 * de instância por mês para o workspace inteiro: desperdiçá-la em ping
 * redundante é a mesma imprudência de manter o serviço acordado 24
 * horas, só que mais difícil de perceber.
 *
 * Devolve a função que cancela a inscrição, para quem monta chamar no
 * desmonte.
 */
export function acordarApiAoVoltarParaOPrimeiroPlano(): () => void {
  const aoMudar = (estado: AppStateStatus): void => {
    if (estado !== "active") return;

    const agora = Date.now();
    if (agora - ultimaChamadaEm < INTERVALO_MINIMO_MS) return;

    ultimaChamadaEm = agora;
    acordarApi();
  };

  const inscricao: NativeEventSubscription = AppState.addEventListener("change", aoMudar);
  return () => inscricao.remove();
}

/** Só para teste: zera a janela do intervalo mínimo entre chamadas. */
export function esquecerUltimaChamadaDeAcordar(): void {
  ultimaChamadaEm = 0;
}
