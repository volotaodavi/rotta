import { ClipboardCheck } from "@rotta/icons/native";
import { SectionHeader } from "@rotta/ui/native";
import { useState } from "react";
import { StyleSheet, Switch, View } from "react-native";

import {
  StatusPill,
  VehicleButton,
  VehicleCard,
  VehicleScreen,
  VehicleTextField,
} from "../components";
import {
  useChecklistDoCiclo,
  useCreateVehicleChecklist,
  useMyVehicle,
} from "../hooks/use-vehicles";

import type { ChecklistViagem, VehicleChecklist } from "@rotta/api-client";

import { Texto } from "@/components/texto";
import { useTheme } from "@/providers/theme-provider";

const ITENS: {
  chave: "pneusOk" | "lucesOk" | "combustivelOk" | "limpezaOk" | "equipamentosObrigatoriosOk";
  rotulo: string;
}[] = [
  { chave: "pneusOk", rotulo: "Pneus" },
  { chave: "lucesOk", rotulo: "Luzes" },
  { chave: "combustivelOk", rotulo: "Combustível" },
  { chave: "limpezaOk", rotulo: "Limpeza" },
  { chave: "equipamentosObrigatoriosOk", rotulo: "Equipamentos obrigatórios" },
];

/**
 * Todo item começa marcado, como na folha de papel: o motorista
 * desmarca o que está errado. Trocar isso por "tudo desmarcado" faria o
 * caminho normal (veículo em ordem) ser o caminho mais trabalhoso.
 */
const EM_BRANCO = {
  pneusOk: true,
  lucesOk: true,
  combustivelOk: true,
  limpezaOk: true,
  equipamentosObrigatoriosOk: true,
};

function rotuloDaViagem(viagem: ChecklistViagem): string {
  const dia = new Date(viagem.data).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
  return `${viagem.sentido === "VOLTA" ? "Volta" : "Ida"} de ${dia} · ${viagem.codigo}`;
}

function problemas(checklist: VehicleChecklist): string {
  const marcados = ITENS.filter((item) => !checklist[item.chave]).map((item) => item.rotulo);
  return marcados.length > 0 ? marcados.join(", ") : "Tudo OK";
}

/**
 * Checklist de viagem (briefing "CHECKLIST") — preenchido por quem vai
 * na van, Motorista ou Monitor, sempre com o ator autenticado como
 * autor (`POST /vehicles/:id/checklists`).
 *
 * A tela mostra um ciclo só, nunca a lista inteira: o checklist da
 * viagem de agora e, abaixo, o informativo da viagem anterior. Quando a
 * viagem é finalizada, o formulário volta em branco — e isso não é a
 * tela esquecendo nada: o checklist da viagem que acabou continua
 * gravado, ligado àquela viagem, e é o que o responsável vê depois.
 */
