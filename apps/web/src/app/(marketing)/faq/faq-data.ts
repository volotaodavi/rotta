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
  {
    question: "Preciso colocar dados de pagamento para testar?",
    answer:
      "Não. Ao criar a conta, sua empresa entra automaticamente no 1º mês grátis, com todas as funcionalidades liberadas, sem pedir cartão de crédito nem qualquer outro dado de pagamento.",
  },
  {
    question: "Posso já assinar o plano Starter, sem esperar o trial?",
    answer:
      'Sim. Além do cadastro normal ("Começar agora", que já libera 1 mês grátis), existe um segundo caminho para quem já sabe que quer pagar: em "Planos", escolha "Já quero assinar (pagar agora)" e pague via Pix, cartão ou boleto antes mesmo de criar a conta — a empresa nasce ativa, sem passar pelo trial.',
  },
];
