import {
  AlertCircle,
  Clock,
  MoreHorizontal,
  ShieldAlert,
  UserX,
  Wrench,
  type LucideIcon,
} from "@rotta/icons/native";
import { EmptyState, ListRow, SectionHeader } from "@rotta/ui/native";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
  VehicleTextField,
} from "../components";
import {
  useCreateVehicleOccurrence,
  useMyVehicle,
  useVehicleOccurrences,
} from "../hooks/use-vehicles";
import { VEHICLE_OCCURRENCE_SEVERITY_LABEL, VEHICLE_OCCURRENCE_SEVERITY_TONE } from "../labels";

import { useTheme } from "@/providers/theme-provider";

/**
 * Os cinco tipos da tela 21 do conceito.
 *
 * Eles **não** são um campo novo no banco: viram o `titulo` da
 * ocorrência, que já existe e já era texto livre. O que muda é quem
 * digita. Quem registra isso é o motorista, muitas vezes parado no
 * meio da rota, com o celular no suporte e aluno esperando. Pedir que
 * ele escreva "Problema no veículo" com o polegar, nessa situação, é
 * pedir que ele não registre.
 *
 * "Outros" continua abrindo o campo livre, porque a lista nunca cobre
 * tudo, e uma lista fechada obrigaria a escolher o tipo errado.
 */
const TIPOS: { chave: string; rotulo: string; icone: LucideIcon }[] = [
  { chave: "atraso", rotulo: "Atraso", icone: Clock },
  { chave: "ausente", rotulo: "Aluno ausente", icone: UserX },
  { chave: "veiculo", rotulo: "Problema no veículo", icone: Wrench },
  { chave: "seguranca", rotulo: "Situação de segurança", icone: ShieldAlert },
  { chave: "outros", rotulo: "Outros", icone: MoreHorizontal },
];

/**
 * Ocorrências do veículo (briefing "APP MOBILE") — único fluxo de
 * escrita desta stack aberto a Motorista/Monitor além do Checklist
 * (`POST /vehicles/:id/occurrences` aceita `EMPRESA, GESTOR, MOTORISTA,
 * MONITOR`, Dossiê 13). Severidade `MEDIA` como ponto de partida
 * neutro.
 *
 * ## O que mudou em 16/10/2026
 *
 * A tela era dois campos de texto vazios: "Título" e "Descrição". A
 * tela 21 do conceito é uma escolha entre cinco tipos, em linhas
 * tocáveis com ícone, e só depois o texto. A diferença é quem está
 * usando: o motorista registra isso durante a rota, não sentado.
 *
 * O registro continua exigindo descrição: tipo sem descrição vira uma
 * lista de "Atraso" sem nenhuma informação sobre o que aconteceu, e
 * quem lê do outro lado não consegue agir.
 */
export function OcorrenciasScreen(): JSX.Element {
  const { theme } = useTheme();
  const { data: vehicle } = useMyVehicle();
  const { data: occurrences } = useVehicleOccurrences(vehicle?.id);
  const createOccurrence = useCreateVehicleOccurrence(vehicle?.id);

  const [tipo, setTipo] = useState<string | null>(null);
  const [tituloLivre, setTituloLivre] = useState("");
  const [descricao, setDescricao] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const escolhido = TIPOS.find((t) => t.chave === tipo) ?? null;
  const ehOutros = tipo === "outros";
  const titulo = ehOutros ? tituloLivre : (escolhido?.rotulo ?? "");

  function handleSubmit(): void {
    if (!titulo.trim()) {
      setErrorMessage(
        ehOutros ? "Escreva o que aconteceu no título." : "Escolha o tipo da ocorrência.",
      );
      return;
    }
    if (!descricao.trim()) {
      setErrorMessage("Descreva o que aconteceu: sem isso, quem recebe não consegue agir.");
      return;
    }
    setErrorMessage(null);
    createOccurrence.mutate(
      { titulo: titulo.trim(), descricao: descricao.trim(), severidade: "MEDIA" },
      {
        onSuccess: () => {
          setTipo(null);
          setTituloLivre("");
          setDescricao("");
        },
        onError: () => setErrorMessage("Não foi possível registrar a ocorrência. Tente novamente."),
      },
    );
  }

  return (
    <VehicleScreen>
      <View>
        <SectionHeader title="Escolha o tipo" theme={theme} />
        <View style={styles.tipos}>
          {TIPOS.map((opcao) => {
            const Icone = opcao.icone;
            const ativo = opcao.chave === tipo;
            return (
              <ListRow
                key={opcao.chave}
                rotulo={opcao.rotulo}
                icon={<Icone size={20} color={ativo ? theme.colors.primary : theme.colors.text} />}
                onPress={() => {
                  setTipo(opcao.chave);
                  setErrorMessage(null);
                }}
                selecionado={ativo}
                comoCartao
                theme={theme}
              />
            );
          })}
        </View>
      </View>

      {/* O texto só aparece depois do tipo: um campo vazio antes da
          escolha é um formulário pedindo trabalho sem contexto. */}
      {tipo ? (
        <VehicleCard>
          {ehOutros ? (
            <VehicleTextField
              label="O que aconteceu"
              value={tituloLivre}
              onChangeText={setTituloLivre}
              placeholder="Em poucas palavras"
            />
          ) : null}
          <VehicleTextField
            label="Descrição"
            value={descricao}
            onChangeText={setDescricao}
            placeholder="Conte o que aconteceu, onde e quando"
            multiline
            numberOfLines={3}
          />
          {errorMessage ? (
            <Text style={{ color: theme.colors.danger, fontSize: 13 }}>{errorMessage}</Text>
          ) : null}
          <VehicleButton
            label="Registrar"
            onPress={handleSubmit}
            isLoading={createOccurrence.isPending}
          />
        </VehicleCard>
      ) : null}

      <View>
        <SectionHeader title="Registradas" theme={theme} />
        {occurrences?.items.length === 0 ? (
          <EmptyState
            title="Nenhuma ocorrência registrada"
            description="O que você registrar aqui chega para a transportadora."
            icon={<AlertCircle size={28} color={theme.colors.primary} />}
            theme={theme}
          />
        ) : (
          <View style={styles.registradas}>
            {occurrences?.items.map((occurrence) => (
              <VehicleCard key={occurrence.id}>
                <View style={styles.headerRow}>
                  <Text style={[styles.title, { color: theme.colors.text }]}>
                    {occurrence.titulo}
                  </Text>
                  <StatusPill
                    label={VEHICLE_OCCURRENCE_SEVERITY_LABEL[occurrence.severidade]}
                    tone={VEHICLE_OCCURRENCE_SEVERITY_TONE[occurrence.severidade]}
                  />
                </View>
                <Text style={{ color: theme.colors.textMuted, fontSize: 13 }}>
                  {occurrence.descricao}
                </Text>
                <Text style={{ color: theme.colors.textMuted, fontSize: 11 }}>
                  {new Date(occurrence.createdAt).toLocaleString("pt-BR")}
                </Text>
              </VehicleCard>
            ))}
          </View>
        )}
      </View>
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  registradas: { gap: 12 },
  tipos: { gap: 8 },
  title: { flex: 1, fontSize: 15, fontWeight: "700" },
});
