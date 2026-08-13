"use client";

import { Bell, History, Map, MessageCircle } from "@rotta/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { LucideIcon } from "@rotta/icons";
import type { Route } from "next";

interface DriverBottomNavItem {
  href: Route;
  label: string;
  icon: LucideIcon;
}

const ITEMS: DriverBottomNavItem[] = [
  { href: "/minha-rota", label: "Rota", icon: Map },
  { href: "/atividades", label: "Atividades", icon: History },
  { href: "/notificacoes", label: "Avisos", icon: Bell },
  { href: "/chamados", label: "Chamados", icon: MessageCircle },
];

/**
 * Navegação inferior (Frente K) — só pra quem roda a rota no dia a dia
 * pelo celular (Motorista/Monitor funcionário, Frente H, e dono
 * autônomo/MEI em Modo Ação, Frente G): o padrão "barra de navegação
 * inferior com ícones" da imagem de referência enviada pelo usuário
 * resolve um problema real que o Painel Web tinha em tela pequena — o
 * cabeçalho de texto (pensado pra Empresa/Gestor navegando com mouse
 * num desktop) obriga a apertar links minúsculos no topo da tela com o
 * polegar, sem nenhum ponto de toque grande e fixo. Some em telas
 * médias/grandes (`md:hidden`, mesmo breakpoint do `header`) porque lá
 * o cabeçalho já resolve — nunca duplica a mesma navegação nos dois
 * lugares ao mesmo tempo pro mesmo tamanho de tela.
 *
 * `env(safe-area-inset-bottom)` — respeita a faixa do indicador de
 * início do iPhone (Frente J, compatibilidade Safari/iOS: sem isso, os
 * botões ficariam colados/parcialmente cobertos por ela).
 */
export function DriverBottomNav(): JSX.Element {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-surface md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname?.startsWith(href) ?? false;
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
              isActive ? "text-primary" : "text-text-muted hover:text-text"
            }`}
          >
            <Icon size={20} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
