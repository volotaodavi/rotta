import Link from "next/link";

import type { Metadata } from "next";

import { LegalDocumentShell, LegalSection } from "@/components/legal/legal-document-shell";
import { getLegalDocumentMeta } from "@/features/legal/documents";
import { SECURITY_CONTACT_EMAIL, SECURITY_CONTACT_SUBJECT_HINT } from "@/lib/site-config";


export const metadata: Metadata = {
  title: "Segurança na Rotta",
  description: "Como a Rotta protege contas, documentos, localização e dados financeiros.",
  alternates: { canonical: "/legal/seguranca" },
};

const meta = getLegalDocumentMeta("seguranca")!;

const TOC = [
  { id: "contas", label: "Proteção de contas e autenticação" },
  { id: "controle-acesso", label: "Controle de acesso" },
  { id: "criptografia", label: "Criptografia" },
  { id: "monitoramento", label: "Monitoramento e auditoria" },
  { id: "documentos", label: "Proteção de documentos" },
  { id: "localizacao", label: "Proteção de localização" },
  { id: "financeiro", label: "Proteção financeira" },
  { id: "incidentes", label: "Resposta a incidentes" },
  { id: "vulnerabilidade", label: "Encontrou uma vulnerabilidade?" },
];

/**
 * "Segurança na Rotta" (Dossiê 45, prompt §12/§13) — descreve medidas
 * REAIS já implementadas nesta base de código (Dossiê 12/33/43/44),
 * sem revelar detalhe que facilite ataque (nenhum endpoint interno,
 * chave ou arquitetura sensível — só o suficiente para transmitir
 * confiança de forma verdadeira).
 */
export default function SegurancaPage(): JSX.Element {
  return (
    <LegalDocumentShell
      meta={meta}
      toc={TOC}
      relacionados={[
        { href: "/legal/privacidade", label: "Política de Privacidade / LGPD" },
        { href: "/legal/comunidade", label: "Política da Comunidade Rotta" },
      ]}
    >
      <LegalSection id="contas" title="1. Proteção de contas e autenticação">
        Senhas nunca são armazenadas em texto legível — usamos um algoritmo de hash moderno e
        resistente a força bruta (Argon2id). Contas com muitas tentativas de senha incorreta
        seguidas são temporariamente bloqueadas. Sessões usam tokens de curta duração, renovados
        automaticamente enquanto você está ativo — sem exigir login constante, mas sem manter uma
        sessão válida indefinidamente. Administradores da Rotta (equipe interna, acesso entre
        empresas) são obrigados a usar autenticação em duas etapas (MFA/TOTP) — não há exceção para
        nenhum papel administrativo.
      </LegalSection>

      <LegalSection id="controle-acesso" title="2. Controle de acesso">
        Cada conta só enxerga o que sua função e seus vínculos permitem: uma transportadora não
        acessa dado de outra; um responsável só vê os alunos vinculados a ele; um motorista só vê as
        rotas/viagens atribuídas a ele. Essa separação é aplicada no backend, não só escondida na
        tela — nenhuma tela &ldquo;some&rdquo; um botão como única barreira de segurança.
      </LegalSection>

      <LegalSection id="criptografia" title="3. Criptografia">
        Toda comunicação com a plataforma é criptografada em trânsito (HTTPS). Segredos sensíveis
        que precisam ser recuperados pelo sistema (ex. a chave de autenticação em duas etapas de um
        administrador) são armazenados de forma cifrada, nunca em texto puro; o que não precisa ser
        recuperado (ex. sua senha) é armazenado como hash, uma via de mão única.
      </LegalSection>

      <LegalSection id="monitoramento" title="4. Monitoramento e auditoria">
        Ações administrativas relevantes (ex. um funcionário da Rotta acessando dados de uma empresa
        para dar suporte) ficam registradas em um log de auditoria — quem fez, o quê, quando. Falhas
        reais de integrações externas (pagamento, geolocalização) são monitoradas com um histórico
        de saúde real, não decorativo, para que a equipe da Rotta saiba quando algo parou de
        funcionar na prática.
      </LegalSection>

      <LegalSection id="documentos" title="5. Proteção de documentos">
        Documentos enviados à plataforma (CNH, comprovantes, foto de aluno) ficam em um
        armazenamento privado — nunca em uma URL pública e permanente. O acesso a um documento
        específico usa um link temporário e assinado, válido só por um curto período e só para quem
        tem permissão de visualizá-lo.
      </LegalSection>

      <LegalSection id="localizacao" title="6. Proteção de localização">
        A localização do veículo durante uma viagem ativa é disponibilizada somente aos usuários
        autorizados e relacionados àquela operação (ver{" "}
        <Link href="/legal/privacidade#localizacao">Política de Privacidade, geolocalização</Link>)
        — nunca fica publicamente disponível.
      </LegalSection>

      <LegalSection id="financeiro" title="7. Proteção financeira">
        Dados de pagamento sensíveis (ex. número completo de cartão) não passam pelos nossos
        próprios servidores — são processados diretamente pelos parceiros de pagamento (ver{" "}
        <Link href="/legal/rottapay">Política Financeira RottaPay</Link>). A Rotta não recebe, retém
        ou movimenta indevidamente valores pertencentes às partes de uma contratação.
      </LegalSection>

      <LegalSection id="incidentes" title="8. Resposta a incidentes">
        Quando um erro inesperado acontece na plataforma, ele é registrado e correlacionado (cada
        requisição carrega um identificador de correlação, propagado nos logs) para que a causa
        possa ser investigada rapidamente. Incidentes que envolvam dado pessoal são tratados
        conforme a legislação aplicável, incluindo a comunicação exigida por lei quando necessária.
      </LegalSection>

      <LegalSection id="vulnerabilidade" title="9. Encontrou uma vulnerabilidade?">
        Se você é pesquisador de segurança ou simplesmente notou algo que parece uma falha de
        segurança na Rotta, queremos saber. Escreva para{" "}
        <a
          href={`mailto:${SECURITY_CONTACT_EMAIL}?subject=${encodeURIComponent(SECURITY_CONTACT_SUBJECT_HINT + " ")}`}
        >
          {SECURITY_CONTACT_EMAIL}
        </a>{" "}
        com o assunto começando por <strong>{SECURITY_CONTACT_SUBJECT_HINT}</strong> para triagem
        prioritária, descrevendo o que encontrou e, se possível, como reproduzir. Pedimos que você
        não explore a falha além do necessário para demonstrá-la, e não divulgue publicamente antes
        de nos dar tempo razoável para corrigir.
      </LegalSection>
    </LegalDocumentShell>
  );
}
