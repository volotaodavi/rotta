import type { Route } from "next";

/**
 * Fonte única dos documentos do Rotta Legal, Trust & Community Center
 * (Dossiê 45) — consumida pela sidebar, pelo hub `/legal`, pela busca,
 * pelo rodapé global e pelo `sitemap.xml`. Nenhum outro arquivo deve
 * manter uma segunda lista dessas rotas (Dossiê 45 §35 do prompt
 * original: "não duplicar código").
 *
 * Versionamento (prompt §5): todo documento nasce na versão 1.0, com
 * `status: "PENDENTE_REVISAO_JURIDICA"` — nenhum documento desta
 * entrega vira `"PUBLICADO"` sem revisão por advogado (prompt §40).
 * Quando um documento for revisado e uma nova versão publicada,
 * incrementar `versao`/`atualizadoEm` aqui SEM apagar o texto anterior
 * do histórico (o histórico versionado de verdade — com diff e datas
 * de cada revisão anterior — depende do CMS do Admin ainda não
 * construído; ver Dossiê 45 §"Deferido").
 */
export type LegalDocumentStatus = "PENDENTE_REVISAO_JURIDICA";

export interface LegalDocumentMeta {
  slug: string;
  href: Route;
  titulo: string;
  resumo: string;
  versao: string;
  publicadoEm: string;
  atualizadoEm: string;
  status: LegalDocumentStatus;
  /** Termos que a busca (`LegalSearch`, prompt §33) associa a este documento — além do próprio título/resumo. */
  palavrasChave: string[];
}

