import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Platform } from "react-native";

import type { ComponentType } from "react";

/**
 * Ícone adaptativo: **SF Symbols no iOS**, ícone da Rotta (Lucide) no
 * Android e na web.
 *
 * Pedido do usuário 15/09/2026 ("quero usar os recursos de design da
 * Apple"). O caminho legítimo NÃO é baixar nada do Apple Design
 * Resources: a licença daqueles arquivos (`Apple-Design-Resources-
 * License`) permite apenas criar mock-ups de interfaces para iOS/
 * iPadOS/macOS/tvOS, e proíbe embutir em produto
 * ("You may not embed the Apple Font in any software programs").
 *
 * `expo-symbols` resolve isso pelo lado certo: no iOS ele desenha o
 * símbolo que JÁ VEM no sistema operacional, via framework nativo da
 * Apple — nenhum arquivo é baixado, distribuído ou embutido, e o uso
 * acontece exatamente onde a Apple permite. Fora do iOS o `SymbolView`
 * não existe, então cai no ícone Lucide (licença ISC) que a Rotta já
 * usa em todo o app.
 *
 * O resultado é o que as Human Interface Guidelines pedem: no iPhone o
 * app usa o vocabulário visual que o usuário do iPhone já conhece; no
 * Android continua com a identidade da Rotta, sem um ícone de iOS
 * deslocado no meio da tela.
 *
 * Uso:
 * ```tsx
 * <RottaSymbol ios="bus.fill" fallback={Bus} size={20} color={theme.colors.primary} />
 * ```
 */
export function RottaSymbol({
  ios,
  fallback: Fallback,
  size = 20,
  color,
  weight = "regular",
}: {
  /** Nome do SF Symbol (ex.: `"bus.fill"`) — consultável no app SF Symbols da Apple. */
  ios: string;
  /** Ícone Lucide equivalente, usado em Android/web. Obrigatório: nunca deixar a tela sem ícone fora do iOS. */
  fallback: ComponentType<{ size?: number; color?: string }>;
  size?: number;
  color?: string;
  weight?: SymbolViewProps["weight"];
}): JSX.Element {
  if (Platform.OS === "ios") {
    return (
      <SymbolView
        name={ios as SymbolViewProps["name"]}
        size={size}
        tintColor={color}
        weight={weight}
        // `fallback` do próprio SymbolView cobre o caso de um símbolo
        // que só existe numa versão de iOS mais nova que a do aparelho
        // — sem isto, o espaço ficaria vazio no iPhone antigo.
        fallback={<Fallback size={size} color={color} />}
      />
    );
  }

  return <Fallback size={size} color={color} />;
}
