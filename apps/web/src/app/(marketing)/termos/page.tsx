import { Typography } from "@rotta/ui/web";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Termos de Uso da plataforma Rotta.",
  alternates: { canonical: "/termos" },
};

/**
 * Termos de Uso (Dossiê 35 — Prompt 25). Gap real encontrado nesta
 * auditoria: os três fluxos de cadastro (empresa/pessoal/convite, web
 * e mobile) já exigiam `aceiteTermos: true` como condição obrigatória
 * de registro (Dossiê 15/32 — validação `@Equals(true)` no backend),
 * mas esta página nunca existiu — o aceite apontava para um documento
 * inexistente. Conteúdo redigido com base no que a plataforma
 * realmente faz (auditado nesta sessão, não copiado de um modelo
 * genérico) — ainda assim, **rascunho pendente de revisão jurídica**
 * antes do lançamento público (aviso explícito abaixo, não escondido).
 */
export default function TermosPage(): JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-2">
        <Typography variant="headline" as="h1">
          Termos de Uso
        </Typography>
        <Typography variant="bodySmall" color="muted">
          Última atualização: agosto de 2026.
        </Typography>
      </div>

      <div className="rounded-md border border-warning/40 bg-warning/10 p-4">
        <Typography variant="bodySmall">
          <strong>Aviso:</strong> este documento foi redigido com base no funcionamento real da
          plataforma, mas ainda é um rascunho — precisa de revisão por um advogado antes de ser
          tratado como o texto final e vinculante dos Termos de Uso.
        </Typography>
      </div>

      <Section title="1. Quem somos">
        A Rotta é operada pela Rotta do Brasil Tecnologia e Soluções de Transportes, uma plataforma
        que conecta famílias a transportadores escolares (empresas, MEIs e motoristas autônomos) e
        fornece a essas transportadoras as ferramentas de gestão da própria operação (veículos,
        motoristas, rotas, alunos, cobrança).
      </Section>

      <Section title="2. Quem pode usar a Rotta">
        A Rotta tem duas frentes de uso, sob a mesma conta: a <strong>Área Profissional</strong>{" "}
        (transportadoras — empresas, MEIs, autônomos — que gerenciam sua operação de transporte
        escolar) e a <strong>Área Pessoal</strong> (responsáveis que buscam e contratam transporte
        para seus filhos). O cadastro como transportadora exige que a pessoa tenha capacidade legal
        para representar a empresa ou atuar como autônomo/MEI.
      </Section>

      <Section title="3. O que a Rotta é e o que ela não é">
        A Rotta é uma plataforma de intermediação e gestão — ela conecta famílias a transportadores
        e fornece as ferramentas operacionais, mas <strong>não é</strong> ela própria a
        transportadora. O contrato de prestação de serviço de transporte é firmado diretamente entre
        a família e a transportadora escolhida; a Rotta não é parte desse contrato nem responsável
        pela execução do transporte em si.
      </Section>

      <Section title="4. Cadastro e conta">
        Cada pessoa mantém uma única conta na Rotta, usada em todas as plataformas (site, painel
        web, aplicativo). As informações fornecidas no cadastro devem ser verdadeiras e mantidas
        atualizadas. A conta é pessoal e intransferível; o compartilhamento de senha com terceiros é
        de responsabilidade de quem compartilha.
      </Section>

      <Section title="5. Cobrança">
        Transportadoras (Empresa/MEI/Autônomo) pagam uma mensalidade pela plataforma. O uso pelo
        Responsável (família) é gratuito — a Rotta nunca cobra da família pelo acesso à plataforma;
        o pagamento do transporte em si (quando houver) é acordado diretamente com a transportadora.
      </Section>

      <Section title="6. Dados pessoais">
        O tratamento de dados pessoais é descrito em detalhe na nossa{" "}
        <a href="/privacidade" className="text-primary underline">
          Política de Privacidade
        </a>
        , parte integrante destes Termos.
      </Section>

      <Section title="7. Encerramento de conta">
        Você pode solicitar o encerramento da sua conta a qualquer momento pelo canal de suporte.
        Dados sujeitos a obrigação legal de retenção (ex. registros fiscais, logs de auditoria de
        segurança) podem ser mantidos mesmo após o encerramento, pelo prazo exigido por lei.
      </Section>

      <Section title="8. Alterações destes Termos">
        Podemos atualizar estes Termos para refletir mudanças na plataforma ou na legislação.
        Mudanças relevantes serão comunicadas com antecedência razoável pelos canais de contato
        cadastrados.
      </Section>

      <Section title="9. Contato">
        Dúvidas sobre estes Termos:{" "}
        <a href="mailto:contato@rotta.com.br" className="text-primary underline">
          contato@rotta.com.br
        </a>
        .
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <section className="flex flex-col gap-2">
      <Typography variant="title" as="h2">
        {title}
      </Typography>
      <Typography variant="body" color="muted">
        {children}
      </Typography>
    </section>
  );
}
