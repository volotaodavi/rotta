import { Typography } from "@rotta/ui/web";
import Link from "next/link";

import { LEGAL_FOOTER_LINKS } from "./legal-footer-links";

import { COMPANY_CNPJ, COMPANY_LEGAL_NAME } from "@/lib/site-config";

/**
 * Rodapé "ROTTA" (Dossiê 45, prompt §2) — a mesma lista de links usada
 * na coluna de rodapé da Landing Page/Site (`(marketing)/layout.tsx`)
 * e no rodapé do painel autenticado (`(dashboard)/layout.tsx`), mas
 * aqui como bloco pronto para páginas que não têm um rodapé próprio
 * ainda (`/legal/*`). Uma única fonte de verdade (`LEGAL_FOOTER_LINKS`)
 * — este componente só decide o layout visual, nunca a lista em si.
 */
export function LegalFooter(): JSX.Element {
  return (
    <footer className="w-full border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
        <div className="flex flex-col gap-3">
          <Typography variant="overline" color="muted">
            Rotta
          </Typography>
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {LEGAL_FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-text-muted transition-colors hover:text-text"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <Typography variant="caption" color="muted">
          © {new Date().getFullYear()} {COMPANY_LEGAL_NAME}, CNPJ {COMPANY_CNPJ}. Todos os direitos
          reservados.
        </Typography>
      </div>
    </footer>
  );
}
