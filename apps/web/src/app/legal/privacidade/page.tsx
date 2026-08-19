import Link from "next/link";

import type { Metadata } from "next";

import { LegalDocumentShell, LegalSection } from "@/components/legal/legal-document-shell";
import { getLegalDocumentMeta } from "@/features/legal/documents";
import { CONTACT_EMAIL } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Como a Rotta trata dados pessoais, conforme a LGPD.",
  alternates: { canonical: "/legal/privacidade" },
};

const meta = getLegalDocumentMeta("privacidade")!;

const TOC = [
  { id: "quem-trata", label: "Quem trata seus dados" },
  { id: "dados-coletados", label: "Quais dados coletamos" },
  { id: "finalidade", label: "Por que coletamos" },
  { id: "compartilhamento", label: "Com quem compartilhamos" },
  { id: "seguranca", label: "Como protegemos seus dados" },
  { id: "direitos", label: "Seus direitos (LGPD)" },
  { id: "retencao", label: "Por quanto tempo guardamos seus dados" },
  { id: "criancas", label: "Crianças e adolescentes" },
  { id: "localizacao", label: "Geolocalização (GPS)" },
  { id: "financeiro", label: "Dados financeiros" },
  { id: "cookies", label: "Cookies e tecnologias de rastreamento" },
  { id: "terceiros", label: "Integrações de terceiros" },
  { id: "alteracoes", label: "Alterações desta política" },
  { id: "contato", label: "Contato" },
];

/**
 * Política de Privacidade (Dossiê 35 — Prompt 25; migrada para a
 * Documentação Rotta no Dossiê 45 com as seções que o prompt "ROTTA
 * LEGAL, TRUST & COMMUNITY CENTER" pede e ainda faltavam: geolocalização
 * detalhada, dados financeiros, cookies, integrações de terceiros — o
 * conteúdo pré-existente (auditado, Dossiê 32/33) foi preservado, só
 * estendido).
 */
