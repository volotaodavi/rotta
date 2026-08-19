"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { LucideIcon } from "@rotta/icons";
import type { Route } from "next";

export interface PortalBottomNavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Contagem exibida como badge (ex.: notificações não lidas) — omitido/0 não mostra nada. */
  badge?: number;
  /** Rota padrão (a maioria dos itens é um `Link` simples). */
  href?: Route;
  /** Navegação com decisão em tempo de clique (ex.: "Viagens" do Responsável, que depende de quantos alunos existem). Tem prioridade sobre `href` quando presente. */
  onNavigate?: () => void;
  /** Prefixo usado pra decidir o estado ativo quando difere de `href` (ex.: item com `onNavigate` que aponta pra rotas variáveis). */
  activePrefix?: string;
  /** `true` = só ativo em correspondência exata (ex.: "Início" apontando pra uma rota que também é prefixo de outra aba, como "/alunos" vs. "/alunos/:id/mapa" da aba "Viagens"). Padrão: prefixo (`startsWith`). */
  exact?: boolean;
}

/**
 * Barra inferior de 4 ícones — peça visual compartilhada entre
 * `DriverBottomNav` (Motorista/Monitor/Autônomo em Modo Ação) e
 * `ResponsavelBottomNav` (Frente AO, pedido do usuário: "quero
 * literalmente igual" às 3 imagens de referência, que usam a mesma
 * estrutura de 4 abas — Início/Viagens/Notificações/Perfil — pros 3
 * papéis). Estado ativo sempre em `text-primary` (azul), mesma cor nas
 * 3 imagens de referência mesmo nas telas do Monitor (roxo) — só a aba
 * "Mais" ativada a partir de um atalho secundário usa a cor do papel
 * nas imagens, nuance que este componente não replica (baixa confiança
 * sem poder inspecionar visualmente, ver relato ao usuário).
 */
export function PortalBottomNav({ items }: { items: PortalBottomNavItem[] }): JSX.Element {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex w-full max-w-xl">
        {items.map(({ key, label, icon: Icon, badge, href, onNavigate, activePrefix, exact }) => {
          const prefix = activePrefix ?? href;
          const isActive = Boolean(
            prefix && (exact ? pathname === prefix : pathname?.startsWith(prefix)),
          );
          const className = `relative flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
            isActive ? "text-primary" : "text-text-muted hover:text-text"
          }`;
          const content = (
            <>
              <span className="relative">
                <Icon size={20} />
                {badge ? (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-none text-white">
                    {badge > 9 ? "9+" : badge}
                  </span>
                ) : null}
              </span>
              {label}
            </>
          );

          if (onNavigate) {
            return (
              <button key={key} type="button" onClick={onNavigate} className={className}>
                {content}
              </button>
            );
          }
          return (
            <Link key={key} href={href ?? "#"} className={className}>
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
