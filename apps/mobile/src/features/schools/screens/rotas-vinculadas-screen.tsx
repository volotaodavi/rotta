import { Text } from "react-native";

import type { VeiculoStackParamList } from "@/navigation/types";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { VehicleScreen } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

type Props = NativeStackScreenProps<VeiculoStackParamList, "EscolaRotasVinculadas">;

/**
 * "Rotas vinculadas" (briefing "APP MOBILE"/"ROTAS") — gap honestamente
 * divulgado: o módulo de Rotas/Viagens ainda não existe na plataforma
 * (mesmo padrão de `alunosVinculados`/`rotasAtivas` sempre `0` no
 * dashboard de Escolas, `SchoolsService.getDashboard`). Esta tela já
 * está pronta para listar as rotas reais assim que aquele módulo for
 * implementado — a navegação e o contrato de tipos (`schoolId`) não
 * precisarão mudar.
 */
export function EscolaRotasVinculadasScreen(_props: Props): JSX.Element {
  const { theme } = useTheme();

  return (
    <VehicleScreen>
      <Text style={{ color: theme.colors.textMuted }}>
        O módulo de Rotas ainda não foi implementado na plataforma. Assim que estiver disponível, as
        rotas que atendem esta escola aparecerão aqui automaticamente.
      </Text>
    </VehicleScreen>
  );
}
