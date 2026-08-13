import { useState } from "react";
import { StyleSheet, Text } from "react-native";

import { useCreateJoinRequest } from "../hooks/use-join-request";

import type { VinculoPendenteStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { VehicleButton, VehicleScreen, VehicleTextField } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<VinculoPendenteStackParamList, "InformarCodigo">;

/**
 * "Informar código da transportadora" (Frente N, briefing item 9) —
 * mesmo código público (`Company.codigoInterno`) que o Responsável usa
 * no Marketplace (Frente M), só que aqui cria um `CompanyJoinRequest`
 * em vez de resolver direto pro perfil da empresa: alguém pedindo pra
 * ENTRAR como staff precisa da aprovação da empresa, diferente de
 * pedir um orçamento.
 */
export function InformarCodigoVinculoScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const [codigo, setCodigo] = useState("");
  const criar = useCreateJoinRequest();

  function handleConfirm(): void {
    if (!codigo.trim()) return;
    criar.mutate(codigo, {
      onSuccess: () => navigation.navigate("Status"),
    });
  }

  return (
    <VehicleScreen>
      <Text style={[styles.titulo, { color: theme.colors.text }]}>Código da transportadora</Text>
      <Text style={{ color: theme.colors.textMuted }}>
        Peça à transportadora o código dela (a mesma tela onde ela mostra pros responsáveis) e
        informe aqui pra pedir vínculo.
      </Text>

      <VehicleTextField
        label="Código"
        value={codigo}
        onChangeText={(text) => setCodigo(text.toUpperCase())}
        placeholder="ex: TRN-000001"
        autoCapitalize="characters"
      />

      {criar.isError ? (
        <Text style={{ color: theme.colors.danger }}>
          Nenhuma transportadora encontrada com esse código, ou você já tem um pedido pendente.
          Confira e tente de novo.
        </Text>
      ) : null}

      <VehicleButton
        label="Enviar pedido"
        disabled={!codigo.trim() || criar.isPending}
        isLoading={criar.isPending}
        onPress={handleConfirm}
      />
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: 18, fontWeight: "700" },
});
