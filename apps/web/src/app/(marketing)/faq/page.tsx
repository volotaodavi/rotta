import { Typography } from "@rotta/ui/web";

import { FaqAccordion } from "./faq-accordion";
import { FAQS } from "./faq-data";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Perguntas frequentes",
  description:
    "Tire dúvidas sobre como cadastrar sua empresa na Rotta, como motoristas entram por convite, se site e aplicativo usam a mesma conta e como trocar de plano.",
  alternates: { canonical: "/faq" },
};

/**
 * Dados estruturados JSON-LD (schema.org FAQPage, Dossiê 12 §7.4) —
 * gerado a partir do mesmo array `FAQS` que alimenta o acordeão
 * (`faq-accordion.tsx`), nunca duplicado à mão. Isso é o tipo de
 * marcação que o Google pode usar para mostrar as perguntas direto no
 * resultado de busca (rich result), sem custo nenhum além de já ter o
 * conteúdo real na página — nunca uma pergunta que não existe visível
 * no `<body>`.
 */
function FaqJsonLd(): JSX.Element {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
  return (
    // eslint-disable-next-line react/no-danger -- JSON-LD estático, nenhuma entrada de usuário envolvida.
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

/** FAQ (briefing "SITE RESPONSIVO") — Server Component (metadata + JSON-LD); o acordeão interativo vive em `faq-accordion.tsx`. */
export default function FaqPage(): JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-6 py-20">
      <FaqJsonLd />
      <Typography variant="headline" as="h1" className="text-center">
        Perguntas frequentes
      </Typography>
      <FaqAccordion />
    </div>
  );
}
