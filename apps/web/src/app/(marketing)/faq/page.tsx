"use client";

import { ChevronDown } from "@rotta/icons";
import { Typography } from "@rotta/ui/web";
import { useState } from "react";

const FAQS = [
  {
    question: "Como faço para cadastrar minha empresa?",
    answer:
      'Clique em "Criar conta", escolha "Área Profissional" e depois "Criar Empresa". O cadastro leva poucos minutos.',
  },
  {
    question: "Motoristas precisam se cadastrar sozinhos?",
    answer:
      "Não. A empresa gera um código de convite para cada motorista, que usa esse código no aplicativo para completar o cadastro.",
  },
  {
    question: "A mesma conta funciona no site e no aplicativo?",
    answer: "Sim. É uma única conta Rotta, compartilhada entre o painel Web e o aplicativo.",
  },
  {
    question: "Posso trocar de plano depois?",
    answer: "Sim, a qualquer momento pelo painel da empresa.",
  },
];

/** FAQ (briefing "SITE RESPONSIVO") — acordeão: cada pergunta expande sob demanda, sem preencher a tela toda de texto já visível. */
export default function FaqPage(): JSX.Element {
  const [abertaIndex, setAbertaIndex] = useState<number | null>(0);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-6 py-20">
      <Typography variant="headline" as="h1" className="text-center">
        Perguntas frequentes
      </Typography>
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
    </div>
  );
}
