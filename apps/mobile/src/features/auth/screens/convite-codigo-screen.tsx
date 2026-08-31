import { useState } from "react";
import { StyleSheet, Text } from "react-native";

import { AuthButton, AuthScreen, AuthTextField } from "../components";

import { ConviteTransportadoraLink } from "./convite-transportadora-screen";

import type { AuthStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<AuthStackParamList, "ConviteCodigo">;

/**
 * Entrada do código de convite (Dossiê 15, `AUTH-01-A1`) — ex.: "M586PO",
 * "RTA-8F29KQ". A validação real (código existe/expirou/já usado)
 * acontece na tela seguinte, consultando a API.
 *
 * "mesma aba, segmentos diferentes" (Dossiê 26, pedido do usuário) — o
 * link de rodapé abaixo leva pra `ConviteTransportadoraScreen`, que
 * cadastra o Responsável a partir do "código da transportadora"
 * (`Company.codigoInterno`), um conceito bem diferente deste código de
 * convite de equipe (`Invite`, uso único). Equivalente móvel da aba "Sou
 * responsável" já unificada em `apps/web` `(auth)/convite`.
 */
export function ConviteCodigoScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const [codigo, setCodigo] = useState("");

  return (
    <AuthScreen>
      <Text
        style={[
          styles.title,
          { color: theme.colors.text, fontSize: theme.typography.title.fontSize },
        ]}
      >
        Código de convite
      </Text>
      <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
        Informe o código que você recebeu da empresa ou escola.
      </Text>

      <AuthTextField
        label="Código"
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="Ex.: RTA-8F29KQ"
        value={codigo}
        onChangeText={setCodigo}
      />

      <AuthButton
        label="Continuar"
        disabled={codigo.trim().length === 0}
        onPress={() =>
          navigation.navigate("ConvitePreview", { codigo: codigo.trim().toUpperCase() })
        }
      />

      <ConviteTransportadoraLink onPress={() => navigation.navigate("ConviteTransportadora")} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  subtitle: { fontSize: 14, marginBottom: 8 },
  title: { fontWeight: "600", marginBottom: 4 },
});
