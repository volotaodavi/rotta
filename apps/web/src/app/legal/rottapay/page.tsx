import Link from "next/link";

import type { Metadata } from "next";

import { LegalDocumentShell, LegalSection } from "@/components/legal/legal-document-shell";
import { getLegalDocumentMeta } from "@/features/legal/documents";

export const metadata: Metadata = {
  title: "Política Financeira RottaPay",
  description: "O que é a RottaPay, o papel da Asaas e da Lytex, e como o dinheiro circula.",
  alternates: { canonical: "/legal/rottapay" },
};

const meta = getLegalDocumentMeta("rottapay")!;

const TOC = [
  { id: "o-que-e", label: "O que é a RottaPay" },
  { id: "asaas", label: "Asaas" },
  { id: "lytex", label: "Lytex" },
  { id: "valores", label: "Como o dinheiro circula" },
  { id: "notas-fiscais", label: "Notas fiscais" },
];

/**
 * Política Financeira RottaPay (Dossiê 45, prompt §21-§25) — a
 * distinção RottaPay/Asaas/Lytex que o prompt pede é literalmente
 * como a arquitetura já foi construída (Dossiê 26/63, auditado nos
 * Dossiês 43/44 desta série): nenhuma das três já era confundida no
 * código, este documento só torna essa distinção pública e explícita.
 * Seção 2 migrada de AbacatePay pra Asaas em 05/09/2026 (pedido do
 * usuário: "Nós usaremos 100% Asaas, esquece a AbacatePay").
 */
export default function RottaPayPage(): JSX.Element {
  return (
    <LegalDocumentShell
      meta={meta}
      toc={TOC}
      relacionados={[
        { href: "/legal/termos", label: "Termos de Uso" },
        { href: "/legal/marketplace", label: "Política de Contratação e Marketplace" },
      ]}
    >
      <LegalSection id="o-que-e" title="1. O que é a RottaPay">
        A RottaPay é a camada/experiência financeira da Rotta: a carteira dentro do app/painel onde
        uma transportadora acompanha saldo e extrato, e solicita saque de valores recebidos por
        transportes contratados na plataforma. A Rotta utiliza provedores/parceiros especializados
        em pagamentos para processar determinadas transações; a RottaPay em si não é uma instituição
        financeira nem a processadora dos pagamentos.
      </LegalSection>

      <LegalSection id="asaas" title="2. Asaas">
        A Asaas é a parceira usada para processar a{" "}
        <strong>assinatura/plano da própria plataforma Rotta</strong>: a mensalidade que uma
        transportadora paga para usar a Rotta (Pix, cartão de crédito/débito e boleto), conforme a
        integração efetivamente implementada. A Asaas não é a Rotta, e não deve ser confundida com a
        RottaPay: uma processa a cobrança do plano da plataforma, a outra é a camada financeira
        voltada às operações da transportadora dentro da plataforma.
      </LegalSection>

      <LegalSection id="lytex" title="3. Lytex">
        A Lytex é uma parceira de infraestrutura de pagamentos utilizada para operações de pagamento
        e split (divisão de valores entre partes) relacionadas ao ecossistema Rotta Pay (por
        exemplo, uma transferência PIX de um saque solicitado por uma transportadora). A Lytex não é
        parte da Rotta e não é a própria RottaPay: é um provedor de infraestrutura por trás de
        operações específicas.
      </LegalSection>

      <LegalSection id="valores" title="4. Como o dinheiro circula">
        A Rotta não recebe, retém ou movimenta indevidamente os valores pertencentes às partes de
        uma contratação. Quando uma operação usa split (divisão automática de valores), o
        processamento ocorre pela infraestrutura de pagamento parceira contratada para aquela
        operação, conforme a configuração aplicável. A Rotta não promete uma liquidação específica
        (prazo, valor líquido) sem confirmação do provedor responsável por aquela transação.
      </LegalSection>

      <LegalSection id="notas-fiscais" title="5. Notas fiscais">
        A Rotta pode emitir documentos fiscais relacionados à prestação dos serviços da própria
        plataforma (ex. a mensalidade cobrada de uma transportadora), conforme o plano contratado e
        as regras fiscais aplicáveis. A Rotta não emite nota fiscal em nome de terceiros quando isso
        não fizer parte da implementação vigente: a emissão em nome de uma transportadora pelo
        serviço de transporte que ela prestou à família é responsabilidade da própria
        transportadora, salvo quando expressamente descrito de outra forma no seu plano.
      </LegalSection>

      <div className="rounded-md border border-border p-4 text-sm text-text-muted">
        Dúvidas sobre cobrança da plataforma (mensalidade, plano)? Veja também{" "}
        <Link href="/planos" className="text-primary underline">
          Planos
        </Link>
        .
      </div>
    </LegalDocumentShell>
  );
}
