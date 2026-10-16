import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/plus-jakarta-sans";

import type { ReactNode } from "react";

/**
 * Segura a árvore até a letra da marca estar carregada.
 *
 * ## Por que isto existe
 *
 * Porque o app nunca carregou fonte nenhuma. Todo texto da Rotta, em
 * todas as telas, era Roboto no Android e SF Pro no iOS — a fonte que
 * o aparelho já tinha. Um app inteiro na fonte padrão do sistema se
 * parece com todo aplicativo que nunca escolheu uma letra, e foi o que
 * o fundador viu quando disse, pela terceira vez, que estava "com cara
 * de IA".
 *
 * ## Por que esperar, em vez de deixar trocar na frente da pessoa
 *
 * Porque sem esperar o texto aparece primeiro em Roboto e pula para a
 * Plus Jakarta Sans meio segundo depois, com outra largura e outra
 * altura de linha: a tela inteira se reorganiza na frente de quem está
 * lendo. A espera é de uma fração de segundo, com a fonte vindo do
 * próprio pacote do app, sem rede.
 *
 * Se o carregamento falhar, o app abre assim mesmo, na fonte do
 * sistema. Letra bonita não vale travar a tela de quem precisa saber
 * onde está a van.
 */
export function FonteDaMarca({ children }: { children: ReactNode }): JSX.Element | null {
  const [carregada, erro] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  if (!carregada && !erro) return null;

  return <>{children}</>;
}
