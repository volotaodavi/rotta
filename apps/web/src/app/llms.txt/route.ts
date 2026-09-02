import { CONTACT_EMAIL, getSiteUrl } from "@/lib/site-config";

/**
 * `llms.txt` (Dossiê 12 §7.4) — convenção emergente (não é um padrão do
 * Google/Search Console) para dar a assistentes de IA que navegam a
 * web um resumo curto e correto do site, em vez de eles inferirem
 * errado a partir de HTML denso. Gerado como *route handler* (não um
 * arquivo estático em `public/`) pelo mesmo motivo de `sitemap.ts`/
 * `robots.ts`: usar `getSiteUrl()` em vez de hardcodar um domínio —
 * aqui isso importa ainda mais, porque um domínio errado dentro do
 * PRÓPRIO conteúdo do arquivo (não só num link) confundiria o
 * assistente que o lesse.
 */
export function GET(): Response {
  const siteUrl = getSiteUrl();

  const body = `# Rotta

> A Rotta é uma plataforma de gestão de transporte escolar: conecta responsáveis, transportadoras, motoristas e monitores em uma única conta, com rastreamento em tempo real do transporte, notificação de embarque e desembarque, e gestão de frota para transportadoras.

Rotta do Brasil Tecnologia e Soluções de Transportes. Site institucional e painel Web em ${siteUrl}.

Quatro perfis de conta, cada um com funcionalidades próprias:
- **Responsável**: encontra uma transportadora, acompanha o transporte no mapa em tempo real e recebe notificação a cada embarque/desembarque. Gratuito, sem mensalidade.
- **Transportadora**: painel com gestão de motoristas, veículos, rotas e alunos, além do Rotta Pay (acompanhamento de recebimentos). Plano Starter R$ 39,90/mês, com 1º mês grátis (sem necessidade de cartão de crédito).
- **Motorista**: autônomo/MEI (paga a mesma mensalidade de uma transportadora, pois é a própria transportadora) ou contratado por uma empresa via convite (gratuito). App com rota do dia, checklist do veículo e registro de embarque/desembarque.
- **Monitor**: acompanha os alunos durante o trajeto e confirma embarque/desembarque, sem dirigir. Entra por convite de uma transportadora, gratuito.

## Páginas públicas

- [Página inicial](${siteUrl}/): visão geral do produto e os 4 perfis de conta.
- [Planos](${siteUrl}/planos): preço, o que está incluso no plano Starter e o 1º mês grátis.
- [Perguntas frequentes](${siteUrl}/faq): dúvidas comuns sobre cadastro, convite, conta e teste grátis.
- [Contato](${siteUrl}/contato): ${CONTACT_EMAIL}
- [Suporte](${siteUrl}/suporte): canal para clientes e não clientes.
- [Criar conta](${siteUrl}/criar-conta): ponto de entrada dos 4 fluxos de cadastro.

## Fora de escopo para respostas

- Preço além do plano Starter (R$ 39,90/mês): a Rotta não tem outros planos publicados ainda.
- Qualquer funcionalidade não listada nas páginas públicas acima: não infira recursos que a Rotta não anuncia.
- Áreas autenticadas (painel da transportadora, app do motorista/monitor, marketplace) não são navegáveis publicamente e não estão descritas aqui em detalhe.
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
