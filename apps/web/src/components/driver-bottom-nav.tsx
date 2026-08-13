"use client";

import { Car, History, Home, User } from "@rotta/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { LucideIcon } from "@rotta/icons";
import type { Route } from "next";

interface DriverBottomNavItem {
  href: Route;
  label: string;
  icon: LucideIcon;
}

/**
 * Exatamente os 4 destinos da imagem de referência (Home/Activities/
 * Car/Profile, Frente O) — pedido explícito do usuário: "não deverá
 * ter nenhuma aba/nome clicável na barra de navegação a não ser oq foi
 * descrito no design novo". "Veículo" (`GET /vehicles/me`) e "Perfil"
 * são páginas novas desta entrega — sem elas, Car/Profile do design
 * apontariam pra lugar nenhum.
 */
const ITEMS: DriverBottomNavItem[] = [
  { href: "/minha-rota", label: "Início", icon: Home },
  { href: "/atividades", label: "Atividades", icon: History },
  { href: "/veiculo", label: "Veículo", icon: Car },
  { href: "/perfil", label: "Perfil", icon: User },
];

/**
 * Navegação inferior (Frente K, restrita à imagem de referência na
 * Frente O) — pra quem roda a rota no dia a dia: Motorista/Monitor
 * funcionário (Frente H) e dono autônomo/MEI em Modo Ação (Frente G).
 * ÚNICA navegação pra este público — o cabeçalho de texto foi removido
 * de propósito (`(dashboard)/layout.tsx`, `showDriverNavBar`), então
 * esta barra fica visível em QUALQUER largura de tela (sem `md:hidden`
 * — pedido do usuário: "Faça isso para todas as plataformas, sem
 * exceção", inclusive desktop/navegador). `max-w-xl mx-auto` mantém os
 * alvos de toque num tamanho razoável em telas muito largas, em vez de
 * esticar os 4 ícones borda a borda de um monitor.
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
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex w-full max-w-xl">
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
      </div>
    </nav>
  );
}
