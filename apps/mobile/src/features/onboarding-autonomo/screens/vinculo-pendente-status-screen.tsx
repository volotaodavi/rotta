import { useAuth } from "@rotta/auth/native";
import { StyleSheet, Text } from "react-native";

import { useMyJoinRequest } from "../hooks/use-join-request";

import type { VinculoPendenteStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useMyIdentityVerification } from "@/features/driver/hooks/use-identity-verification";
import { VehicleButton, VehicleScreen } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<VinculoPendenteStackParamList, "Status">;

const IDENTITY_STATUS_LABEL: Record<string, string> = {
  NAO_INICIADA: "Ainda não iniciada",
  EM_ANDAMENTO: "Em andamento",
  EM_ANALISE: "Em análise pela Didit",
  APROVADA: "Aprovada",
  REPROVADA: "Reprovada",
  EXPIRADA: "Expirada",
};

/**
 * Tela mostrada no lugar de `DriverNavigator` enquanto o Motorista/
 * Monitor autônomo (Frente N) ainda não tem `companyId` — dois passos,
 * um de cada vez: 1) completar a verificação de identidade Didit
 * (reaproveita a mesma WebView de `DriverPerfilStackParamList`); 2)
 * informar o código da transportadora (`InformarCodigo`) e aguardar a
 * empresa aprovar. `useMyJoinRequest` mostra o status do último pedido
 * feito, incluindo o motivo se foi recusado.
 */
export function VinculoPendenteStatusScreen({ navigation }: Props): JSX.Element {
  const { theme } = useTheme();
  const { logout, user } = useAuth();
  const { data: identity, isLoading: isLoadingIdentity } = useMyIdentityVerification();
  const { data: joinRequest, isLoading: isLoadingRequest } = useMyJoinRequest();

  const identityAprovada = identity?.status === "APROVADA";

  return (
    <VehicleScreen>
      <Text style={[styles.titulo, { color: theme.colors.text }]}>
        Olá, {user?.nome?.split(" ")[0] ?? "tudo bem"}
      </Text>
      <Text style={{ color: theme.colors.textMuted }}>
        Falta pouco pra você começar a usar a Rotta como{" "}
        {user?.role === "monitor" ? "monitor" : "motorista"}.
      </Text>

      <Text style={[styles.secao, { color: theme.colors.text }]}>1. Verificação de identidade</Text>
      <Text style={{ color: theme.colors.textMuted }}>
        {isLoadingIdentity
          ? "Carregando…"
          : (IDENTITY_STATUS_LABEL[identity?.status ?? "NAO_INICIADA"] ?? identity?.status)}
      </Text>
      {!identityAprovada ? (
        <VehicleButton
          label={
            identity?.status === "NAO_INICIADA" ? "Iniciar verificação" : "Continuar verificação"
          }
          variant="secondary"
          onPress={() => navigation.navigate("VerificacaoIdentidade")}
        />
      ) : null}

      <Text style={[styles.secao, { color: theme.colors.text }]}>
        2. Vínculo com uma transportadora
      </Text>
      {isLoadingRequest ? (
        <Text style={{ color: theme.colors.textMuted }}>Carregando…</Text>
      ) : !joinRequest ? (
        <Text style={{ color: theme.colors.textMuted }}>
          Você ainda não informou o código de nenhuma transportadora.
        </Text>
      ) : joinRequest.status === "PENDENTE" ? (
        <Text style={{ color: theme.colors.textMuted }}>
          Pedido enviado para {joinRequest.companyName}, aguardando a empresa aprovar.
        </Text>
      ) : joinRequest.status === "RECUSADO" ? (
        <>
          <Text style={{ color: theme.colors.danger }}>
            {joinRequest.companyName} recusou seu pedido
            {joinRequest.motivoRecusa ? `: ${joinRequest.motivoRecusa}` : "."}
          </Text>
          <Text style={{ color: theme.colors.textMuted }}>
            Você pode informar o código de outra transportadora.
          </Text>
        </>
      ) : (
        <Text style={{ color: theme.colors.textMuted }}>
          Pedido aprovado por {joinRequest.companyName}, entre novamente pra acessar.
        </Text>
      )}

      {!joinRequest || joinRequest.status === "RECUSADO" ? (
        <VehicleButton
          label="Informar código da transportadora"
          disabled={!identityAprovada}
          onPress={() => navigation.navigate("InformarCodigo")}
        />
      ) : null}
      {!identityAprovada && (!joinRequest || joinRequest.status === "RECUSADO") ? (
        <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
          Conclua a verificação de identidade antes de informar o código.
        </Text>
      ) : null}

      <VehicleButton label="Sair" variant="secondary" onPress={() => void logout()} />
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  secao: { fontSize: 16, fontWeight: "700", marginTop: 8 },
  titulo: { fontSize: 18, fontWeight: "700" },
});
