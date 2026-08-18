import Link from "next/link";

import type { Metadata } from "next";

import { LegalDocumentShell, LegalSection } from "@/components/legal/legal-document-shell";
import { getLegalDocumentMeta } from "@/features/legal/documents";
import { COMPANY_CNPJ, COMPANY_FORUM, COMPANY_LEGAL_NAME, CONTACT_EMAIL } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Termos de Uso da plataforma Rotta.",
  alternates: { canonical: "/legal/termos" },
};

const meta = getLegalDocumentMeta("termos")!;

const TOC = [
  { id: "quem-somos", label: "Quem somos" },
  { id: "quem-pode-usar", label: "Quem pode usar a Rotta" },
  { id: "o-que-e", label: "O que a Rotta é e o que ela não é" },
  { id: "cadastro", label: "Cadastro e conta" },
  { id: "conduta", label: "Conduta do usuário" },
  { id: "marketplace-contratacao", label: "Marketplace e contratação" },
  { id: "gps", label: "GPS e localização" },
  { id: "documentos", label: "Documentos" },
  { id: "comunicacao", label: "Comunicação" },
  { id: "cobranca", label: "Cobrança" },
  { id: "propriedade-intelectual", label: "Propriedade intelectual" },
  { id: "dados-pessoais", label: "Dados pessoais" },
  { id: "responsabilidade", label: "Limitação de responsabilidade e encerramento" },
  { id: "alteracoes", label: "Alterações destes Termos" },
  { id: "lei-aplicavel", label: "Legislação aplicável e foro" },
  { id: "contato", label: "Contato" },
];

/**
 * Termos de Uso (Dossiê 35 — Prompt 25; migrado para a Documentação
 * Rotta no Dossiê 45, mesmo conteúdo real já auditado + seções que
 * faltavam para o escopo pedido pelo prompt "ROTTA LEGAL, TRUST &
 * COMMUNITY CENTER": Marketplace/contratação, GPS, documentos,
 * comunicação — nenhuma reescrita do que já existia, só extensão).
 */
