"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LEGAL_DOCUMENTS } from "@/features/legal/documents";

/**
 * Navegação lateral/vertical da Documentação Rotta (Dossiê 45, prompt
 * §3) — cada item leva direto a um documento, sem passar pela home.
 * Mesmo componente usado no desktop (coluna fixa) e dentro do menu
 * expansível do mobile (prompt §3/§32) — só o wrapper muda,
 * `LegalSidebar` em si não sabe se está em desktop ou mobile.
 */
export function LegalSidebar({ onNavigate }: { onNavigate?: () => void }): JSX.Element {
  const pathname = usePathname();

  return (
    <nav aria-label="Documentação Rotta" className="flex flex-col gap-1">
      {LEGAL_DOCUMENTS.map((doc) => {
        const ativo = pathname === doc.href;
        return (
          <Link
            key={doc.slug}
            href={doc.href}
            onClick={onNavigate}
            aria-current={ativo ? "page" : undefined}
            className={`rounded-md px-3 py-2 text-sm transition-colors ${
              ativo
                ? "bg-primary/10 font-semibold text-primary"
                : "text-text-muted hover:bg-muted hover:text-text"
            }`}
          >
            {doc.titulo}
          </Link>
        );
      })}
    </nav>
  );
}
