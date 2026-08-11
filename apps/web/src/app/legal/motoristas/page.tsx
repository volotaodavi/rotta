import Link from "next/link";

import type { Metadata } from "next";

import { LegalDocumentShell, LegalSection } from "@/components/legal/legal-document-shell";
import { getLegalDocumentMeta } from "@/features/legal/documents";

export const metadata: Metadata = {
  title: "Diretrizes para Motoristas e Modalidades de Transporte",
  description:
    "Categoria da CNH, EAR, cursos e a diferença entre transporte escolar, fretamento e transporte particular na Rotta.",
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
 * Atualizado (achados C1/C2 da auditoria de consistência Legal↔Produto,
 * mesmo Dossiê 45): quando este documento foi escrito, o motor de
 * elegibilidade descrito na seção 5 ainda não existia e o texto usava
 * "executivo"/"executivo infantil" como nomes de modalidade — nenhum
 * dos dois nunca existiu no schema (`Vehicle.categoria` sempre foi
 * `ESCOLAR | FRETAMENTO | PARTICULAR | OUTRO`). As duas lacunas foram
 * fechadas: `computeSchoolTransportEligibility` (motor de elegibilidade
 * real) agora roda de fato antes do Marketplace exibir qualquer selo de
 * transporte escolar como "verificado" (`escolarVerificado`, distinto
 * de `categoriasVeiculo` — a frota que a empresa apenas declarou), e o
 * texto abaixo usa só os nomes de modalidade que realmente existem no
 * produto.
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
        fretamento, transporte particular). A categoria da CNH, isoladamente, <strong>nunca</strong>{" "}
        determina sozinha a modalidade exibida.
      </LegalSection>

      <LegalSection id="categoria-b" title="2. Categoria B">
        A{" "}
        <strong>
          categoria B não é apresentada pela Rotta como categoria oficial para transporte escolar
        </strong>
        . Na plataforma, um veículo cujo motorista vinculado tem CNH categoria B só pode estar
        declarado nas modalidades <strong>fretamento</strong> ou{" "}
        <strong>transporte particular</strong> — nunca na modalidade transporte escolar. A presença
        de um motorista categoria B na Rotta não significa que o serviço contratado com ele seja
        transporte escolar — mesmo que esse motorista possua EAR (Exercício de Atividade Remunerada)
        ou um curso relacionado a transporte escolar (seção 4).
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
        entre outros exigidos pela legislação aplicável. Um motorista só conta como elegível para a
        modalidade de transporte escolar quando{" "}
        <strong>
          todos os requisitos aplicáveis configurados na plataforma estiverem verificados
        </strong>{" "}
        — nunca com base em um único documento isolado, e nunca só pela categoria do veículo que a
        empresa declarou. Enquanto a verificação de um requisito estiver pendente, incompleta ou
        vencida, o motorista não conta como elegível nessa modalidade.
      </LegalSection>

      <LegalSection id="marketplace" title="6. Como isso aparece no Marketplace">
        No perfil de uma transportadora no Marketplace, a Rotta mostra dois selos distintos para a
        modalidade escolar — nunca um só, e nunca tratados como sinônimos: a{" "}
        <strong>frota declarada</strong> (a empresa marcou pelo menos um veículo como categoria
        &ldquo;transporte escolar&rdquo; no cadastro) e o selo{" "}
        <strong>&ldquo;verificado&rdquo;</strong>, que só aparece quando pelo menos um motorista
        vinculado a um desses veículos passou pela checagem completa da seção 5. Uma transportadora
        pode aparecer com a frota declarada como escolar e, ainda assim, sem o selo verificado — a
        Rotta nunca rotula &ldquo;Transporte Escolar (verificado)&rdquo; com base só na categoria do
        veículo ou na categoria B da CNH. Os filtros de busca do Marketplace são organizados por
        modalidade (transporte escolar, fretamento, transporte particular), não apenas por categoria
        de habilitação. Antes de confirmar uma contratação com um motorista categoria B, a Rotta
        deixa explícito que a modalidade contratada não é apresentada como transporte escolar — ver{" "}
        <Link href="/legal/marketplace">Política de Contratação e Marketplace</Link>.
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