export default function TermosPage(): JSX.Element {
  return (
    <LegalDocumentShell
      meta={meta}
      toc={TOC}
      relacionados={[
        { href: "/legal/privacidade", label: "Política de Privacidade / LGPD" },
        { href: "/legal/marketplace", label: "Política de Contratação e Marketplace" },
        { href: "/legal/motoristas", label: "Diretrizes para Motoristas e Modalidades" },
      ]}
    >
      <LegalSection id="quem-somos" title="1. Quem somos">
        A Rotta é operada pela <strong>{COMPANY_LEGAL_NAME}</strong>, inscrita no CNPJ sob o nº{" "}
        <strong>{COMPANY_CNPJ}</strong>, doravante identificada apenas como &ldquo;Rotta&rdquo;. A
        Rotta é uma plataforma tecnológica destinada ao ecossistema de transporte escolar e
        transporte infantil/executivo — ela conecta famílias a transportadores escolares (empresas,
        MEIs e motoristas autônomos) e fornece a essas transportadoras as ferramentas de gestão da
        própria operação (veículos, motoristas, rotas, alunos, cobrança).
      </LegalSection>

      <LegalSection id="quem-pode-usar" title="2. Quem pode usar a Rotta">
        A Rotta tem duas frentes de uso, sob a mesma conta: a <strong>Área Profissional</strong>{" "}
        (transportadoras — empresas, MEIs, autônomos, motoristas e monitores — que gerenciam sua
        operação de transporte escolar) e a <strong>Área Pessoal</strong> (responsáveis que buscam e
        contratam transporte para seus filhos). O cadastro como transportadora exige que a pessoa
        tenha capacidade legal para representar a empresa ou atuar como autônomo/MEI. O uso da
        plataforma é restrito a maiores de 18 anos ou emancipados; alunos são cadastrados e geridos
        pelo próprio responsável (ver{" "}
        <Link href="/legal/privacidade#criancas">Política de Privacidade, seção 8</Link>).
      </LegalSection>

      <LegalSection id="o-que-e" title="3. O que a Rotta é e o que ela não é">
        A Rotta é uma plataforma de intermediação e gestão — ela conecta famílias a transportadores
        e fornece as ferramentas operacionais, mas <strong>não é</strong> ela própria a
        transportadora. O contrato de prestação de serviço de transporte é firmado diretamente entre
        a família e a transportadora escolhida; a Rotta não é parte desse contrato nem responsável
        pela execução do transporte em si (condução do veículo, pontualidade, segurança durante o
        trajeto) — essa responsabilidade é da transportadora contratada. A existência de um usuário
        ou prestador na plataforma não significa, isoladamente, garantia de qualidade, segurança,
        regularidade ou cumprimento de todas as obrigações legais aplicáveis — ver{" "}
        <Link href="/legal/marketplace">Política de Contratação e Marketplace</Link> para o detalhe
        de quais verificações a Rotta realiza.
      </LegalSection>

      <LegalSection id="cadastro" title="4. Cadastro e conta">
        Cada pessoa mantém uma única conta na Rotta, usada em todas as plataformas (site, painel
        web, aplicativo). As informações fornecidas no cadastro devem ser verdadeiras e mantidas
        atualizadas. A conta é pessoal e intransferível; o compartilhamento de senha com terceiros é
        de responsabilidade de quem compartilha. Medidas de proteção de conta (senha, autenticação)
        estão descritas na <Link href="/legal/seguranca">Segurança na Rotta</Link>.
      </LegalSection>

      <LegalSection id="conduta" title="5. Conduta do usuário">
        Ao usar a Rotta, você concorda em: fornecer informações verdadeiras (inclusive documentos de
        veículo/motorista, quando aplicável); não usar a plataforma para fins ilícitos ou
        fraudulentos; não tentar acessar dados de outros usuários além do que a própria plataforma
        expõe a você; não contornar mecanismos de segurança; e manter um comportamento respeitoso em
        avaliações e contatos com outros usuários. As regras completas de conduta e as consequências
        de violação estão na <Link href="/legal/comunidade">Política da Comunidade Rotta</Link>.
      </LegalSection>

      <LegalSection id="marketplace-contratacao" title="6. Marketplace e contratação">
        O Marketplace da Rotta é uma infraestrutura de descoberta e contratação de serviços de
        transporte — não um marketplace genérico de produtos. A contratação (quem contrata, quem
        presta, quem paga, e as responsabilidades de cada parte) é detalhada na{" "}
        <Link href="/legal/marketplace">Política de Contratação e Marketplace</Link>. Quando a
        contratação envolver um motorista/veículo, as categorias de habilitação e as modalidades de
        transporte disponíveis (escolar, fretamento, executivo) seguem as{" "}
        <Link href="/legal/motoristas">Diretrizes para Motoristas e Modalidades de Transporte</Link>{" "}
        — em especial, a categoria B da CNH não é apresentada pela Rotta como transporte escolar
        oficial.
      </LegalSection>

      <LegalSection id="gps" title="7. GPS e localização">
        Durante uma viagem ativa, a localização do veículo é compartilhada em tempo real com os
        responsáveis vinculados àquela rota, para acompanhamento do trajeto. A localização não é
        pública nem visível a usuários sem vínculo com a viagem — o detalhamento de quando o GPS é
        usado, quem pode visualizar e quando deixa de ser compartilhado está na{" "}
        <Link href="/legal/privacidade#localizacao">
          Política de Privacidade, seção de geolocalização
        </Link>
        .
      </LegalSection>

      <LegalSection id="documentos" title="8. Documentos">
        Motoristas e veículos têm documentos obrigatórios (CNH, comprovantes, documentos do veículo)
        enviados à plataforma para verificação — esses arquivos ficam em armazenamento privado,
        nunca em URL pública (ver <Link href="/legal/seguranca">Segurança na Rotta</Link>).
        Contratos gerados na plataforma (quando houver assinatura eletrônica) seguem o fluxo
        descrito em{" "}
        <Link href="/legal/marketplace#contratos">
          Política de Contratação e Marketplace, seção de contratos
        </Link>
        .
      </LegalSection>

      <LegalSection id="comunicacao" title="9. Comunicação">
        A Rotta envia comunicações operacionais (ex.: aviso de embarque, atraso, mudança de rota) e,
        quando você optar, comunicações não essenciais — a distinção entre os dois tipos e como
        ajustar suas preferências está na{" "}
        <Link href="/legal/comunicacoes">Política de Comunicações</Link>.
      </LegalSection>

      <LegalSection id="cobranca" title="10. Cobrança">
        Transportadoras (Empresa/MEI/Autônomo) pagam uma mensalidade pela plataforma. O uso pelo
        Responsável (família) é gratuito — a Rotta nunca cobra da família pelo acesso à plataforma;
        o pagamento do transporte em si (quando houver) é acordado diretamente com a transportadora,
        processado conforme a <Link href="/legal/rottapay">Política Financeira RottaPay</Link>.
      </LegalSection>

      <LegalSection id="propriedade-intelectual" title="11. Propriedade intelectual">
        A marca &ldquo;Rotta&rdquo;, o layout, o código-fonte e os demais elementos da plataforma
        são de propriedade da {COMPANY_LEGAL_NAME} ou licenciados a ela, protegidos pela legislação
        de propriedade intelectual aplicável. O uso da plataforma não transfere a você nenhum
        direito sobre esses elementos, além da licença de uso pessoal e não exclusiva necessária
        para usar o serviço. É proibido copiar, modificar, fazer engenharia reversa ou redistribuir
        qualquer parte da plataforma sem autorização.
      </LegalSection>

      <LegalSection id="dados-pessoais" title="12. Dados pessoais">
        O tratamento de dados pessoais é descrito em detalhe na nossa{" "}
        <Link href="/legal/privacidade">Política de Privacidade</Link>, parte integrante destes
        Termos.
      </LegalSection>

      <LegalSection
        id="responsabilidade"
        title="13. Limitação de responsabilidade e encerramento de conta"
      >
        A responsabilidade da Rotta se limita ao funcionamento e à disponibilidade da própria
        plataforma; ela não responde por indisponibilidades causadas por caso fortuito, força maior
        ou falha de provedores de infraestrutura fora do seu controle, nem pela execução do serviço
        de transporte contratado diretamente com a transportadora (seção 3). Nada nesta cláusula
        exclui responsabilidade que a lei não permite excluir (ex. Código de Defesa do Consumidor,
        LGPD).
        <br />
        <br />
        Você pode solicitar o encerramento da sua conta a qualquer momento pelo canal de suporte. A
        Rotta também pode suspender ou encerrar uma conta que viole estes Termos ou a{" "}
        <Link href="/legal/comunidade">Política da Comunidade</Link> — sempre que possível, com
        aviso prévio, exceto em casos de fraude, risco à segurança de outros usuários ou exigência
        legal, quando a suspensão pode ser imediata. Dados sujeitos a obrigação legal de retenção
        (ex. registros fiscais, logs de auditoria de segurança) podem ser mantidos mesmo após o
        encerramento, pelo prazo exigido por lei.
      </LegalSection>

      <LegalSection id="alteracoes" title="14. Alterações destes Termos">
        Podemos atualizar estes Termos para refletir mudanças na plataforma ou na legislação.
        Mudanças relevantes serão comunicadas com antecedência razoável pelos canais de contato
        cadastrados, e — quando a mudança for relevante o suficiente — um novo aceite poderá ser
        solicitado.
      </LegalSection>

      <LegalSection id="lei-aplicavel" title="15. Legislação aplicável e foro">
        Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da
        comarca de <strong>{COMPANY_FORUM}</strong> para dirimir quaisquer controvérsias decorrentes
        destes Termos, com renúncia a qualquer outro, por mais privilegiado que seja — ressalvada,
        quando o usuário for consumidor (Responsável), a prerrogativa de foro do seu próprio
        domicílio, prevista no Código de Defesa do Consumidor (art. 101, I).
      </LegalSection>

      <LegalSection id="contato" title="16. Contato">
        Dúvidas sobre estes Termos: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </LegalSection>
    </LegalDocumentShell>
  );
}
