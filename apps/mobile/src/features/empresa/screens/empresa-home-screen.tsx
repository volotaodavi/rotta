import { useAuth } from "@rotta/auth/native";
import { StyleSheet, Text, View } from "react-native";

import { VehicleScreen } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

/**
 * Início da área Empresa/Gestor reduzida no app (pedido do usuário
 * 11/09/2026: "veja oq tem na web e traga para o app oficial" — versão
 * reduzida confirmada). Frente 1 (fundação): só a saudação por
 * enquanto — os atalhos pra "Alunos" e "Equipe" (aninhados nesta
 * mesma aba, ver `EmpresaTabParamList`) entram nas Frentes 2 e 5,
 * quando essas telas existirem de verdade (mesmo cuidado do Admin: sem
 * botão morto apontando pra rota que ainda não existe).
 */
export function EmpresaHomeScreen(): JSX.Element {
  const { theme } = useTheme();
  const { user } = useAuth();

  return (
    <VehicleScreen>
      <View>
        <Text style={[styles.saudacao, { color: theme.colors.text }]}>Olá, {user?.nome}</Text>
        {user?.companyName ? (
          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>{user.companyName}</Text>
        ) : null}
      </View>
      <Text style={{ color: theme.colors.textMuted }}>
        Acompanhe sua frota e suas rotas por aqui. Mais áreas de gestão chegam em breve.
      </Text>
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  saudacao: { fontSize: 18, fontWeight: "700" },
});