export default function PrivacidadePage(): JSX.Element {
  return (
    <LegalDocumentShell
      meta={meta}
      toc={TOC}
      relacionados={[
        { href: "/legal/seguranca", label: "Segurança na Rotta" },
        { href: "/legal/cookies", label: "Política de Cookies" },
        { href: "/legal/termos", label: "Termos de Uso" },
      ]}
    >
      <LegalSection id="quem-trata" title="1. Quem trata seus dados">
        A Rotta do Brasil Tecnologia e Soluções de Transportes é a controladora dos dados pessoais
        tratados nesta plataforma (site, painel web, aplicativo, com a mesma conta em todos). Nosso
        Encarregado pelo Tratamento de Dados Pessoais (DPO), nos termos do art. 41 da LGPD, pode ser
        contatado pelo canal indicado na seção 14 desta página para qualquer assunto relacionado ao
        tratamento dos seus dados.
      </LegalSection>

      <LegalSection id="dados-coletados" title="2. Quais dados coletamos">
        Nome, e-mail, telefone, CPF e senha (armazenada apenas como hash, nunca em texto legível) de
        todo usuário. De transportadoras: CNPJ/CPF, endereço, dados de veículos e motoristas,
        documentos obrigatórios (CNH, comprovantes, EAR, curso de transporte escolar quando
        aplicável, ver{" "}
        <Link href="/legal/motoristas">Diretrizes para Motoristas e Modalidades de Transporte</Link>
        ). De alunos cadastrados por responsáveis: nome, data de nascimento, foto, endereço de
        embarque/desembarque e, quando informado, necessidades especiais/medicamentos. Durante uma
        viagem ativa, a localização do veículo é registrada para acompanhamento em tempo real pela
        família (detalhe na seção 9). Dados de pagamento/cobrança são descritos na seção 10.
      </LegalSection>

      <LegalSection id="finalidade" title="3. Por que coletamos">
        Para operar a intermediação entre famílias e transportadores, gerenciar a operação de
        transporte (rotas, veículos, motoristas), cumprir obrigações legais (ex. registro fiscal da
        mensalidade cobrada de transportadoras) e para segurança (documentos de motorista exigidos
        por regulamentação de transporte escolar).
      </LegalSection>

      <LegalSection id="compartilhamento" title="4. Com quem compartilhamos">
        Provedores de infraestrutura que processam dados em nosso nome (hospedagem, banco de dados,
        armazenamento de arquivo, envio de e-mail/notificação), mas nunca vendemos dado pessoal a
        terceiros. Documentos sensíveis (CNH, foto de aluno) ficam em um armazenamento privado,
        acessível só por link assinado e temporário, nunca por URL pública. Quando uma operação
        financeira envolve um parceiro de pagamento (AbacatePay, Lytex), o compartilhamento mínimo
        necessário para processar aquela operação é descrito na{" "}
        <Link href="/legal/rottapay">Política Financeira RottaPay</Link>.
      </LegalSection>

      <LegalSection id="seguranca" title="5. Como protegemos seus dados">
        Senha nunca é armazenada em texto puro (hash Argon2id). Sessões usam token assinado (JWT) de
        curta duração. Toda comunicação com a plataforma é criptografada (HTTPS). Documentos e fotos
        sensíveis (CNH, foto de aluno) ficam num armazenamento privado, nunca público. O detalhe
        completo das medidas de segurança (autenticação, MFA para administradores, auditoria) está
        em <Link href="/legal/seguranca">Segurança na Rotta</Link>.
      </LegalSection>

      <LegalSection id="direitos" title="6. Seus direitos (LGPD)">
        Você pode confirmar quais dados temos sobre você e solicitar uma cópia deles a qualquer
        momento (dentro do app/painel, em &ldquo;Meus dados&rdquo;). Para corrigir dado incorreto,
        solicitar a exclusão da sua conta, ou tirar qualquer outra dúvida sobre seus dados, fale com
        a gente pelo canal de suporte ou por <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        . Pedidos de exclusão são analisados individualmente: alguns dados podem precisar ser
        mantidos por período legal mesmo após o pedido (ex. registro fiscal de uma mensalidade já
        paga), e isso será sempre explicado no retorno ao pedido.
      </LegalSection>

      <LegalSection id="retencao" title="7. Por quanto tempo guardamos seus dados">
        Enquanto sua conta estiver ativa, e por um período adicional depois de encerrada quando
        exigido por lei (ex. obrigação fiscal) ou para nosso legítimo interesse de segurança
        (registro de auditoria).
      </LegalSection>

      <LegalSection id="criancas" title="8. Crianças e adolescentes">
        Dados de alunos menores de idade são cadastrados e geridos por seus responsáveis legais. A
        Rotta não permite que uma criança/adolescente crie a própria conta, e não expõe publicamente
        nenhuma informação de aluno. Tratamos esse dado com princípios de necessidade, minimização,
        controle de acesso e finalidade: só quem tem vínculo com aquele aluno (o responsável e a
        transportadora contratada, dentro da operação daquela rota) acessa o dado, e só para
        permitir a prestação do serviço contratado, o mesmo cuidado extra que a LGPD exige (art.
        14).
      </LegalSection>

      <LegalSection id="localizacao" title="9. Geolocalização (GPS)">
        O GPS do veículo é usado exclusivamente durante uma viagem ativa, para permitir que os
        responsáveis vinculados àquela rota acompanhem o trajeto em tempo real e recebam avisos de
        aproximação/embarque/desembarque. A localização do motorista/veículo{" "}
        <strong>não fica publicamente disponível</strong>: ela é disponibilizada somente aos
        usuários autorizados e relacionados àquela operação (responsáveis com aluno na rota, a
        própria transportadora, e o motorista/monitor da viagem). Fora de uma viagem ativa, a
        localização não é compartilhada com terceiros.
      </LegalSection>

      <LegalSection id="financeiro" title="10. Dados financeiros">
        Dados de cobrança/pagamento (ex. dados de cartão ou chave PIX) são processados diretamente
        pelos parceiros de pagamento da Rotta (AbacatePay para a assinatura da plataforma, Lytex
        para transferências/split das operações aplicáveis). A Rotta não armazena número completo de
        cartão. O papel de cada parceiro está detalhado na{" "}
        <Link href="/legal/rottapay">Política Financeira RottaPay</Link>.
      </LegalSection>

      <LegalSection id="cookies" title="11. Cookies e tecnologias de rastreamento">
        A sessão da Rotta hoje é mantida sem cookies (token de acesso em memória do navegador +
        token de atualização local, nunca cookie), ver detalhe completo na{" "}
        <Link href="/legal/cookies">Política de Cookies</Link>, incluindo o que fazemos (e não
        fazemos) quanto a rastreamento e analytics.
      </LegalSection>

      <LegalSection id="terceiros" title="12. Integrações de terceiros">
        Além dos provedores de infraestrutura (seção 4) e de pagamento (seção 10), a Rotta pode usar
        serviços de terceiros para funções específicas: geocodificação de endereço/rota
        (OpenStreetMap Nominatim/OSRM), envio de e-mail e notificação push. Cada integração recebe
        só o dado mínimo necessário para a função que executa.
      </LegalSection>

      <LegalSection id="alteracoes" title="13. Alterações desta política">
        Podemos atualizar esta política para refletir mudanças na plataforma ou na legislação.
        Mudanças relevantes serão comunicadas com antecedência pelos canais de contato cadastrados.
      </LegalSection>

      <LegalSection id="contato" title="14. Contato">
        Dúvidas sobre privacidade e dados pessoais, incluindo o contato com o Encarregado pelo
        Tratamento de Dados Pessoais (DPO): <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </LegalSection>
    </LegalDocumentShell>
  );
}
