import { useEffect, useState } from "react";

/**
 * Quantos milissegundos a splash aceita esperar por uma consulta que
 * bloqueia a entrada no app.
 *
 * 8 segundos é bem mais que qualquer resposta saudável (a API responde
 * em ~0,5s quando está acordada) e bem menos que o tempo que um usuário
 * aceita olhando para uma tela azul parada.
 */
export const LIMITE_DE_ESPERA_DA_SPLASH_MS = 8_000;

/**
 * `true` depois que `ms` passou desde que `esperando` virou `true`.
 *
 * Existe por causa de um bug real de produção (18/09/2026, relato do
 * usuário: "a conta do transportador não está entrando (nenhuma)... só
 * não entra, fica uma tela azul escrito Rotta").
 *
 * O `RootNavigator` segurava a splash enquanto
 * `useMyIdentityVerification` carregava. Essa consulta só é disparada
 * para Motorista/Monitor (e para o dono autônomo em Modo Ação) — ou
 * seja, exatamente os papéis de transportador, e por isso o Responsável
 * nunca viu o problema. Como a consulta não tem timeout e ainda repete
 * em caso de falha de rede, uma API em cold start (o plano gratuito do
 * Render leva mais de 90s para acordar) deixava o app preso na splash
 * por minutos, ou para sempre.
 *
 * O limite aqui NÃO enfraquece o portão de verificação de identidade:
 * quando a consulta falha, `identityVerification` fica `undefined` e o
 * `RootNavigator` já deixava passar — este hook só faz o caso "demorou
 * demais" se comportar como o caso "falhou", em vez de travar. Assim
 * que a resposta chega, o portão volta a valer normalmente.
 */
export function useLimiteDeEspera(esperando: boolean, ms: number): boolean {
  const [estourou, setEstourou] = useState(false);

  useEffect(() => {
    if (!esperando) {
      // Zera ao sair do estado de espera para que uma espera futura
      // (outro login, refetch) comece a contar do começo, em vez de já
      // nascer estourada.
      setEstourou(false);
      return;
    }

    const id = setTimeout(() => setEstourou(true), ms);
    return () => clearTimeout(id);
  }, [esperando, ms]);

  return estourou;
}
