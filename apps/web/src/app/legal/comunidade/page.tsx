import Link from "next/link";

import type { Metadata } from "next";

import { LegalDocumentShell, LegalSection } from "@/components/legal/legal-document-shell";
import { getLegalDocumentMeta } from "@/features/legal/documents";
import { CONTACT_EMAIL } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Política da Comunidade Rotta",
  description: "O que não é tolerado na plataforma e quais são as consequências.",
  alternates: { canonical: "/legal/comunidade" },
};

const meta = getLegalDocumentMeta("comunidade")!;

const TOC = [
  { id: "objetivo", label: "Objetivo" },
  { id: "proibicoes", label: "O que não é tolerado" },
  { id: "consequencias", label: "Consequências" },
  { id: "denuncia", label: "Como denunciar" },
];

/**
 * Política da Comunidade Rotta (Dossiê 45, prompt §14) — regras de
 * conduta e consequências, complementando os Termos de Uso (seção 5).
 */
export default function ComunidadePage(): JSX.Element {
  return (
    <LegalDocumentShell
      meta={meta}
      toc={TOC}
      relacionados={[
        { href: "/legal/termos", label: "Termos de Uso" },
        { href: "/legal/seguranca", label: "Segurança na Rotta" },
        { href: "/legal/marketplace", label: "Política de Contratação e Marketplace" },
      ]}
    >
      <LegalSection id="objetivo" title="1. Objetivo">
        Esta política existe para proteger usuários e manter um ambiente confiável na Rotta: para
        famílias que buscam transporte, para transportadoras que prestam o serviço, e para
        motoristas e monitores que trabalham por meio da plataforma.
      </LegalSection>

      <LegalSection id="proibicoes" title="2. O que não é tolerado">
        Na Rotta, é proibido: fraude; falsidade documental (documento falso ou adulterado enviado à
        plataforma); assédio; discriminação; ameaças; uso indevido da plataforma; tentativa de
        fraude financeira; compartilhamento indevido de dados de outro usuário; uso indevido de
        localização; uso da plataforma para atividades ilícitas; criação de contas falsas;
        manipulação de avaliações (avaliação falsa, coagida, ou em troca de vantagem); e tentativa
        de burlar os processos de verificação da plataforma (ex. tentar aparecer como elegível para
        uma modalidade de transporte sem atender aos requisitos, ver{" "}
        <Link href="/legal/motoristas">Diretrizes para Motoristas e Modalidades de Transporte</Link>
        ).
      </LegalSection>

      <LegalSection id="consequencias" title="3. Consequências">
        Dependendo da gravidade e da reincidência, uma violação pode resultar em: advertência;
        suspensão temporária da conta; bloqueio de funcionalidades específicas; encerramento da
        conta; e, quando houver obrigação legal, comunicação às autoridades competentes. Sempre que
        possível, a pessoa é avisada antes de uma ação restritiva, exceto em casos de fraude, risco
        à segurança de outros usuários, ou exigência legal, quando a ação pode ser imediata (mesma
        regra dos <Link href="/legal/termos#responsabilidade">Termos de Uso, seção 13</Link>).
      </LegalSection>

      <LegalSection id="denuncia" title="4. Como denunciar">
        Se você presenciar ou for alvo de uma violação desta política, avise a Rotta pelo canal de
        suporte (dentro do app/painel, se você já é cliente) ou por{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Denúncias são analisadas
        individualmente; quando envolverem uma falha de segurança da própria plataforma (não uma
        conduta de outro usuário), use o canal descrito em{" "}
        <a href="/legal/seguranca#vulnerabilidade">
          Segurança na Rotta, &ldquo;Encontrou uma vulnerabilidade?&rdquo;
        </a>
        .
      </LegalSection>
    </LegalDocumentShell>
  );
}
