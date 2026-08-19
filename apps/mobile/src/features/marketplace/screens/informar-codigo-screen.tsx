import { useState } from "react";
import { StyleSheet, Text } from "react-native";

import { useTransporterByCode } from "../hooks/use-transporters";

import type { MarketplaceStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { VehicleButton, VehicleScreen, VehicleTextField } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<MarketplaceStackParamList, "InformarCodigo">;

/**
 * Frente M (briefing "Marketplace" §"SOLICITAR TRANSPORTE") — segunda
 * porta de entrada pra achar um transportador: o Responsável que já
 * sabe qual transportadora quer contratar (código compartilhado pela
 * própria empresa, ex. numa reunião de pais ou grupo de WhatsApp)
 * informa o código dela em vez de buscar por proximidade/escola.
 * Resolvido o código, cai exatamente na mesma tela de perfil público
 * (`TransportadorDetalhes`) que a busca normal usa — o fluxo de
 * solicitação/contrato a partir daí é o mesmo, sem duplicar nada.
 */
export function InformarCodigoScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const [codigo, setCodigo] = useState("");
  const buscar = useTransporterByCode();

  function handleConfirm(): void {
    if (!codigo.trim()) return;
    buscar.mutate(codigo, {
      onSuccess: (transportador) => {
        navigation.navigate("TransportadorDetalhes", { transportadorId: transportador.id });
      },
    });
  }

  return (
    <VehicleScreen>
      <Text style={[styles.titulo, { color: theme.colors.text }]}>
        Já sabe qual transportadora contratar?
      </Text>
      <Text style={{ color: theme.colors.textMuted }}>
        Informe o código que a transportadora compartilhou com você, sem precisar buscar por
        proximidade ou escola.
      </Text>

      <VehicleTextField
        label="Código da transportadora"
        value={codigo}
        onChangeText={(text) => setCodigo(text.toUpperCase())}
        placeholder="ex: TRN-000001"
        autoCapitalize="characters"
      />

      {buscar.isError ? (
        <Text style={{ color: theme.colors.danger }}>
          Nenhuma transportadora encontrada com esse código. Confira e tente de novo.
        </Text>
      ) : null}

      <VehicleButton
        label="Buscar"
        disabled={!codigo.trim() || buscar.isPending}
        isLoading={buscar.isPending}
        onPress={handleConfirm}
      />
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  titulo: { fontSize: 18, fontWeight: "700" },
});
