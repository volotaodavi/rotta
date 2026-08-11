import type { Route } from "next";

/**
 * Lista fixa da coluna "Rotta" do rodapé global (Dossiê 45 — prompt
 * "ROTTA LEGAL, TRUST & COMMUNITY CENTER" §2) — usada tanto pelo rodapé
 * da Landing Page/Site (`(marketing)/layout.tsx`) quanto pelo rodapé do
 * painel autenticado (`(dashboard)/layout.tsx`), única fonte para não
 * duplicar a lista (prompt §35).
 */
export const LEGAL_FOOTER_LINKS: { href: Route; label: string }[] = [
  { href: "/sobre", label: "Sobre a Rotta" },
  { href: "/contato", label: "Contato" },
  { href: "/legal/ajuda", label: "Central de Ajuda" },
  { href: "/legal/seguranca", label: "Segurança" },
  { href: "/legal/privacidade", label: "Privacidade" },
  { href: "/legal/termos", label: "Termos de Uso" },
  { href: "/legal/comunidade", label: "Política da Comunidade" },
  { href: "/legal/rottapay", label: "RottaPay" },
  { href: "/legal/motoristas", label: "Diretrizes para Motoristas" },
  { href: "/legal/cookies", label: "Cookies" },
];
