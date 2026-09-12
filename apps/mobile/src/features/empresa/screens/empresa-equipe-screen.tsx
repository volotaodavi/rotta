import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import {
  useApproveJoinRequest,
  useCancelJoinPreRegistration,
  useCreateJoinPreRegistration,
  useJoinPreRegistrations,
  useMyTeam,
  usePendingJoinRequests,
  useRejectJoinRequest,
} from "../hooks/use-empresa-team";
import {
  COMPANY_JOIN_PRE_REGISTRATION_STATUS_LABEL,
  COMPANY_JOIN_PRE_REGISTRATION_STATUS_TONE,
  IDENTITY_VERIFICATION_STATUS_LABEL,
  IDENTITY_VERIFICATION_STATUS_TONE,
  PAPEL_LABEL,
} from "../labels";

import type { Role } from "@rotta/api-client";

import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
  VehicleTextField,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

const PAPEIS_CONVITE: Role[] = ["motorista", "monitor", "gestor"];

/**
 * Equipe (Frente 5) — espelha `apps/web/.../equipe/page.tsx` +
 * `apps/web/.../convites/page.tsx` numa página só, 3 seções empilhadas
 * (mesmo padrão de página única + `.map()` do resto do app): pedidos de
 * vínculo pendentes (ação real — aprovar/recusar), roster da equipe
 * (leitura), convites (pré-cadastro pra vínculo automático).
 */
export function EmpresaEquipeScreen(): JSX.Element {
  const { theme } = useTheme();
  const { data: pendentes, isLoading: carregandoPendentes } = usePendingJoinRequests();
  const { data: equipe, isLoading: carregandoEquipe } = useMyTeam();
  const { data: convites, isLoading: carregandoConvites } = useJoinPreRegistrations();
  const approveJoinRequest = useApproveJoinRequest();
  const rejectJoinRequest = useRejectJoinRequest();
  const createConvite = useCreateJoinPreRegistration();
  const cancelConvite = useCancelJoinPreRegistration();

  const [papel, setPapel] = useState<Role>("motorista");
  const [nome, setNome] = useState("");
  const [celular, setCelular] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleCriarConvite(): void {
    if (nome.trim().length < 2 && celular.trim().length < 10) {
      setError("Informe ao menos o nome ou o celular da pessoa.");
      return;
    }
    setError(null);
    createConvite.mutate(
      {
        role: papel,
        nome: nome.trim() || undefined,
        celular: celular.trim() || undefined,
      },
      {
        onSuccess: () => {
          setNome("");
          setCelular("");
        },
        onError: () => setError("Não foi possível criar o convite. Tente novamente."),
      },
    );
  }

  return (
    <VehicleScreen>
      <VehicleCard style={styles.card}>
        <Text style={{ color: theme.colors.textMuted, fontWeight: "600", fontSize: 13 }}>
          Pedidos pendentes
        </Text>
        {carregandoPendentes ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : !pendentes || pendentes.length === 0 ? (
          <Text style={{ color: theme.colors.textMuted }}>Nenhum pedido pendente.</Text>
        ) : (
          pendentes.map((pedido) => (
            <View key={pedido.id} style={styles.pedido}>
              <Text style={{ color: theme.colors.text, fontWeight: "600" }}>{pedido.userName}</Text>
              <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
                {PAPEL_LABEL[pedido.role] ?? pedido.role} · {pedido.userEmail}
              </Text>
              <View style={styles.linhaBotoes}>
                <VehicleButton
                  label="Aprovar"
                  isLoading={
                    approveJoinRequest.isPending && approveJoinRequest.variables === pedido.id
                  }
                  onPress={() => approveJoinRequest.mutate(pedido.id)}
                />
                <VehicleButton
                  label="Recusar"
                  variant="danger"
                  isLoading={
                    rejectJoinRequest.isPending && rejectJoinRequest.variables?.id === pedido.id
                  }
                  onPress={() => rejectJoinRequest.mutate({ id: pedido.id })}
                />
              </View>
            </View>
          ))
        )}
      </VehicleCard>

      <VehicleCard style={styles.card}>
        <Text style={{ color: theme.colors.textMuted, fontWeight: "600", fontSize: 13 }}>
          Equipe
        </Text>
        {carregandoEquipe ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : !equipe || equipe.length === 0 ? (
          <Text style={{ color: theme.colors.textMuted }}>Nenhum membro na equipe ainda.</Text>
        ) : (
          equipe.map((membro) => (
            <View key={membro.userId} style={styles.membro}>
              <View style={styles.linha}>
                <Text style={{ color: theme.colors.text, fontWeight: "600" }}>{membro.nome}</Text>
                <StatusPill
                  label={IDENTITY_VERIFICATION_STATUS_LABEL[membro.identityVerificationStatus]}
                  tone={IDENTITY_VERIFICATION_STATUS_TONE[membro.identityVerificationStatus]}
                />
              </View>
              <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
                {PAPEL_LABEL[membro.papel] ?? membro.papel} · {membro.email}
              </Text>
            </View>
          ))
        )}
      </VehicleCard>

      <VehicleCard style={styles.card}>
        <Text style={{ color: theme.colors.textMuted, fontWeight: "600", fontSize: 13 }}>
          Novo convite
        </Text>
        <View style={styles.chips}>
          {PAPEIS_CONVITE.map((value) => (
            <VehicleButton
              key={value}
              label={PAPEL_LABEL[value] ?? value}
              variant={papel === value ? "primary" : "secondary"}
              onPress={() => setPapel(value)}
            />
          ))}
        </View>
        <VehicleTextField label="Nome (opcional)" value={nome} onChangeText={setNome} />
        <VehicleTextField
          label="Celular (opcional)"
          value={celular}
          onChangeText={setCelular}
          keyboardType="phone-pad"
        />
        {error ? <Text style={{ color: theme.colors.danger }}>{error}</Text> : null}
        <VehicleButton
          label="Criar convite"
          onPress={handleCriarConvite}
          isLoading={createConvite.isPending}
        />

        {carregandoConvites ? null : !convites || convites.length === 0 ? null : (
          <View style={styles.listaConvites}>
            {convites.map((convite) => (
              <View key={convite.id} style={styles.linha}>
                <View>
                  <Text style={{ color: theme.colors.text }}>
                    {convite.nome ?? convite.celular ?? PAPEL_LABEL[convite.role]}
                  </Text>
                  <StatusPill
                    label={COMPANY_JOIN_PRE_REGISTRATION_STATUS_LABEL[convite.status]}
                    tone={COMPANY_JOIN_PRE_REGISTRATION_STATUS_TONE[convite.status]}
                  />
                </View>
                {convite.status === "PENDENTE" ? (
                  <VehicleButton
                    label="Cancelar"
                    variant="danger"
                    isLoading={cancelConvite.isPending && cancelConvite.variables === convite.id}
                    onPress={() => cancelConvite.mutate(convite.id)}
                  />
                ) : null}
              </View>
            ))}
          </View>
        )}
      </VehicleCard>
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  linha: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  linhaBotoes: { flexDirection: "row", gap: 8 },
  listaConvites: { gap: 8, marginTop: 4 },
  membro: { gap: 2 },
  pedido: { gap: 4 },
});
