import { Typography } from "@rotta/ui/web";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Como a Rotta trata dados pessoais — LGPD.",
  alternates: { canonical: "/privacidade" },
};

/**
 * Política de Privacidade (Dossiê 35 — Prompt 25) — conteúdo baseado
 * na auditoria de segurança/LGPD real desta sessão (Dossiê 32:
 * inventário de dado pessoal por modelo, Argon2id, RS256, buckets
 * público/privado; Dossiê 33: exportação de dados autoatendida), não
 * um texto genérico. **Rascunho pendente de revisão jurídica** — aviso
 * explícito abaixo.
 */
export default function PrivacidadePage(): JSX.Element {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <div className="flex flex-col gap-2">
        <Typography variant="headline" as="h1">
          Política de Privacidade
        </Typography>
        <Typography variant="bodySmall" color="muted">
          Última atualização: agosto de 2026.
        </Typography>
      </div>

      <div className="rounded-md border border-warning/40 bg-warning/10 p-4">
        <Typography variant="bodySmall">
          <strong>Aviso:</strong> este documento descreve com precisão o que a plataforma faz hoje
          (auditado, não copiado de um modelo genérico), mas ainda precisa de revisão jurídica antes
          de ser tratado como o texto final e vinculante da Política de Privacidade.
        </Typography>
      </div>

      <Section title="1. Quem trata seus dados">
        A Rotta do Brasil Tecnologia e Soluções de Transportes é a controladora dos dados pessoais
        tratados nesta plataforma (site, painel web, aplicativo — mesma conta em todos).
      </Section>

      <Section title="2. Quais dados coletamos">
        Nome, e-mail, telefone, CPF e senha (armazenada apenas como hash — nunca em texto legível)
        de todo usuário. De transportadoras: CNPJ/CPF, endereço, dados de veículos e motoristas,
        documentos obrigatórios (CNH, comprovantes). De alunos cadastrados por responsáveis: nome,
        data de nascimento, foto, endereço de embarque/desembarque e, quando informado, necessidades
        especiais/medicamentos. Durante uma viagem ativa, a localização do veículo é registrada para
        acompanhamento em tempo real pela família.
      </Section>

      <Section title="3. Por que coletamos">
        Para operar a intermediação entre famílias e transportadores, gerenciar a operação de
        transporte (rotas, veículos, motoristas), cumprir obrigações legais (ex. registro fiscal da
        mensalidade cobrada de transportadoras) e para segurança (documentos de motorista exigidos
        por regulamentação de transporte escolar).
      </Section>

      <Section title="4. Com quem compartilhamos">
        Provedores de infraestrutura que processam dados em nosso nome (hospedagem, banco de dados,
        armazenamento de arquivo, envio de e-mail/notificação) — nunca vendemos dado pessoal a
        terceiros. Documentos sensíveis (CNH, foto de aluno) ficam em um armazenamento privado,
        acessível só por link assinado e temporário, nunca por URL pública.
      </Section>

      <Section title="5. Como protegemos seus dados">
        Senha nunca é armazenada em texto puro (hash Argon2id). Sessões usam token assinado (JWT) de
        curta duração. Toda comunicação com a plataforma é criptografada (HTTPS). Documentos e fotos
        sensíveis (CNH, foto de aluno) ficam num armazenamento privado, nunca público. Auditamos e
        corrigimos ativamente pontos de segurança — o histórico dessas auditorias é público na
        documentação técnica do projeto.
      </Section>

      <Section title="6. Seus direitos (LGPD)">
        Você pode confirmar quais dados temos sobre você e solicitar uma cópia deles a qualquer
        momento (dentro do app/painel, em &ldquo;Meus dados&rdquo;). Para corrigir dado incorreto,
        solicitar a exclusão da sua conta, ou tirar qualquer outra dúvida sobre seus dados, fale com
        a gente pelo canal de suporte ou por{" "}
        <a href="mailto:contato@rotta.com.br" className="text-primary underline">
          contato@rotta.com.br
        </a>
        . Pedidos de exclusão são analisados individualmente — alguns dados podem precisar ser
        mantidos por período legal mesmo após o pedido (ex. registro fiscal de uma mensalidade já
        paga), e isso será sempre explicado no retorno ao pedido.
      </Section>

      <Section title="7. Por quanto tempo guardamos seus dados">
        Enquanto sua conta estiver ativa, e por um período adicional depois de encerrada quando
        exigido por lei (ex. obrigação fiscal) ou para nosso legítimo interesse de segurança
        (registro de auditoria).
      </Section>

      <Section title="8. Crianças e adolescentes">
        Dados de alunos menores de idade são cadastrados e geridos por seus responsáveis legais — a
        Rotta não permite que uma criança/adolescente crie a própria conta. Tratamos esse dado com o
        mesmo cuidado extra que a LGPD exige (art. 14).
      </Section>

      <Section title="9. Alterações desta política">
        Podemos atualizar esta política para refletir mudanças na plataforma ou na legislação.
        Mudanças relevantes serão comunicadas com antecedência pelos canais de contato cadastrados.
      </Section>

      <Section title="10. Contato">
        Dúvidas sobre privacidade e dados pessoais:{" "}
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
