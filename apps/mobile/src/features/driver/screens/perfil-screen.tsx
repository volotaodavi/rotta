import { useAuth } from "@rotta/auth/native";
import { StyleSheet, Text, View } from "react-native";

import { PanelGreeting } from "../components";

import type { DriverPerfilStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { PinSetupCard } from "@/features/auth/components";
import { VehicleButton, VehicleCard, VehicleScreen } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";



type Props = NativeStackScreenProps<DriverPerfilStackParamList, "PerfilHome">;

const ROLE_LABEL: Record<string, string> = {
  motorista: "Motorista",
  monitor: "Monitor(a)",
};

/** Iniciais do nome pro avatar (sem foto de perfil no produto ainda — nunca uma imagem inventada). */
function iniciais(nome: string | undefined): string {
  if (!nome) return "?";
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : "";
  return (primeira + ultima).toUpperCase();
}

/**
 * Perfil do Motorista/Monitor — avatar (iniciais, na identidade de
 * papel — `driverPrimary`/`monitorAccent`, mesma decisão de escopo de
 * `inicio-screen.tsx`), nome, papel, empresa e sair (mesmo padrão de
 * `painel-web-only-screen.tsx`, sem `window.confirm`/diálogo nativo). O
 * PIN de acesso rápido (Dossiê 42) só aparece para `motorista` — pedido
 * explícito do usuário ("caso os motoristas queiram"), Monitor não
 * ganha essa opção aqui. "Documentação Rotta" (Dossiê 45) abre a
 * Central de Documentação pública em uma WebView — disponível para os
 * dois papéis.
 */
export function DriverPerfilScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const isMonitor = user?.role === "monitor";
  const accentColor = isMonitor ? theme.colors.monitorAccent : theme.colors.driverPrimary;
  const accentMuted = isMonitor ? theme.colors.monitorAccentMuted : theme.colors.driverPrimaryMuted;

  return (
    <VehicleScreen>
      <PanelGreeting nome={user?.nome ?? ""} />

      <VehicleCard>
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: accentMuted }]}>
            <Text style={[styles.avatarLabel, { color: accentColor }]}>{iniciais(user?.nome)}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.nome, { color: theme.colors.text }]}>{user?.nome}</Text>
            <Text style={{ color: theme.colors.textMuted }}>
              {user ? (ROLE_LABEL[user.role] ?? user.role) : ""}
            </Text>
          </View>
        </View>
        {user?.companyName ? (
          <Text style={{ color: theme.colors.textMuted }}>{user.companyName}</Text>
        ) : null}
        <Text style={{ color: theme.colors.textMuted }}>{user?.email}</Text>
      </VehicleCard>

      {user?.role === "motorista" ? <PinSetupCard /> : null}

      {/* Frente AO — "Veículo" saiu da barra de 4 ícones (a referência não
          mostra essa aba) e virou um atalho aqui, igual à versão web
          (`ATALHOS_PERFIL_MOTORISTA`, `apps/web/.../perfil/page.tsx`). */}
      <VehicleButton
        label="Meu Veículo"
        variant="secondary"
        onPress={() => navigation.navigate("Veiculo")}
      />
      <VehicleButton
        label="Verificar identidade"
        variant="secondary"
        onPress={() => navigation.navigate("VerificacaoIdentidade")}
      />
      <VehicleButton
        label="Chamados"
        variant="secondary"
        onPress={() => navigation.navigate("Chamados")}
      />
      <VehicleButton
        label="Documentação Rotta"
        variant="secondary"
        onPress={() => navigation.navigate("Documentacao")}
      />
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
  headerInfo: { flex: 1 },
  nome: { fontSize: 16, fontWeight: "700" },
});
