"use client";

import { Bell, History, Home, User } from "@rotta/icons";

import { PortalBottomNav } from "./portal-bottom-nav";

import { useUnreadNotificationsCount } from "@/features/notifications/hooks/use-notifications";


/**
 * Frente AO — corrigido pra bater EXATAMENTE com os rótulos das 3
 * imagens de referência (Início/Viagens/Notificações/Perfil, os mesmos
 * 4 nas telas do Responsável/Monitor/Motorista) — a versão anterior
 * (Frente O, "Início/Atividades/Veículo/Perfil") usava rótulos
 * inventados que não existiam em nenhuma imagem. "Viagens" reaproveita
 * a mesma página de histórico (`/atividades`, só renomeada aqui);
 * "Veículo" sai da barra (mas continua acessível pelo Perfil, ver
 * `ATALHOS_PERFIL` em `app/(dashboard)/perfil/page.tsx`) pra abrir
 * espaço pra "Notificações", que nas imagens sempre é a 3ª aba, com
 * badge de não lidas.
 */
export function DriverBottomNav(): JSX.Element {
  const { data: naoLidas } = useUnreadNotificationsCount();

  return (
    <PortalBottomNav
      items={[
        { key: "inicio", href: "/minha-rota", label: "Início", icon: Home },
        { key: "viagens", href: "/atividades", label: "Viagens", icon: History },
        {
          key: "notificacoes",
          href: "/notificacoes",
          label: "Notificações",
          icon: Bell,
          badge: naoLidas,
        },
        { key: "perfil", href: "/perfil", label: "Perfil", icon: User },
      ]}
    />
  );
}
