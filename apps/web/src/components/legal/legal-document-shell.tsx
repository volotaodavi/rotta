import { Typography } from "@rotta/ui/web";
import Link from "next/link";

import type { LegalDocumentMeta } from "@/features/legal/documents";
import type { Route } from "next";
import type { ReactNode } from "react";

export interface LegalTocItem {
  id: string;
  label: string;
}

/**
 * Casco compartilhado de cada documento (Dossiê 45, prompt §4/§5) —
 * título, selo de versão/status, índice navegável por âncora e link
 * para documentos relacionados. Uma única implementação consumida por
 * todos os `/legal/*`, para nunca duplicar o "paredão de texto sem
 * estrutura" que o prompt pede para evitar (§31).
 */
export function LegalDocumentShell({
  meta,
  toc,
  children,
  relacionados,
}: {
  meta: LegalDocumentMeta;
  toc: LegalTocItem[];
  children: ReactNode;
  relacionados?: { href: Route; label: string }[];
}): JSX.Element {
  return (
    <article className="flex w-full max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-3">
        <Typography variant="headline" as="h1">
          {meta.titulo}
        </Typography>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
          <span>
            Versão <strong>{meta.versao}</strong>
          </span>
          <span>Publicado em {meta.publicadoEm}</span>
          <span>Atualizado em {meta.atualizadoEm}</span>
        </div>
      </header>

      <div className="rounded-md border border-warning/40 bg-warning/10 p-4">
        <Typography variant="bodySmall">
          <strong>Documento pendente de revisão jurídica.</strong> O conteúdo abaixo foi redigido
          com base no funcionamento real da plataforma (auditado, não copiado de um modelo
          genérico), mas ainda precisa ser revisado por um advogado antes de ser tratado como o
          texto final e vinculante deste documento.
        </Typography>
      </div>

      {toc.length > 0 && (
        <nav aria-label={`Índice — ${meta.titulo}`} className="rounded-md border border-border p-4">
          <Typography variant="overline" color="muted" className="mb-2 block">
            Nesta página
          </Typography>
          <ol className="flex flex-col gap-1">
            {toc.map((item, index) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className="text-sm text-primary hover:underline">
                  {index + 1}. {item.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="flex flex-col gap-8">{children}</div>

      {relacionados && relacionados.length > 0 && (
        <footer className="flex flex-col gap-2 border-t border-border pt-6">
          <Typography variant="overline" color="muted">
            Documentos relacionados
          </Typography>
          <ul className="flex flex-col gap-1">
            {relacionados.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-primary hover:underline">
                  {link.label} →
                </Link>
              </li>
            ))}
          </ul>
        </footer>
      )}
    </article>
  );
}

/** Seção com âncora — todo item do índice (`LegalTocItem.id`) deve corresponder ao `id` de uma `LegalSection`. */
export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <section id={id} className="flex scroll-mt-24 flex-col gap-2">
      <Typography variant="title" as="h2">
        {title}
      </Typography>
      <div className="flex flex-col gap-3 text-base leading-6 text-text-muted [&_a]:text-primary [&_a]:underline [&_strong]:text-text">
        {children}
      </div>
    </section>
  );
}
