import {
  ArrowRight,
  Bell,
  BookOpenCheck,
  Building2,
  CalendarClock,
  Mail,
  MapPin,
  ScrollText,
  ShieldCheck,
  Users,
} from "@rotta/icons";
import { Badge, Button, Card, Typography } from "@rotta/ui/web";
import Link from "next/link";

import type { Metadata } from "next";
import type { ComponentType } from "react";

import { HeroMapDemo } from "@/components/hero-map-demo";
import { RouteMark } from "@/components/route-mark";
import {
  COMPANY_CNPJ,
  COMPANY_FORUM,
  COMPANY_LEGAL_NAME,
  GOVERNO_CONTACT_EMAIL,
} from "@/lib/site-config";

/**
 * Landing Page `/governo` (pedido explícito do usuário: "faça a Landing
 * Page para visualização dos órgãos públicos... link com o '/governo'...
 * única e exclusivamente para a conversão de órgãos públicos no quesito
 * de contratação"). Página standalone, fora do grupo `(marketing)` de
 * propósito — não usa o header/footer do site consumidor (nav de
 * Planos/Entrar/Criar conta não faz sentido pra esse público), tem seu
 * próprio cabeçalho/rodapé minimalistas abaixo.
 *
 * Revisão 2 (pedido do usuário): tom mais direto/conversacional com o
 * gestor público, mais foco em conversão; GPS em tempo real como
 * demonstração central (não só mais um item de lista — é a primeira
 * coisa que aparece na hero); trocado o formulário multi-campo por um
 * único CTA de e-mail (`GOVERNO_CONTACT_EMAIL`) pedindo reunião — sem
 * formulário, sem backend novo, só um `mailto:` com assunto/corpo
 * pré-preenchidos. A seção "Capacidades reais" deixa explícito que é a
 * MESMA plataforma usada por transportadoras privadas — nenhuma versão
 * separada ou reduzida para o setor público, o produto inteiro (GPS,
 * verificação, comunicação, auditoria) já está pronto para atender
 * também a gestão pública do transporte escolar.
 *
 * Disciplina de honestidade (mesma de toda a Documentação Rotta, Dossiê
 * 45): a seção de métricas é um mockup de painel rotulado como exemplo
 * ilustrativo — a Rotta não tem, hoje, números de resultado publicáveis
 * de clientes do setor público. A seção de enquadramento legal cita
 * nomes reais de lei (Lei nº 14.133/2021, LC 182/2021, LGPD) só como
 * pontos de atenção que a equipe jurídica do órgão deve avaliar — nunca
 * como uma certificação que a Rotta já obteve.
 */
export const metadata: Metadata = {
  title: "Rotta para Órgãos Públicos — Transporte Escolar Público",
  description:
    "Veja onde está cada van escolar do seu município, em tempo real. A Rotta leva GPS ao vivo, verificação de motoristas e trilha de auditoria para a gestão pública do transporte escolar. Marque uma reunião.",
  alternates: { canonical: "/governo" },
  robots: { index: true, follow: true },
};

const CAPACIDADES: {
  titulo: string;
  descricao: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  {
    titulo: "GPS em tempo real",
    descricao:
      "A frota escolar se move no mapa ao vivo — a gestão acompanha cada rota, cada veículo, do início ao fim do trajeto, sem depender de ligação para saber onde o veículo está.",
    icon: MapPin,
  },
  {
    titulo: "Notificação de embarque e desembarque",
    descricao:
      "Aviso automático a cada parada — famílias e a gestão sabem na hora em que cada aluno entrou ou saiu do veículo.",
    icon: Bell,
  },
  {
    titulo: "Verificação de motoristas e veículos",
    descricao:
      "CNH, categoria de habilitação, EAR e curso especializado conferidos antes de um motorista aparecer como elegível para transporte escolar.",
    icon: ShieldCheck,
  },
  {
    titulo: "Gestão de frota num painel só",
    descricao:
      "Veículos, motoristas, rotas, escolas e alunos — sem planilha paralela, sem grupo de WhatsApp como sistema de gestão.",
    icon: Building2,
  },
  {
    titulo: "Trilha de auditoria",
    descricao:
      "Ações relevantes ficam registradas — quem verificou o quê, quando uma rota mudou, quando um motorista foi vinculado. Útil na hora de prestar contas.",
    icon: ScrollText,
  },
  {
    titulo: "Alunos e responsáveis vinculados",
    descricao:
      "Cada aluno tem um responsável vinculado à própria rota — a comunicação com a família parte de um cadastro real, não de uma lista solta.",
    icon: Users,
  },
];

/**
 * Mockup de painel de gestão pública — dados claramente rotulados como
 * exemplo (nunca resultado real de cliente, que a Rotta não tem hoje no
 * setor público). O objetivo é comunicar QUE TIPO de visão o gestor
 * público teria, não afirmar um número.
 */
