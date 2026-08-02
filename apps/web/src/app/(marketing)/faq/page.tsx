import { Typography } from "@rotta/ui/web";

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

/** FAQ (briefing "SITE RESPONSIVO"). */
export default function FaqPage(): JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-10 px-6 py-20">
      <Typography variant="headline" as="h1" className="text-center">
        Perguntas frequentes
      </Typography>
      <div className="flex flex-col divide-y divide-border">
        {FAQS.map((faq) => (
          <div key={faq.question} className="flex flex-col gap-2 py-6">
            <Typography variant="subtitle">{faq.question}</Typography>
            <Typography variant="body" color="muted">
              {faq.answer}
            </Typography>
          </div>
        ))}
      </div>
    </div>
  );
}
