import { useAuth } from "@rotta/auth/native";
import { StyleSheet, Text, View } from "react-native";

import { VehicleButton, VehicleCard, VehicleScreen } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

/** Iniciais do nome pro avatar (sem foto de perfil no produto ainda — nunca uma imagem inventada). */
function iniciais(nome: string | undefined): string {
  if (!nome) return "?";
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : "";
  return (primeira + ultima).toUpperCase();
}

/**
 * Perfil da Empresa/Gestor no app (pedido do usuário 11/09/2026) —
 * avatar (iniciais), dados da conta, nome da transportadora e sair.
 * Mesmo modelo de `admin-perfil-screen.tsx`, trocando o sub-papel
 * (`adminPapel`) pelo `companyName`. Sem edição de conta/empresa aqui
 * — isso continua exclusivo da Web (`/empresa`).
 */
export function EmpresaPerfilScreen(): JSX.Element {
  const { theme } = useTheme();
  const { user, logout } = useAuth();

  return (
    <VehicleScreen>
      <VehicleCard>
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primaryMuted }]}>
            <Text style={[styles.avatarLabel, { color: theme.colors.primary }]}>
              {iniciais(user?.nome)}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.nome, { color: theme.colors.text }]}>{user?.nome}</Text>
            {user?.companyName ? (
              <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                {user.companyName}
              </Text>
            ) : null}
          </View>
        </View>
        <Text style={{ color: theme.colors.textMuted }}>{user?.email}</Text>
        {user?.telefone ? (
          <Text style={{ color: theme.colors.textMuted }}>{user.telefone}</Text>
        ) : null}
      </VehicleCard>

      <VehicleButton label="Sair" variant="secondary" onPress={() => void logout()} />
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    borderRadius: 999,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  avatarLabel: { fontSize: 18, fontWeight: "700" },
  header: { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 4 },
  headerInfo: { flex: 1, gap: 4 },
  nome: { fontSize: 16, fontWeight: "700" },
});
