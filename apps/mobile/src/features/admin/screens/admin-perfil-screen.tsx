import { useAuth } from "@rotta/auth/native";
import { LogOut } from "@rotta/icons/native";
import { Text } from "react-native";

import { ADMIN_PAPEL_LABEL, ADMIN_PAPEL_TONE } from "../labels";

import { CabecalhoDePerfil } from "@/features/perfil";
import {
  MenuRowList,
  StatusPill,
  VehicleCard,
  VehicleScreen,
} from "@/features/vehicles/components";
import { useTheme } from "@/providers/theme-provider";

/**
 * Perfil do Admin Rotta no app (pedido do usuário 05/09/2026) — avatar
 * (iniciais), dados da conta, sub-papel (GERAL/SUPORTE/FINANCEIRO,
 * "RBAC — papéis de acesso admin") e sair. Sem edição de conta aqui —
 * gestão de contas Admin continua exclusiva da Web (`/admin-contas`).
 */
export function AdminPerfilScreen(): JSX.Element {
  const { theme } = useTheme();
  const { user, logout } = useAuth();

  return (
    <VehicleScreen>
      <CabecalhoDePerfil
        nome={user?.nome}
        papel="Admin Rotta"
        selo={
          user?.adminPapel ? (
            <StatusPill
              label={ADMIN_PAPEL_LABEL[user.adminPapel]}
              tone={ADMIN_PAPEL_TONE[user.adminPapel]}
            />
          ) : null
        }
      />

      <VehicleCard>
        <Text style={{ color: theme.colors.textMuted }}>{user?.email}</Text>
        {user?.telefone ? (
          <Text style={{ color: theme.colors.textMuted }}>{user.telefone}</Text>
        ) : null}
      </VehicleCard>

      {/* Mesmo "Sair" vermelho e sem seta dos outros quatro perfis: um
          botão cinza aqui e uma linha vermelha lá seriam duas respostas
          para a mesma ação. */}
      <MenuRowList
        items={[{ icon: LogOut, label: "Sair", onPress: () => void logout(), destrutivo: true }]}
      />
    </VehicleScreen>
  );
}
