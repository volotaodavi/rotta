"use client";

import { Bell } from "@rotta/icons";
import Link from "next/link";

import { useUnreadNotificationsCount } from "@/features/notifications/hooks/use-notifications";

/**
 * Sino de notificação da Visão Completa (Empresa/Gestor/Escola) —
 * pedido do usuário: "Faça um sino de notificação da Rotta para os
 * usuários (tanto no modo ação/completo)". Modo Ação e mobile já têm um
 * (`DriverBottomNav`/`ResponsavelBottomNav`, ícone `Bell` + badge na
 * barra inferior); este é o único lugar que faltava — o cabeçalho da
 * Visão Completa, onde "Notificações" hoje é só mais um link de texto
 * perdido entre outros 9. Mesmíssimo padrão (ícone + badge de não
 * lidas), só que como botão de cabeçalho em vez de item de barra
 * inferior.
 */
export function NotificationBell(): JSX.Element {
  const { data: naoLidas } = useUnreadNotificationsCount();

  return (
    <Link
      href="/notificacoes"
      prefetch={false}
      aria-label={naoLidas ? `Notificações (${naoLidas} não lidas)` : "Notificações"}
      className="relative flex items-center justify-center rounded-lg p-2 text-text-muted transition-colors hover:bg-muted hover:text-text"
    >
      <Bell size={20} />
      {typeof naoLidas === "number" && naoLidas > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-none text-white">
          {naoLidas > 99 ? "99+" : naoLidas}
        </span>
      )}
    </Link>
  );
}
