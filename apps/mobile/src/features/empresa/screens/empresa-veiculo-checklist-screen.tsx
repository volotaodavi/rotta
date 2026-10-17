import {} from "react-native";

import type { EmpresaFrotaStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { VehicleChecklist } from "@rotta/api-client";

import { Texto } from "@/components/texto";
import { VehicleCard, VehicleScreen } from "@/features/vehicles/components";
import { useVehicleChecklists } from "@/features/vehicles/hooks/use-vehicles";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<EmpresaFrotaStackParamList, "Checklist">;

/**
 * "Checklist" (Frente C) — mirror de `ChecklistTab`: só leitura, o
 * checklist é registrado por quem vai na van, Motorista ou Monitor,
 * antes de cada viagem (`vehicles/screens/checklist-screen.tsx`) —
 * aqui a Empresa/Gestor só acompanha.
 *
 * Cada cartão diz de que viagem o checklist é e quem preencheu. Sem
 * isso a lista eram cinco cartões iguais, sem como saber a qual dia,
 * turno e pessoa cada um pertencia.
 */
export function EmpresaVeiculoChecklistScreen({ route }: Props): JSX.Element {
  const { theme } = useTheme();
  const { vehicleId } = route.params;
  const { data } = useVehicleChecklists(vehicleId);

  function Item({ label, ok }: { label: string; ok: boolean }): JSX.Element {
    return (
      <Texto style={{ color: ok ? theme.colors.textMuted : theme.colors.danger, fontSize: 14 }}>
        {label}: {ok ? "OK" : "Problema"}
      </Texto>
    );
  }

  return (
    <VehicleScreen>
      {!data || data.items.length === 0 ? (
        <Texto style={{ color: theme.colors.textMuted }}>Nenhum checklist registrado ainda.</Texto>
      ) : (
        data.items.map((c: VehicleChecklist) => (
          <VehicleCard key={c.id} style={{ gap: 6 }}>
            <Texto style={{ color: theme.colors.text, fontWeight: "600" }}>
              {new Date(c.createdAt).toLocaleString("pt-BR")}
            </Texto>
            <Texto style={{ color: theme.colors.textMuted, fontSize: 12 }}>
              {c.viagem
                ? `${c.viagem.sentido === "VOLTA" ? "Volta" : "Ida"} · viagem ${c.viagem.codigo}`
                : "Pré-viagem, sem viagem iniciada"}
              {" · "}
              {c.preenchidoPorNome}
            </Texto>
            <Item label="Pneus" ok={c.pneusOk} />
            <Item label="Luzes" ok={c.lucesOk} />
            <Item label="Combustível" ok={c.combustivelOk} />
            <Item label="Limpeza" ok={c.limpezaOk} />
            <Item label="Equipamentos obrigatórios" ok={c.equipamentosObrigatoriosOk} />
            {c.observacoes ? (
              <Texto style={{ color: theme.colors.textMuted, fontSize: 12 }}>
                Observações: {c.observacoes}
              </Texto>
            ) : null}
          </VehicleCard>
        ))
      )}
    </VehicleScreen>
  );
}
