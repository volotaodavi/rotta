import Link from "next/link";

import type { Metadata } from "next";

import { LegalDocumentShell, LegalSection } from "@/components/legal/legal-document-shell";
import { getLegalDocumentMeta } from "@/features/legal/documents";

export const metadata: Metadata = {
  title: "Política de Contratação e Marketplace",
  description: "Quem contrata, quem presta, quem paga, e qual é o papel da Rotta.",
  alternates: { canonical: "/legal/marketplace" },
};

const meta = getLegalDocumentMeta("marketplace")!;

const TOC = [
  { id: "o-que-e", label: "O que é o Marketplace da Rotta" },
  { id: "partes", label: "Quem contrata, quem presta, quem paga" },
  { id: "verificacoes", label: "Quais verificações a Rotta realiza" },
  { id: "responsabilidades", label: "O que permanece com as partes" },
  { id: "contratos", label: "Contratos na Rotta" },
  { id: "ia-juridica", label: "Uso de IA na análise de contratos" },
];

/**
 * Política de Contratação e Marketplace (Dossiê 45, prompt §11/§25/§26).
 */
export default function MarketplacePage(): JSX.Element {
  return (
    <LegalDocumentShell
      meta={meta}
      toc={TOC}
      relacionados={[
        { href: "/legal/motoristas", label: "Diretrizes para Motoristas e Modalidades" },
        { href: "/legal/termos", label: "Termos de Uso" },
        { href: "/legal/rottapay", label: "Política Financeira RottaPay" },
      ]}
    >
      <LegalSection id="o-que-e" title="1. O que é o Marketplace da Rotta">
        O Marketplace da Rotta <strong>não é</strong> um marketplace genérico de produtos: é uma{" "}
        <strong>infraestrutura de descoberta e contratação de serviços de transporte</strong>. Ele
        conecta famílias que buscam transporte a transportadoras (empresas, MEIs, motoristas
        autônomos) que oferecem esse serviço.
      </LegalSection>

      <LegalSection id="partes" title="2. Quem contrata, quem presta, quem paga">
        A contratação do serviço de transporte acontece diretamente{" "}
        <strong>entre a família (responsável) e a transportadora escolhida</strong>. A Rotta fornece
        a infraestrutura tecnológica (busca, comunicação, geração de contrato, cobrança recorrente
        quando configurada), mas não é ela própria a transportadora nem parte do contrato de
        transporte. O pagamento do serviço de transporte é acordado entre as partes e processado
        conforme a <Link href="/legal/rottapay">Política Financeira RottaPay</Link>.
      </LegalSection>

      <LegalSection id="verificacoes" title="3. Quais verificações a Rotta realiza">
        A Rotta verifica: identidade básica de cadastro; documentação do motorista e do veículo
        enviada à plataforma (CNH e categoria, EAR e curso quando aplicável, ver{" "}
        <Link href="/legal/motoristas">Diretrizes para Motoristas e Modalidades de Transporte</Link>
        ); e, quando configurado, um selo de &ldquo;Verificado&rdquo; indicando que essa
        documentação foi analisada. Essas verificações são descritas de forma verdadeira: elas
        conferem os documentos e critérios configurados na plataforma, não substituem uma
        fiscalização por órgão público competente.
      </LegalSection>

      <LegalSection id="responsabilidades" title="4. O que permanece com as partes">
        A existência de um prestador na plataforma não significa, isoladamente, garantia de
        qualidade, segurança, regularidade ou cumprimento de todas as obrigações legais aplicáveis à
        atividade de transporte. A execução do transporte em si (condução do veículo, pontualidade,
        segurança durante o trajeto) é responsabilidade da transportadora contratada, não da Rotta.
        Ver <Link href="/legal/termos#o-que-e">Termos de Uso, seção 3</Link>.
      </LegalSection>

      <LegalSection id="contratos" title="5. Contratos na Rotta">
        Quando a contratação envolve um contrato gerado pela plataforma, ele passa por geração (a
        partir dos dados da contratação) e apresentação às partes, que confirmam o aceite por uma
        assinatura eletrônica simples feita dentro do próprio painel/app: cada parte (família e
        transportadora) confirma individualmente, e o contrato só é ativado depois que as duas
        confirmações existirem. O contrato assinado fica armazenado e disponível para download pelas
        partes envolvidas.
        <br />
        <br />A Rotta está preparada para, no futuro, integrar essa assinatura a um provedor
        especializado externo (adicionando uma camada extra de validade jurídica/cadeia de custódia
        ao processo), mas essa integração específica <strong>ainda não está ativa hoje</strong>:
        nenhum contrato depende dela para ser válido na plataforma. As responsabilidades sobre o
        conteúdo do contrato (cláusulas de prestação de serviço, valores, condições) são das partes
        que o firmam.
      </LegalSection>

      <LegalSection id="ia-juridica" title="6. Uso de IA na análise de contratos">
        Quando a Rotta utiliza inteligência artificial para auxiliar na elaboração ou análise de um
        contrato, essa IA <strong>não substitui um advogado</strong>. Ela pode auxiliar na
        estruturação, organização, identificação de inconsistências, comparação entre versões e
        geração assistida de texto: a revisão jurídica humana deve ser usada quando necessária, e a
        Rotta não afirma que a IA &ldquo;certifica&rdquo; juridicamente um contrato.
      </LegalSection>
    </LegalDocumentShell>
  );
}
