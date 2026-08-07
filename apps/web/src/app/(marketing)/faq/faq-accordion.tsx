"use client";

import { ChevronDown } from "@rotta/icons";
import { Typography } from "@rotta/ui/web";
import { useState } from "react";

import { FAQS } from "./faq-data";

/**
 * Acordeão do FAQ — extraído para um componente client separado (Dossiê
 * 12 §7.4, SEO) porque `page.tsx` agora é um Server Component (precisa
 * exportar `metadata`/JSON-LD FAQPage, algo que um componente "use
 * client" não pode fazer). `FAQS` vem de `faq-data.ts` (módulo neutro,
 * nem client nem server) e não daqui — um Server Component importando
 * um valor simples de dentro de um módulo "use client" não atravessa o
 * boundary de forma confiável em build de produção (bug encontrado e
 * corrigido nesta mesma tarefa: `f.FAQS.map is not a function` no
 * prerender de `/faq`).
 */
export function FaqAccordion(): JSX.Element {
  const [abertaIndex, setAbertaIndex] = useState<number | null>(0);

  return (
    <div className="flex flex-col divide-y divide-border">
      {FAQS.map((faq, index) => {
        const aberta = abertaIndex === index;
        return (
          <div key={faq.question} className="py-2">
            <button
              type="button"
              onClick={() => setAbertaIndex(aberta ? null : index)}
              aria-expanded={aberta}
              className="flex w-full items-center justify-between gap-4 py-4 text-left"
            >
              <Typography variant="subtitle">{faq.question}</Typography>
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-text-muted transition-transform duration-150 ${aberta ? "rotate-180" : ""}`}
              />
            </button>
            {aberta && (
              <Typography variant="body" color="muted" className="pb-4">
                {faq.answer}
              </Typography>
            )}
          </div>
        );
      })}
    </div>
  );
}