const METRICAS_EXEMPLO: { label: string; valor: string }[] = [
  { label: "Veículos monitorados", valor: "58" },
  { label: "Rotas ativas hoje", valor: "34" },
  { label: "Alunos vinculados", valor: "1.240" },
  { label: "Notificações de embarque hoje", valor: "2.470" },
];

/** O que ajuda a Rotta a preparar uma reunião mais útil — reduz o atrito de escrever um e-mail do zero, sem virar um formulário de campos obrigatórios. */
const ROTEIRO_REUNIAO = [
  "Município/UF e órgão (ex.: Secretaria Municipal de Educação)",
  "Tamanho aproximado da frota escolar e nº de rotas",
  "Melhor horário para uma conversa de 20-30 minutos",
];

const REUNIAO_ASSUNTO = "Quero agendar uma reunião com a Rotta";
const REUNIAO_CORPO = [
  "Olá, equipe Rotta!",
  "",
  "Sou [nome], [cargo] em [órgão/secretaria], no município de [cidade/UF].",
  "",
  "Gostaria de agendar uma reunião para conhecer a plataforma e conversar sobre o transporte escolar público do nosso município.",
  "",
  "Frota aproximada: ",
  "Número de rotas: ",
  "Melhor horário para conversar: ",
  "",
  "Aguardo retorno!",
].join("\n");

const MAILTO_REUNIAO = `mailto:${GOVERNO_CONTACT_EMAIL}?subject=${encodeURIComponent(REUNIAO_ASSUNTO)}&body=${encodeURIComponent(REUNIAO_CORPO)}`;

