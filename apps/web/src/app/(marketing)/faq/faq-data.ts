/**
 * Dados do FAQ — em módulo neutro (nem "use client" nem Server
 * Component), porque tanto `page.tsx` (server, usa pra montar o
 * JSON-LD FAQPage) quanto `faq-accordion.tsx` (client, usa pra
 * renderizar o acordeão) precisam do mesmo array. Exportar dados
 * simples de dentro de um arquivo "use client" para um Server
 * Component não atravessa o boundary de forma confiável em build de
 * produção (o Server Component recebe uma referência de módulo
 * client, não o valor real) — daqui os dois lados importam a mesma
 * fonte sem esse problema.
 */
export const FAQS = [
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
