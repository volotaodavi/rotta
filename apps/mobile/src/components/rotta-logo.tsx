import { Image, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/providers/theme-provider";

/* eslint-disable @typescript-eslint/no-require-imports -- `require` é a forma padrão de referenciar um asset estático de imagem no Metro/React Native. */
const MARK = require("../../assets/splash-icon.png");
/* eslint-enable @typescript-eslint/no-require-imports */

export type RottaLogoVariant = "mark" | "full";

/**
 * Símbolo "R" da Rotta (Seção 15) — reaproveita o PNG real já usado na
 * splash nativa do Expo (`assets/splash-icon.png`, transparente,
 * recortado do logotipo original enviado pelo usuário — mesma fonte de
 * `apps/web/public/brand/rotta-mark*.png`, ver `app.config.ts`). Nunca
 * redesenhado: é literalmente o mesmo arquivo, só outro tamanho de
 * renderização.
 *
 * `variant="full"` acrescenta o texto "ROTTA" ao lado/abaixo do
 * símbolo — não existe um wordmark em PNG próprio para o app nativo
 * (só a versão web tem `rotta-wordmark-light.png`, pensada para fundo
 * escuro fixo da Landing Page); aqui o texto usa a tipografia Inter do
 * Design System, que já é a mesma família em toda a plataforma
 * (`packages/theme/src/tokens/typography.ts`), então não há perda de
 * consistência de marca em usar texto em vez de imagem.
 */
export function RottaLogo({
  size = 96,
  variant = "mark",
  textColor,
}: {
  size?: number;
  variant?: RottaLogoVariant;
  textColor?: string;
}): JSX.Element {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Image source={MARK} style={{ width: size, height: size }} resizeMode="contain" />
      {variant === "full" ? (
        <Text
          style={[
            styles.wordmark,
            {
              color: textColor ?? theme.colors.text,
              fontSize: size * 0.28,
              marginTop: size * 0.14,
            },
          ]}
        >
          ROTTA
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center" },
  wordmark: { fontWeight: "700", letterSpacing: 2 },
});