export default function GovernoPage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Cabeçalho minimalista — sem nav de consumidor (Planos/Entrar/Criar conta) */}
      <header className="border-b border-white/10 bg-slate-950">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <RouteMark className="h-8 w-8" />
            <span className="text-sm font-bold tracking-wide text-white">Rotta</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="hidden text-sm font-medium text-white/70 transition-colors hover:text-white sm:block"
            >
              Voltar ao site
            </Link>
            <a href="#contato">
              <Button variant="primary" size="sm">
                Marcar uma reunião
              </Button>
            </a>
          </div>
        </div>
      </header>

      {/* Hero — GPS em tempo real como demonstração central, tom direto com o gestor público */}
      <section className="relative isolate overflow-hidden bg-slate-950">
        <div
          className="pointer-events-none absolute -left-40 -top-40 -z-10 h-[520px] w-[520px] rounded-full bg-primary/30 blur-[120px]"
          aria-hidden="true"
        />
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 pb-20 pt-16 sm:pt-20 lg:grid-cols-2">
          <div className="flex flex-col items-start gap-6 text-left">
            <Badge variant="info">Para prefeituras e secretarias de educação</Badge>
            <Typography variant="display" as="h1" className="text-white">
              Você sabe, agora, onde está cada van escolar do seu município?
            </Typography>
            <Typography variant="body" className="max-w-lg text-white/70">
              A Rotta mostra a frota escolar pública se movendo no mapa em tempo real — o mesmo GPS
              ao vivo que já roda hoje para transportadoras privadas, agora à disposição da gestão
              pública. Sem planilha, sem grupo de WhatsApp, sem ligar perguntando onde está o
              veículo.
            </Typography>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row">
              <a href={MAILTO_REUNIAO}>
                <Button variant="primary" size="lg" iconRight={<ArrowRight className="h-4 w-4" />}>
                  Marcar uma reunião
                </Button>
              </a>
              <a href="#demonstracao">
                <Button
                  variant="secondary"
                  size="lg"
                  className="bg-white/10 text-white hover:bg-white/20"
                >
                  Ver o GPS em tempo real
                </Button>
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2">
              {["LGPD", "Lei nº 14.133/2021", "LC 182/2021"].map((item) => (
                <span
                  key={item}
                  className="flex items-center gap-2 text-xs font-medium text-white/60"
                >
                  <BookOpenCheck className="h-3.5 w-3.5 text-primary" />
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div
            id="demonstracao"
            className="relative flex scroll-mt-24 justify-center pt-4 lg:justify-end lg:pt-0"
          >
            <HeroMapDemo />
          </div>
        </div>
      </section>

      {/* Métricas — mockup ilustrativo, explicitamente rotulado */}
      <section className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="mb-10 flex flex-col items-center gap-3 text-center">
          <Typography variant="headline" as="h2">
            O que a sua equipe veria no painel
          </Typography>
          <Typography variant="body" color="muted" className="max-w-2xl">
            Exemplo ilustrativo de como a gestão da frota escolar pública aparece no painel da Rotta
            — números de demonstração, não de um cliente real.
          </Typography>
        </div>
        <Card className="overflow-hidden">
          <Card.Header
            title="Painel de gestão — exemplo"
            action={<Badge variant="neutral">Dado ilustrativo</Badge>}
          />
          <Card.Body>
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              {METRICAS_EXEMPLO.map((item) => (
                <div key={item.label} className="flex flex-col gap-1">
                  <Typography variant="display" className="text-primary">
                    {item.valor}
                  </Typography>
                  <Typography variant="caption" color="muted">
                    {item.label}
                  </Typography>
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      </section>

      {/* Capacidades reais — deixa claro que é a MESMA plataforma, sem versão reduzida para o setor público */}
      <section className="w-full bg-surface px-6 py-20">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-12 flex flex-col items-center gap-3 text-center">
            <Typography variant="headline" as="h2">
              A mesma plataforma, pronta para o setor público
            </Typography>
            <Typography variant="body" color="muted" className="max-w-2xl">
              Tudo que a Rotta já oferece hoje para transportadoras privadas está disponível,
              inteiro, para a gestão pública do transporte escolar do seu município — nenhuma versão
              reduzida.
            </Typography>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CAPACIDADES.map((item) => (
              <Card key={item.titulo}>
                <Card.Body className="flex flex-col gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <Typography variant="subtitle">{item.titulo}</Typography>
                  <Typography variant="bodySmall" color="muted">
                    {item.descricao}
                  </Typography>
                </Card.Body>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Demonstração do site oficial */}
      <section className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="flex flex-col items-center gap-5 text-center">
          <Badge variant="success">Conheça a plataforma</Badge>
          <Typography variant="headline" as="h2" className="max-w-2xl">
            O mapa que você viu acima já está no ar
          </Typography>
          <Typography variant="body" color="muted" className="max-w-lg">
            O site oficial da Rotta pode ser visitado antes de qualquer conversa comercial — a mesma
            tecnologia de rastreamento em tempo real usada hoje pelas transportadoras privadas.
          </Typography>
          <Link href="/" target="_blank">
            <Button variant="secondary" size="lg" iconRight={<ArrowRight className="h-4 w-4" />}>
              Visitar o site oficial da Rotta
            </Button>
          </Link>
        </div>
      </section>

      {/* Enquadramento legal — honesto, sem certificação inventada */}
      <section className="w-full border-y border-border bg-surface px-6 py-20">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BookOpenCheck className="h-6 w-6" />
          </span>
          <Typography variant="headline" as="h2">
            Um ponto de atenção para a sua equipe jurídica
          </Typography>
          <Typography variant="body" color="muted" className="max-w-2xl">
            A contratação de tecnologia por órgãos públicos pode se relacionar com a{" "}
            <strong>Lei nº 14.133/2021</strong> (Nova Lei de Licitações e Contratos Administrativos)
            e, a depender do enquadramento da empresa contratada, com a{" "}
            <strong>Lei Complementar nº 182/2021</strong> (Marco Legal das Startups). O tratamento
            de dados pessoais de alunos e responsáveis segue a <strong>LGPD</strong> — ver a nossa{" "}
            <Link href="/legal/privacidade" className="font-semibold text-primary">
              Política de Privacidade
            </Link>
            . A Rotta não substitui a análise da equipe jurídica do seu órgão: cada modalidade de
            contratação e o enquadramento legal aplicável ao caso concreto devem ser avaliados por
            ela antes de qualquer processo formal.
          </Typography>
        </div>
      </section>

      {/* CTA final — só e-mail pedindo reunião, sem formulário */}
      <section id="contato" className="w-full bg-slate-950 px-6 py-20">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary">
            <CalendarClock className="h-6 w-6" />
          </span>
          <Typography variant="headline" as="h2" className="text-white">
            Vamos marcar uma reunião?
          </Typography>
          <Typography variant="body" className="max-w-lg text-white/70">
            Escreva para{" "}
            <a
              href={`mailto:${GOVERNO_CONTACT_EMAIL}`}
              className="font-semibold text-white underline"
            >
              {GOVERNO_CONTACT_EMAIL}
            </a>{" "}
            pedindo para agendar uma conversa — nossa equipe responde pelo mesmo canal, sem
            cadastro, sem formulário.
          </Typography>

          <a href={MAILTO_REUNIAO}>
            <Button variant="primary" size="lg" iconLeft={<Mail className="h-4 w-4" />}>
              Enviar e-mail pedindo reunião
            </Button>
          </a>

          <div className="mt-4 w-full rounded-2xl border border-white/10 bg-white/5 p-5 text-left">
            <Typography variant="bodySmall" className="font-semibold text-white/90">
              Para agilizar, vale incluir na mensagem:
            </Typography>
            <ul className="mt-3 flex flex-col gap-2">
              {ROTEIRO_REUNIAO.map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <Typography variant="bodySmall" className="text-white/70">
                    {item}
                  </Typography>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Rodapé minimalista */}
      <footer className="w-full bg-slate-950 px-6 py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
          <Typography variant="caption" className="text-white/50">
            {COMPANY_LEGAL_NAME} — CNPJ {COMPANY_CNPJ} — Foro de {COMPANY_FORUM}
          </Typography>
          <div className="flex items-center gap-4">
            <Link href="/legal" className="text-xs font-medium text-white/50 hover:text-white/80">
              Documentação legal
            </Link>
            <Link href="/" className="text-xs font-medium text-white/50 hover:text-white/80">
              rotta.com.br
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