export const LEGAL_DOCUMENTS: LegalDocumentMeta[] = [
  {
    slug: "privacidade",
    href: "/legal/privacidade",
    titulo: "Política de Privacidade / LGPD",
    resumo:
      "Quais dados coletamos, por quê, com quem compartilhamos e como você exerce seus direitos.",
    versao: "1.0",
    publicadoEm: "11/08/2026",
    atualizadoEm: "11/08/2026",
    status: "PENDENTE_REVISAO_JURIDICA",
    palavrasChave: ["gps", "localização", "lgpd", "dados", "crianças", "menores", "cookies"],
  },
  {
    slug: "termos",
    href: "/legal/termos",
    titulo: "Termos de Uso",
    resumo: "As regras de uso da plataforma — cadastro, marketplace, cobrança, responsabilidades.",
    versao: "1.1",
    publicadoEm: "01/08/2026",
    atualizadoEm: "11/08/2026",
    status: "PENDENTE_REVISAO_JURIDICA",
    palavrasChave: ["gps", "cadastro", "cobrança", "conta", "suspensão", "categoria b"],
  },
  {
    slug: "seguranca",
    href: "/legal/seguranca",
    titulo: "Segurança na Rotta",
    resumo:
      "Como protegemos contas, documentos, localização e dados financeiros — e como reportar uma vulnerabilidade.",
    versao: "1.0",
    publicadoEm: "11/08/2026",
    atualizadoEm: "11/08/2026",
    status: "PENDENTE_REVISAO_JURIDICA",
    palavrasChave: ["gps", "senha", "mfa", "autenticação", "vulnerabilidade", "criptografia"],
  },
  {
    slug: "comunidade",
    href: "/legal/comunidade",
    titulo: "Política da Comunidade Rotta",
    resumo: "O que não é tolerado na plataforma e quais as consequências.",
    versao: "1.0",
    publicadoEm: "11/08/2026",
    atualizadoEm: "11/08/2026",
    status: "PENDENTE_REVISAO_JURIDICA",
    palavrasChave: ["gps", "fraude", "denúncia", "bloqueio", "suspensão", "avaliação falsa"],
  },
  {
    slug: "rottapay",
    href: "/legal/rottapay",
    titulo: "Política Financeira RottaPay",
    resumo: "O que é a RottaPay, o papel da AbacatePay e da Lytex, e como o dinheiro circula.",
    versao: "1.0",
    publicadoEm: "11/08/2026",
    atualizadoEm: "11/08/2026",
    status: "PENDENTE_REVISAO_JURIDICA",
    palavrasChave: ["abacatepay", "lytex", "pix", "saque", "split", "pagamento", "nota fiscal"],
  },
  {
    slug: "motoristas",
    href: "/legal/motoristas",
    titulo: "Diretrizes para Motoristas e Modalidades de Transporte",
    resumo:
      "Categoria da CNH, EAR, cursos e a diferença entre transporte escolar, fretamento e transporte particular.",
    versao: "1.1",
    publicadoEm: "11/08/2026",
    atualizadoEm: "11/08/2026",
    status: "PENDENTE_REVISAO_JURIDICA",
    palavrasChave: [
      "categoria b",
      "cnh",
      "ear",
      "transporte escolar",
      "fretamento",
      "transporte particular",
      "curso",
      "categoria d",
      "categoria e",
    ],
  },
  {
    slug: "marketplace",
    href: "/legal/marketplace",
    titulo: "Política de Contratação e Marketplace",
    resumo: "Quem contrata, quem presta, quem paga, e qual é o papel da Rotta nessa relação.",
    versao: "1.1",
    publicadoEm: "11/08/2026",
    atualizadoEm: "11/08/2026",
    status: "PENDENTE_REVISAO_JURIDICA",
    palavrasChave: [
      "contrato",
      "contratação",
      "verificação",
      "assinatura eletrônica",
      "ia jurídica",
    ],
  },
  {
    slug: "cookies",
    href: "/legal/cookies",
    titulo: "Política de Cookies",
    resumo:
      "Como a sessão é mantida hoje e o que fazemos (e não fazemos) com cookies/rastreamento.",
    versao: "1.0",
    publicadoEm: "11/08/2026",
    atualizadoEm: "11/08/2026",
    status: "PENDENTE_REVISAO_JURIDICA",
    palavrasChave: ["cookies", "rastreamento", "analytics", "sessão"],
  },
  {
    slug: "comunicacoes",
    href: "/legal/comunicacoes",
    titulo: "Política de Comunicações",
    resumo:
      "Push, e-mail, WhatsApp e SMS — o que é transacional, o que é opcional, e como ajustar preferências.",
    versao: "1.0",
    publicadoEm: "11/08/2026",
    atualizadoEm: "11/08/2026",
    status: "PENDENTE_REVISAO_JURIDICA",
    palavrasChave: ["push", "e-mail", "whatsapp", "sms", "marketing", "notificação"],
  },
  {
    slug: "ajuda",
    href: "/legal/ajuda",
    titulo: "Central de Ajuda / Transparência",
    resumo: "Onde tirar dúvidas, reportar problemas e acompanhar se a Rotta está no ar.",
    versao: "1.0",
    publicadoEm: "11/08/2026",
    atualizadoEm: "11/08/2026",
    status: "PENDENTE_REVISAO_JURIDICA",
    palavrasChave: ["suporte", "status", "ajuda", "vulnerabilidade", "denúncia"],
  },
];

export function getLegalDocumentMeta(slug: string): LegalDocumentMeta | undefined {
  return LEGAL_DOCUMENTS.find((doc) => doc.slug === slug);
}

/** Busca simples (prompt §33) — casa a query contra título, resumo e `palavrasChave`; sem índice externo, tudo roda no cliente sobre os ~10 documentos existentes. */
export function searchLegalDocuments(query: string): LegalDocumentMeta[] {
  const termo = query.trim().toLowerCase();
  if (!termo) return [];

  return LEGAL_DOCUMENTS.filter(
    (doc) =>
      doc.titulo.toLowerCase().includes(termo) ||
      doc.resumo.toLowerCase().includes(termo) ||
      doc.palavrasChave.some((palavra) => palavra.includes(termo) || termo.includes(palavra)),
  );
}
