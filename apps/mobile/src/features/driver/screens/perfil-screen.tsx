import { useAuth } from "@rotta/auth/native";
import { StyleSheet, Text } from "react-native";

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

/**
 * Perfil do Motorista/Monitor — nome, papel, empresa e sair (mesmo
 * padrão de `painel-web-only-screen.tsx`, sem `window.confirm`/diálogo
 * nativo). O PIN de acesso rápido (Dossiê 42) só aparece para
 * `motorista` — pedido explícito do usuário ("caso os motoristas
 * queiram"), Monitor não ganha essa opção aqui. "Documentação Rotta"
 * (Dossiê 45) abre a Central de Documentação pública em uma WebView —
 * disponível para os dois papéis.
 */
export function DriverPerfilScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const { user, logout } = useAuth();

  return (
    <VehicleScreen>
      <VehicleCard>
        <Text style={[styles.nome, { color: theme.colors.text }]}>{user?.nome}</Text>
        <Text style={{ color: theme.colors.textMuted }}>
          {user ? (ROLE_LABEL[user.role] ?? user.role) : ""}
        </Text>
        {user?.companyName ? (
          <Text style={{ color: theme.colors.textMuted }}>{user.companyName}</Text>
        ) : null}
        <Text style={{ color: theme.colors.textMuted }}>{user?.email}</Text>
      </VehicleCard>

      {user?.role === "motorista" ? <PinSetupCard /> : null}

      <VehicleButton
        label="Verificar identidade"
        variant="secondary"
        onPress={() => navigation.navigate("VerificacaoIdentidade")}
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
  nome: { fontSize: 16, fontWeight: "700" },
});
