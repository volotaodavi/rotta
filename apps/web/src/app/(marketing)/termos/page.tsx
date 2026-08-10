import { Typography } from "@rotta/ui/web";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Termos de Uso da plataforma Rotta.",
  alternates: { canonical: "/termos" },
};

/**
 * Termos de Uso (Dossiê 35 — Prompt 25; revisado nesta sessão para
 * incluir as cláusulas que faltavam para um Termos de Uso completo sob
 * a lei brasileira — pesquisa feita antes de escrever: identificação
 * legal do prestador é exigência do CDC art. 31 e do Marco Civil da
 * Internet art. 7º; propriedade intelectual, limitação de
 * responsabilidade, rescisão bilateral e lei aplicável/foro são
 * cláusulas padrão de qualquer Termos de plataforma no Brasil — nenhuma
 * delas existia na primeira versão). Conteúdo redigido com base no que
 * a plataforma realmente faz (auditado, não copiado de um modelo
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
        A Rotta é operada pela <strong>Rotta do Brasil Tecnologia e Soluções de Transportes</strong>
        , inscrita no CNPJ sob o nº <strong>54.623.584/0001-80</strong>, doravante identificada
        apenas como &ldquo;Rotta&rdquo;. A Rotta é uma plataforma que conecta famílias a
        transportadores escolares (empresas, MEIs e motoristas autônomos) e fornece a essas
        transportadoras as ferramentas de gestão da própria operação (veículos, motoristas, rotas,
        alunos, cobrança).
      </Section>

      <Section title="2. Quem pode usar a Rotta">
        A Rotta tem duas frentes de uso, sob a mesma conta: a <strong>Área Profissional</strong>{" "}
        (transportadoras — empresas, MEIs, autônomos, motoristas e monitores — que gerenciam sua
        operação de transporte escolar) e a <strong>Área Pessoal</strong> (responsáveis que buscam e
        contratam transporte para seus filhos). O cadastro como transportadora exige que a pessoa
        tenha capacidade legal para representar a empresa ou atuar como autônomo/MEI. O uso da
        plataforma é restrito a maiores de 18 anos ou emancipados; alunos são cadastrados e geridos
        pelo próprio responsável (ver Política de Privacidade, item 8).
      </Section>

      <Section title="3. O que a Rotta é e o que ela não é">
        A Rotta é uma plataforma de intermediação e gestão — ela conecta famílias a transportadores
        e fornece as ferramentas operacionais, mas <strong>não é</strong> ela própria a
        transportadora. O contrato de prestação de serviço de transporte é firmado diretamente entre
        a família e a transportadora escolhida; a Rotta não é parte desse contrato nem responsável
        pela execução do transporte em si (condução do veículo, pontualidade, segurança durante o
        trajeto) — essa responsabilidade é da transportadora contratada.
      </Section>

      <Section title="4. Cadastro e conta">
        Cada pessoa mantém uma única conta na Rotta, usada em todas as plataformas (site, painel
        web, aplicativo). As informações fornecidas no cadastro devem ser verdadeiras e mantidas
        atualizadas. A conta é pessoal e intransferível; o compartilhamento de senha com terceiros é
        de responsabilidade de quem compartilha.
      </Section>

      <Section title="5. Conduta do usuário">
        Ao usar a Rotta, você concorda em: fornecer informações verdadeiras (inclusive documentos de
        veículo/motorista, quando aplicável); não usar a plataforma para fins ilícitos ou
        fraudulentos; não tentar acessar dados de outros usuários além do que a própria plataforma
        expõe a você; não contornar mecanismos de segurança; e manter um comportamento respeitoso em
        avaliações e contatos com outros usuários. A Rotta pode remover conteúdo (ex. avaliação
        ofensiva ou comprovadamente falsa) e suspender contas que violem estas regras, conforme o
        item 9.
      </Section>

      <Section title="6. Cobrança">
        Transportadoras (Empresa/MEI/Autônomo) pagam uma mensalidade pela plataforma. O uso pelo
        Responsável (família) é gratuito — a Rotta nunca cobra da família pelo acesso à plataforma;
        o pagamento do transporte em si (quando houver) é acordado diretamente com a transportadora.
      </Section>

      <Section title="7. Propriedade intelectual">
        A marca &ldquo;Rotta&rdquo;, o layout, o código-fonte e os demais elementos da plataforma
        são de propriedade da Rotta do Brasil Tecnologia e Soluções de Transportes ou licenciados a
        ela, protegidos pela legislação de propriedade intelectual aplicável. O uso da plataforma
        não transfere a você nenhum direito sobre esses elementos, além da licença de uso pessoal e
        não exclusiva necessária para usar o serviço. É proibido copiar, modificar, fazer engenharia
        reversa ou redistribuir qualquer parte da plataforma sem autorização.
      </Section>

      <Section title="8. Dados pessoais">
        O tratamento de dados pessoais é descrito em detalhe na nossa{" "}
        <a href="/privacidade" className="text-primary underline">
          Política de Privacidade
        </a>
        , parte integrante destes Termos.
      </Section>

      <Section title="9. Limitação de responsabilidade e encerramento de conta">
        A responsabilidade da Rotta se limita ao funcionamento e à disponibilidade da própria
        plataforma; ela não responde por indisponibilidades causadas por caso fortuito, força maior
        ou falha de provedores de infraestrutura fora do seu controle, nem pela execução do serviço
        de transporte contratado diretamente com a transportadora (item 3). Nada nesta cláusula
        exclui responsabilidade que a lei não permite excluir (ex. Código de Defesa do Consumidor,
        LGPD).
        <br />
        <br />
        Você pode solicitar o encerramento da sua conta a qualquer momento pelo canal de suporte. A
        Rotta também pode suspender ou encerrar uma conta que viole estes Termos (item 5) — sempre
        que possível, com aviso prévio, exceto em casos de fraude, risco à segurança de outros
        usuários ou exigência legal, quando a suspensão pode ser imediata. Dados sujeitos a
        obrigação legal de retenção (ex. registros fiscais, logs de auditoria de segurança) podem
        ser mantidos mesmo após o encerramento, pelo prazo exigido por lei.
      </Section>

      <Section title="10. Alterações destes Termos">
        Podemos atualizar estes Termos para refletir mudanças na plataforma ou na legislação.
        Mudanças relevantes serão comunicadas com antecedência razoável pelos canais de contato
        cadastrados.
      </Section>

      <Section title="11. Legislação aplicável e foro">
        Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da
        comarca de <strong>Maricá/RJ</strong> para dirimir quaisquer controvérsias decorrentes
        destes Termos, com renúncia a qualquer outro, por mais privilegiado que seja — ressalvada,
        quando o usuário for consumidor (Responsável), a prerrogativa de foro do seu próprio
        domicílio, prevista no Código de Defesa do Consumidor (art. 101, I).
      </Section>

      <Section title="12. Contato">
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