export function ChecklistScreen(): JSX.Element {
  const { theme } = useTheme();
  const { data: vehicle } = useMyVehicle();
  const { data: ciclo, isLoading } = useChecklistDoCiclo(vehicle?.id);
  const createChecklist = useCreateVehicleChecklist(vehicle?.id);

  const [form, setForm] = useState(EM_BRANCO);
  const [observacoes, setObservacoes] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  function handleSubmit(): void {
    setErro(null);
    createChecklist.mutate(
      { ...form, observacoes: observacoes.trim() || undefined },
      {
        onSuccess: () => {
          setForm(EM_BRANCO);
          setObservacoes("");
        },
        // Sem isto, a falha era silenciosa: o motorista apertava, nada
        // acontecia na tela, e ele seguia viagem achando que o
        // checklist estava registrado.
        onError: () =>
          setErro("Não foi possível registrar o checklist. Verifique a conexão e tente de novo."),
      },
    );
  }

  const jaFeito = ciclo?.atual ?? null;

  return (
    <VehicleScreen>
      {ciclo?.viagemAtual ? (
        <VehicleCard>
          <View style={styles.linha}>
            <Texto style={[styles.titulo, { color: theme.colors.text }]}>
              {rotuloDaViagem(ciclo.viagemAtual)}
            </Texto>
            <StatusPill
              label={jaFeito ? "Checklist feito" : "Checklist pendente"}
              tone={jaFeito ? "success" : "warning"}
            />
          </View>
          <Texto style={{ color: theme.colors.textMuted, fontSize: 13 }}>
            Viagem em andamento. O checklist registrado agora fica nesta viagem.
          </Texto>
        </VehicleCard>
      ) : null}

      {jaFeito ? (
        <VehicleCard>
          <Texto style={[styles.titulo, { color: theme.colors.text }]}>Checklist deste ciclo</Texto>
          <Texto style={{ color: theme.colors.text }}>{problemas(jaFeito)}</Texto>
          {jaFeito.observacoes ? (
            <Texto style={{ color: theme.colors.textMuted }}>{jaFeito.observacoes}</Texto>
          ) : null}
          <Texto style={{ color: theme.colors.textMuted, fontSize: 12 }}>
            {jaFeito.preenchidoPorNome} · {new Date(jaFeito.createdAt).toLocaleString("pt-BR")}
          </Texto>
        </VehicleCard>
      ) : null}

      <VehicleCard>
        <Texto style={[styles.titulo, { color: theme.colors.text }]}>
          {jaFeito ? "Registrar de novo" : "Novo checklist"}
        </Texto>
        {!ciclo?.viagemAtual && !isLoading ? (
          <Texto style={{ color: theme.colors.textMuted, fontSize: 13 }}>
            Sem viagem em andamento. Este checklist entra na próxima viagem que você iniciar.
          </Texto>
        ) : null}
        {ITENS.map((item) => (
          <View key={item.chave} style={styles.linhaDeSwitch}>
            <Texto style={{ color: theme.colors.text }}>{item.rotulo}</Texto>
            <Switch
              value={form[item.chave]}
              onValueChange={(valor) => setForm((atual) => ({ ...atual, [item.chave]: valor }))}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              accessibilityLabel={item.rotulo}
            />
          </View>
        ))}
        <VehicleTextField
          label="Observações"
          value={observacoes}
          onChangeText={setObservacoes}
          placeholder="O que precisa de atenção"
          multiline
          numberOfLines={3}
        />
        {erro ? <Texto style={{ color: theme.colors.danger, fontSize: 13 }}>{erro}</Texto> : null}
        <VehicleButton
          label="Registrar checklist"
          onPress={handleSubmit}
          isLoading={createChecklist.isPending}
        />
      </VehicleCard>

      {/* O informativo que o usuário pediu: a viagem passou, o
          checklist dela fica à vista, sem poder ser editado. */}
      {ciclo?.anterior?.viagem ? (
        <View>
          <SectionHeader title="Viagem anterior" theme={theme} />
          <VehicleCard>
            <Texto style={{ color: theme.colors.textMuted, fontSize: 13 }}>
              {rotuloDaViagem(ciclo.anterior.viagem)}
            </Texto>
            <Texto style={{ color: theme.colors.text }}>{problemas(ciclo.anterior)}</Texto>
            {ciclo.anterior.observacoes ? (
              <Texto style={{ color: theme.colors.textMuted }}>{ciclo.anterior.observacoes}</Texto>
            ) : null}
            <Texto style={{ color: theme.colors.textMuted, fontSize: 12 }}>
              {ciclo.anterior.preenchidoPorNome} ·{" "}
              {new Date(ciclo.anterior.createdAt).toLocaleString("pt-BR")}
            </Texto>
          </VehicleCard>
        </View>
      ) : !isLoading && !jaFeito ? (
        <VehicleCard>
          <View style={styles.linha}>
            <ClipboardCheck size={20} color={theme.colors.primary} />
            <Texto style={{ color: theme.colors.textMuted, fontSize: 13 }}>
              Nenhum checklist registrado ainda. O de antes de sair é o que prova que o veículo saiu
              em ordem.
            </Texto>
          </View>
        </VehicleCard>
      ) : null}
    </VehicleScreen>
  );
}

const styles = StyleSheet.create({
  linha: { alignItems: "center", flexDirection: "row", gap: 8 },
  linhaDeSwitch: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  titulo: { fontSize: 16, fontWeight: "700" },
});
