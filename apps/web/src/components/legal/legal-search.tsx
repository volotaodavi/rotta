"use client";

import { Search } from "@rotta/icons";
import { Input, Typography } from "@rotta/ui/web";
import Link from "next/link";
import { useState } from "react";

import { searchLegalDocuments } from "@/features/legal/documents";

/** Busca na Documentação Rotta (prompt §33) — ex. "GPS" retorna Privacidade, Segurança, Termos e Comunidade. */
export function LegalSearch(): JSX.Element {
  const [query, setQuery] = useState("");
  const resultados = searchLegalDocuments(query);

  return (
    <div className="relative flex flex-col gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar na documentação (ex.: GPS, categoria B, cookies)"
          className="pl-9"
          aria-label="Buscar na documentação Rotta"
        />
      </div>
      {query.trim() && (
        <div className="rounded-md border border-border bg-surface">
          {resultados.length === 0 ? (
            <Typography variant="bodySmall" color="muted" className="p-3">
              Nenhum documento encontrado para &ldquo;{query}&rdquo;.
            </Typography>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {resultados.map((doc) => (
                <li key={doc.slug}>
                  <Link
                    href={doc.href}
                    onClick={() => setQuery("")}
                    className="flex flex-col gap-0.5 p-3 transition-colors hover:bg-muted"
                  >
                    <span className="text-sm font-semibold text-text">{doc.titulo}</span>
                    <span className="text-xs text-text-muted">{doc.resumo}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
