import { MapPin } from "@rotta/icons/native";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/providers/theme-provider";

/**
 * Divulgação proeminente da localização em segundo plano — exigida
 * pela Google Play ("Prominent Disclosure & Consent Requirements")
 * sempre que um app pede `ACCESS_BACKGROUND_LOCATION`: precisa mostrar,
 * DENTRO do app (não só o diálogo nativo do SO), o que é coletado, por
 * quê, e um botão de consentimento explícito ANTES do diálogo nativo
 * aparecer. Ver `useTripGpsReporting` (o hook que só chama
 * `requestBackgroundPermissionsAsync` depois de `onConfirmar`).
 */
export function BackgroundLocationDisclosureModal({
  visible,
  onConfirmar,
}: {
  visible: boolean;
  onConfirmar: () => void;
}): JSX.Element {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.colors.surfaceElevated, marginBottom: insets.bottom },
          ]}
        >
          <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary + "22" }]}>
            <MapPin size={28} color={theme.colors.primary} />
          </View>

          <Text style={[styles.titulo, { color: theme.colors.text }]}>
            Localização em segundo plano
          </Text>
          <Text style={[styles.corpo, { color: theme.colors.textMuted }]}>
            Durante a viagem, a Rotta coleta sua localização mesmo com o app minimizado ou a tela
            bloqueada, para que as famílias acompanhem o trajeto em tempo real. A coleta acontece só
            enquanto a viagem estiver em andamento — nunca fora dela — e você pode revogar essa
            permissão a qualquer momento nas configurações do aparelho.
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={onConfirmar}
            style={[styles.botao, { backgroundColor: theme.colors.primary }]}
          >
            <Text style={styles.botaoLabel}>Entendi, continuar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  botao: {
    alignItems: "center",
    borderRadius: 10,
    marginTop: 20,
    paddingVertical: 14,
    width: "100%",
  },
  botaoLabel: { color: "#fff", fontSize: 15, fontWeight: "700" },
  card: {
    alignItems: "center",
    borderRadius: 20,
    padding: 24,
    width: "100%",
  },
  corpo: { fontSize: 14, lineHeight: 21, textAlign: "center" },
  iconCircle: {
    alignItems: "center",
    borderRadius: 999,
    height: 56,
    justifyContent: "center",
    marginBottom: 16,
    width: 56,
  },
  overlay: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    flex: 1,
    justifyContent: "flex-end",
    padding: 20,
  },
  titulo: { fontSize: 18, fontWeight: "700", marginBottom: 10, textAlign: "center" },
});
