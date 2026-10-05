import Link from "next/link";

import type { Metadata } from "next";

import { LegalDocumentShell, LegalSection } from "@/components/legal/legal-document-shell";
import { getLegalDocumentMeta } from "@/features/legal/documents";

export const metadata: Metadata = {
  title: "Política de Cookies",
  description:
    "Como a sessão é mantida na Rotta, qual medição existe no site e como aceitar ou recusar.",
  alternates: { canonical: "/legal/cookies" },
};

const meta = getLegalDocumentMeta("cookies")!;

const TOC = [
  { id: "medicao", label: "A medição que existe no site" },
  { id: "escolha", label: "Como aceitar ou recusar" },
  { id: "nao-enviamos", label: "O que nunca é enviado" },
  { id: "sessao", label: "Como sua sessão é mantida" },
  { id: "painel", label: "Dentro do painel e do aplicativo" },
];

/**
 * Política de Cookies — versão 2.0, 05/10/2026.
 *
 * A versão 1.0 dizia, em negrito, que a Rotta não usava pixel de
 * publicidade. Era verdade até 05/10/2026, quando o Pixel do Meta
 * entrou no site para medir quais anúncios trazem transportadora de
 * verdade. A própria versão 1.0 prometia que, se isso mudasse, a
 * página seria atualizada com a finalidade de cada cookie "nunca
 * adicionada silenciosamente" — este arquivo é essa promessa sendo
 * cumprida no mesmo commit que ligou o Pixel.
 *
 * Regra que não muda: nunca descrever aqui uma tecnologia que não está
 * no código, e nunca ligar no código uma tecnologia que não está aqui.
 * O par é `features/marketing/components/marketing-tracking.tsx` (quem
 * carrega) e `lib/cookie-consent.ts` (quem guarda a decisão).
 */
export default function CookiesPage(): JSX.Element {
  return (
    <LegalDocumentShell
      meta={meta}
      toc={TOC}
      relacionados={[{ href: "/legal/privacidade", label: "Política de Privacidade / LGPD" }]}
    >
      <LegalSection id="medicao" title="1. A medição que existe no site">
        Desde 05/10/2026, as páginas públicas da Rotta (o site e as telas de criar conta e entrar)
        usam o <strong>Pixel do Meta</strong> para medir quais anúncios trazem pessoas que realmente
        se tornam clientes. É o mesmo mecanismo usado por praticamente todo site que anuncia no
        Instagram e no Facebook, e ele cria cookies no seu navegador em nome da Meta Platforms.
        <br />
        <br />O que ele registra é o que aconteceu, não quem você é: uma página vista, um cadastro
        iniciado, um cadastro concluído, um checkout aberto e uma assinatura paga (com o valor do
        plano). Sem isso, a Rotta só saberia quantas pessoas clicaram no anúncio, nunca quantas
        ficaram, e pagaria por cliques em vez de pagar por clientes.
        <br />
        <br />
        Ferramentas de análise do Google (Google Analytics e Google Ads) estão previstas no mesmo
        lugar do código e seguem exatamente as mesmas regras desta página, mas{" "}
        <strong>ainda não estão ativas</strong>: nenhuma conta foi configurada até a data desta
        versão.
      </LegalSection>

      <LegalSection id="escolha" title="2. Como aceitar ou recusar">
        <strong>Nada é carregado antes de você decidir.</strong> Na primeira visita aparece um aviso
        com dois botões do mesmo tamanho e do mesmo peso, Aceitar e Recusar. Enquanto você não
        escolher, nenhum script de medição é baixado e nenhum cookie de terceiro é criado. Se você
        recusar, continua assim para sempre, e nada no site funciona pior por causa disso: medição é
        acessório, nunca requisito.
        <br />
        <br />
        Para mudar de ideia depois, apague os dados do site no seu navegador (em Chrome e Edge:
        Configurações, Privacidade e segurança, Dados de sites). O aviso aparece de novo na próxima
        visita e você escolhe outra vez. A decisão fica guardada no armazenamento local do seu
        próprio navegador, não num servidor da Rotta.
      </LegalSection>

      <LegalSection id="nao-enviamos" title="3. O que nunca é enviado">
        Nenhum dado pessoal atravessa para plataforma de anúncio. Especificamente, nunca são
        enviados:{" "}
        <strong>
          nome, e-mail, telefone, CPF, endereço, nome ou foto de aluno, escola, rota e posição de
          veículo
        </strong>
        . Isso não é preferência de produto, é o que a LGPD exige e o que a Política de Privacidade
        da Rotta já promete, com peso redobrado por se tratar de plataforma que lida com dado de
        criança. O único evento que carrega um número é a assinatura paga, e esse número é o preço
        do próprio plano, não informação sua.
      </LegalSection>

      <LegalSection id="sessao" title="4. Como sua sessão é mantida">
        A sessão da Rotta na web usa um token de acesso mantido em memória do navegador (perdido a
        cada recarregamento de página, por segurança) e um token de atualização guardado no
        armazenamento local do navegador (<code>localStorage</code>), não um cookie. Ou seja: a
        Rotta não usa cookie nenhum para manter você conectado, nem como função essencial. Os únicos
        cookies possíveis no site são os de medição descritos na seção 1, e só depois do seu
        Aceitar.
      </LegalSection>

      <LegalSection id="painel" title="5. Dentro do painel e do aplicativo">
        A medição existe <strong>somente nas áreas públicas</strong>. Depois que você entra, no
        painel onde se opera rota, aluno, documento e pagamento, não há pixel nenhum, nem com
        consentimento dado. O aplicativo de celular também não tem pixel de publicidade. A fronteira
        é essa, e ela é verificável: o componente que carrega a medição está montado nos layouts das
        áreas públicas e em nenhum outro lugar.
        <br />
        <br />
        Ver também{" "}
        <Link href="/legal/privacidade#cookies">
          Política de Privacidade, seção de cookies e tecnologias de rastreamento
        </Link>
        . Qualquer mudança futura nesta lista sobe a versão deste documento (o selo no topo desta
        página), nunca entra em silêncio.
      </LegalSection>
    </LegalDocumentShell>
  );
}
