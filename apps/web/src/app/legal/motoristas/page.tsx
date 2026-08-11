import Link from "next/link";

import type { Metadata } from "next";

import { LegalDocumentShell, LegalSection } from "@/components/legal/legal-document-shell";
import { getLegalDocumentMeta } from "@/features/legal/documents";


export const metadata: Metadata = {
  title: "Diretrizes para Motoristas e Modalidades de Transporte",
  description:
    "Categoria da CNH, EAR, cursos e a diferença entre transporte escolar e executivo infantil na Rotta.",
  alternates: { canonical: "/legal/motoristas" },
};

const meta = getLegalDocumentMeta("motoristas")!;

const TOC = [
  { id: "categoria-x-modalidade", label: "Categoria da CNH ≠ modalidade de transporte" },
  { id: "categoria-b", label: "Categoria B" },
  { id: "categoria-d-e", label: "Categorias D e E — transporte escolar" },
  { id: "ear-cursos", label: "EAR e cursos" },
  { id: "elegibilidade", label: "Como a elegibilidade é verificada" },
  { id: "marketplace", label: "Como isso aparece no Marketplace" },
  { id: "responsabilidade", label: "Responsabilidade" },
];

/**
 * Diretrizes para Motoristas e Modalidades de Transporte (Dossiê 45 —
 * peça central dos prompts "ROTTA LEGAL, TRUST & COMMUNITY CENTER" e
 * sua complementação: CATEGORIA B ≠ TRANSPORTE ESCOLAR).
 *
 * Honestidade deliberada (mesma disciplina de todo o resto desta
 * série): a auditoria que precedeu este documento (Dossiê 45) confirmou
 * que a Rotta AINDA NÃO TEM uma tela de busca/cards de motorista no
 * Marketplace web, nem um motor que computa automaticamente
 * "elegível para transporte escolar" a partir dos documentos enviados
 * — os TIPOS de documento já existem (CNH, EAR, curso de transporte
 * escolar, antecedentes criminais, cada um analisado separadamente),
 * mas a computação de um status único de elegibilidade é um item
 * pendente (ver Dossiê 45, seção "Deferido"). Este documento descreve a
 * REGRA que a Rotta se compromete a seguir quando essa camada existir —
 * não finge que ela já roda hoje.
 */
export default function MotoristasPage(): JSX.Element {
  return (
    <LegalDocumentShell
      meta={meta}
      toc={TOC}
      relacionados={[
        { href: "/legal/marketplace", label: "Política de Contratação e Marketplace" },
        { href: "/legal/termos", label: "Termos de Uso" },
      ]}
    >
      <LegalSection
        id="categoria-x-modalidade"
        title="1. Categoria da CNH ≠ modalidade de transporte"
      >
        A Rotta trata como <strong>duas informações separadas</strong>, nunca uma sinônimo da outra:
        a <strong>categoria da CNH</strong> do motorista (B, D, E — o que a lei de trânsito atribui)
        e a <strong>modalidade de transporte</strong> anunciada na plataforma (transporte escolar,
        executivo infantil, transporte particular). A categoria da CNH, isoladamente,{" "}
        <strong>nunca</strong> determina sozinha a modalidade exibida.
      </LegalSection>

      <LegalSection id="categoria-b" title="2. Categoria B">
        A{" "}
        <strong>
          categoria B não é apresentada pela Rotta como categoria oficial para transporte escolar
        </strong>
        . Na plataforma, um motorista com CNH categoria B está associado às modalidades:{" "}
        <strong>executivo</strong>, <strong>executivo infantil</strong> e{" "}
        <strong>transporte particular</strong>. A presença de um motorista categoria B na Rotta não
        significa que o serviço contratado com ele seja transporte escolar — mesmo que esse
        motorista possua EAR (Exercício de Atividade Remunerada) ou um curso relacionado a
        transporte escolar (seção 4).
      </LegalSection>

      <LegalSection id="categoria-d-e" title="3. Categorias D e E — transporte escolar">
        Para a modalidade de transporte escolar, a Rotta trabalha com motoristas nas{" "}
        <strong>categorias D e E</strong>, considerando também os requisitos legais aplicáveis (EAR,
        curso especializado exigido para transporte escolar, e demais exigências da legislação de
        trânsito e municipal/estadual aplicável). Importante: possuir apenas CNH categoria D, ou
        apenas categoria E, <strong>não torna automaticamente</strong> um motorista apto para
        transporte escolar — a elegibilidade depende dos requisitos adicionais descritos na seção 5.
      </LegalSection>

      <LegalSection id="ear-cursos" title="4. EAR e cursos">
        O EAR (Exercício de Atividade Remunerada) e o curso especializado de transporte escolar são{" "}
        <strong>requisitos</strong>, verificados separadamente da categoria da CNH — nunca uma forma
        de alterar a categoria em si. Um motorista categoria B que obtenha EAR, ou EAR + o curso de
        transporte escolar, continua sendo um motorista categoria B: isso não faz a Rotta
        classificá-lo como &ldquo;transporte escolar&rdquo;. A obtenção de EAR isoladamente também
        não torna, por si só, um motorista categoria D ou E &ldquo;automaticamente apto&rdquo; —
        cada requisito é avaliado pelo que ele é.
      </LegalSection>

      <LegalSection id="elegibilidade" title="5. Como a elegibilidade é verificada">
        A Rotta coleta e analisa, separadamente, os documentos relevantes para transporte escolar:
        CNH (com a categoria informada), EAR, curso de transporte escolar e antecedentes criminais,
        entre outros exigidos pela legislação aplicável. Um motorista só é apresentado como elegível
        para a modalidade de transporte escolar quando{" "}
        <strong>
          todos os requisitos aplicáveis configurados na plataforma estiverem verificados
        </strong>{" "}
        — nunca com base em um único documento isolado. Enquanto a verificação de um requisito
        estiver pendente, incompleta ou vencida, o motorista não é apresentado nessa modalidade.
      </LegalSection>

      <LegalSection id="marketplace" title="6. Como isso aparece no Marketplace">
        No perfil de um motorista/serviço no Marketplace, a Rotta mostra a categoria da CNH
        separadamente das modalidades disponíveis — nunca rotulando &ldquo;Transporte Escolar&rdquo;
        com base só na categoria B. Os filtros de busca do Marketplace são organizados por
        modalidade (transporte escolar, executivo infantil, transporte particular), não apenas por
        categoria de habilitação. Antes de confirmar uma contratação com um motorista categoria B, a
        Rotta deixa explícito que a modalidade contratada não é apresentada como transporte escolar
        — ver <Link href="/legal/marketplace">Política de Contratação e Marketplace</Link>.
      </LegalSection>

      <LegalSection id="responsabilidade" title="7. Responsabilidade">
        A Rotta fornece a tecnologia de verificação e apresentação dessas informações; a contratação
        em si é realizada diretamente entre a família e a transportadora/motorista. A
        responsabilidade pela adequação da modalidade contratada à legislação aplicável ao caso
        concreto deve ser observada pelas partes. A Rotta não promete uma autorização legal que não
        possa garantir — &ldquo;requisitos verificados&rdquo; significa que os documentos e
        critérios configurados na plataforma foram conferidos, não uma certificação jurídica de
        regularidade do prestador perante todos os órgãos competentes.
      </LegalSection>
    </LegalDocumentShell>
  );
}
