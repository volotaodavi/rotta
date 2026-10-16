import { StatusPill as StatusPillDoSistema, type StatusTone } from "@rotta/ui/native";

import { useTheme } from "@/providers/theme-provider";

/**
 * Selo colorido (status do veículo, severidade de ocorrência, análise
 * Rotta AI, categoria de notificação).
 *
 * ## Por que este arquivo virou uma casca
 *
 * Em 16/10/2026 eu criei um `StatusPill` em `@rotta/ui/native` sem ter
 * visto que este aqui já existia e já era usado em 14 features. Ou
 * seja, produzi a duplicação que o próprio trabalho vinha eliminar.
 *
 * A saída não é apagar um dos dois e reescrever 75 arquivos de chamada:
 * é este continuar existindo com o mesmo nome e a mesma API, e
 * delegar. Quem importava daqui não muda nada, e ganha de graça a
 * correção que o componente do pacote traz.
 *
 * ## O que a troca corrige, de verdade
 *
 * A implementação anterior pintava o fundo com `${color}26`, que é a
 * cor da fonte com 15% de opacidade em hexadecimal. Funcionava no tema
 * claro e ficava sujo no escuro, porque sobrepor 15% de verde sobre um
 * fundo quase preto não dá o mesmo resultado que sobre branco. Agora o
 * fundo vem de `successMuted`/`warningMuted`/`dangerMuted`/
 * `primaryMuted`, tokens reais com valor escolhido para cada tema.
 *
 * Esta casca existe porque `@rotta/ui` não pode depender do
 * `ThemeProvider` de `apps/mobile`: lá o tema entra por parâmetro. É
 * aqui que o `useTheme()` do app encontra o componente do pacote.
 */
export type StatusPillTone = StatusTone;

export function StatusPill({ label, tone }: { label: string; tone: StatusPillTone }): JSX.Element {
  const { theme } = useTheme();
  /*
    `size="md"` e não o padrão `sm`: é o tamanho que mais se aproxima do
    selo que já estava na tela (fonte 12, respiro 10 por 4), para a
    troca não mexer na altura de nenhuma das listas que já existem.
  */
  return <StatusPillDoSistema label={label} tone={tone} size="md" theme={theme} />;
}
