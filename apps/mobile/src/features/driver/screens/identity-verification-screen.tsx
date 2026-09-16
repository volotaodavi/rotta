import { Text } from "react-native";

import { IdentityVerificationStatusCard } from "../components";

import { VehicleCard, VehicleScreen } from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

/**
 * "Verificar identidade", entrada voluntária no Perfil do Motorista/
 * Monitor/dono autônomo-MEI (reaberta a qualquer momento, mesmo já
 * aprovada, pra conferir o status) — substitui
 * `DriverIdentityVerificationWebViewScreen` (Frente 12/09/2026, pedido
 * do usuário: "não deve parecer com a web, mas sim o app próprio").
 * Aquela WebView embutia `/verificacao-identidade` do Painel Web
 * inteira — visual web e, pior, exigia um SEGUNDO login (sessão web
 * isolada, sem ponte com a nativa). Esta tela é 100% nativa; toda a
 * lógica de status/sessão mora em `IdentityVerificationStatusCard`
 * (mesmo card usado no bloqueio total, `IdentityVerificationBlockedScreen`).
 */
export function DriverIdentityVerificationScreen(): JSX.Element {
  const { theme } = useTheme();

  return (
    <VehicleScreen>
      <Text style={{ color: theme.colors.textMuted, fontSize: 14, lineHeight: 18 }}>
        Confirme sua identidade com a Didit: documento + biometria facial, num único formulário
        guiado.
      </Text>
      <VehicleCard>
        <IdentityVerificationStatusCard />
      </VehicleCard>
    </VehicleScreen>
  );
}
