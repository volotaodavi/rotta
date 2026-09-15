import { Image, StyleSheet, Text, View } from "react-native";

import APP_ICON from "../../../../assets/icon.png";

import { useTheme } from "@/providers/theme-provider";

/**
 * Lockup "ícone + Rotta + Mobilidade Escolar" centralizado — topo da
 * tela de Login, seguindo o print de referência real da Rotta anexado
 * pelo usuário 15/09/2026 ("O UX/UI design deverá seguir o design
 * anexado. A partir de login."). Reaproveita `icon.png` (o mesmo
 * ícone já usado como ícone do app — gerado a partir do logotipo
 * enviado pelo usuário, ver `app.config.ts`), nunca um ícone novo
 * desenhado à parte.
 */
export function AuthLogoMark(): JSX.Element {
  const { theme } = useTheme();

  return (
    <View style={styles.wrap}>
      <Image source={APP_ICON} style={styles.mark} />
      <Text
        style={[
          styles.wordmark,
          { color: theme.colors.text, fontSize: theme.typography.subtitle.fontSize },
        ]}
      >
        Rotta
      </Text>
      <Text
        style={[
          styles.tagline,
          { color: theme.colors.textMuted, fontSize: theme.typography.caption.fontSize },
        ]}
      >
        Mobilidade Escolar
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { borderRadius: 14, height: 56, marginBottom: 4, width: 56 },
  tagline: {},
  wordmark: { fontWeight: "700" },
  wrap: { alignItems: "center", gap: 2 },
});
