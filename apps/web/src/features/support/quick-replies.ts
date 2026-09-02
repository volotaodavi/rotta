import type { SupportTicketCategoria } from "@rotta/api-client";

export interface SupportQuickReply {
  label: string;
  assunto: string;
  descricao: string;
  categoria: SupportTicketCategoria;
}

/**
 * Perguntas pré-preenchidas (pedido do usuário 02/09/2026: "a IA deverá
 * ter opções para o pessoal selecionar, como se tivesse uma pergunta
 * já pré-preenchida") — tocar num chip preenche o formulário; a pessoa
 * ainda pode editar tudo ou digitar manualmente do zero (nenhum campo
 * fica travado). Mesma lista em `apps/mobile/.../quick-replies.ts` —
 * mudou aqui, muda lá também.
 */
export const SUPPORT_QUICK_REPLIES: SupportQuickReply[] = [
  {
    label: "Como cadastro um aluno?",
    assunto: "Como cadastro um aluno?",
    descricao: "Não estou encontrando onde cadastrar um novo aluno na plataforma.",
    categoria: "DUVIDA",
  },
  {
    label: "Como cadastro uma rota?",
    assunto: "Como cadastro uma rota?",
    descricao: "Preciso criar uma nova rota com paradas de embarque e desembarque.",
    categoria: "DUVIDA",
  },
  {
    label: "Não estou recebendo notificações",
    assunto: "Não estou recebendo notificações",
    descricao: "As notificações de embarque/desembarque pararam de chegar.",
    categoria: "PROBLEMA_TECNICO",
  },
  {
    label: "O motorista não aparece no mapa",
    assunto: "O motorista não aparece no mapa",
    descricao: "A localização do motorista não está atualizando no acompanhamento em tempo real.",
    categoria: "PROBLEMA_TECNICO",
  },
  {
    label: "Dúvida sobre cobrança/plano",
    assunto: "Dúvida sobre cobrança/plano",
    descricao: "Quero entender como funciona a cobrança da minha assinatura.",
    categoria: "COBRANCA",
  },
];
