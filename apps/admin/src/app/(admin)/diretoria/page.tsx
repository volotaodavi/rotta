"use client";

import { Badge, Card, ErrorState, Spinner, Typography } from "@rotta/ui/web";

import { Escritorio } from "@/features/diretoria/components/escritorio";
import {
  ESCALA,
  JANELA,
  proximoTurno,
  situacaoDeHoje,
  type TurnoDaEscala,
} from "@/features/diretoria/escala";
import {
  LINKS_DA_DIRETORIA,
  useGovernanca,
  usePullRequestsDaDiretoria,
} from "@/features/diretoria/hooks/use-diretoria";

const NOME_DO_DIA: Record<number, string> = {
  1: "Segunda",
  2: "Terça",
  3: "Quarta",
  4: "Quinta",
  5: "Sexta",
};

const CARGO_DESCRICAO: Record<TurnoDaEscala["cargo"], string> = {
  CEO: "Prioridade da semana e estratégia",
  CTO: "Produto, código e dívida técnica",
  CMO: "Páginas públicas, mensagem e funil",
  CFO: "Caixa, preço, inadimplência e custo",
};

const MODO_EXPLICACAO: Record<string, string> = {
  NORMAL: "Turno completo, como está escrito no protocolo.",
  ECONOMIA: "Versão mínima útil: sem subagente, sem suíte completa, entrega pequena.",
  PAUSA: "Os turnos encerram na hora, sem Pull Request e sem registro.",
};

function dataCurta(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/**
 * Diretoria (Admin Geral) — a diretoria de agentes de IA da Rotta,
 * pedido do fundador em 03/10/2026 ("essa parte de diretoria deverá
 * aparecer para o admin geral apenas").
 *
 * Quatro agentes em cargos de diretoria (CEO, CTO, CMO e CFO) acordam
 * sozinhos no horário de cada um, por agendamento no servidor da
 * Anthropic, leem onde a companhia parou em `empresa/` e entregam um
 * Pull Request. Esta tela é a janela do fundador sobre isso.
 *
 * O que ela mostra é dado real, não ilustração: a escala vem do mesmo
 * calendário que os agentes obedecem (`features/diretoria/escala.ts`,
 * espelho de `empresa/CALENDARIO.md`), e o modo, as decisões, a fila e
 * as entregas vêm do repositório e da lista de Pull Requests, lidos na
 * hora. Quando uma dessas leituras falha, o bloco dela diz o motivo e
 * o resto da tela continua de pé.
 *
 * Fica fora do alcance de SUPORTE e FINANCEIRO por
 * `isAdminRouteAllowed` (que só libera os prefixos de cada sub-papel):
 * governança da companhia é assunto de Admin Geral.
 */
export default function DiretoriaPage(): JSX.Element {
  const hoje = situacaoDeHoje();
  /*
    A hora tem que ser a de Brasília, não a de quem está olhando: é
    nela que os turnos estão agendados. Calculada no render, sem
    relógio vivo, porque a tela já se atualiza sozinha
    (`query-provider.tsx`) e um cronômetro por segundo só gastaria
    bateria para mover um boneco.
  */
  const horaAgora = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  const proximo = proximoTurno();
  const governanca = useGovernanca();
  const entregas = usePullRequestsDaDiretoria();

  const modo = governanca.data?.modo ?? null;
  const emAberto = entregas.data?.filter((pr) => pr.estado === "aberto") ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Typography variant="title">Diretoria</Typography>
        <Typography variant="bodySmall" color="muted">
          Quatro agentes de IA em cargos de diretoria. Cada um acorda sozinho no horário dele, lê
          onde a companhia parou e entrega um Pull Request. Ninguém funde nada: o merge é do
          fundador.
        </Typography>
      </div>

      <Escritorio
        diaDaSemana={hoje.diaDaSemana}
        horaAgora={horaAgora}
        janela={JANELA}
        éDiaDeTrabalho={hoje.motivoDeFolga === null}
        entregas={entregas.data ?? []}
        hojeIso={hoje.iso}
      />

      {/* Hoje: a pergunta que o fundador faz ao abrir a tela. */}
      <Card>
        <Card.Body className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <Typography variant="caption" color="muted">
              Hoje, {dataCurta(hoje.iso)}
            </Typography>
            {hoje.turnos.length > 0 ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Typography variant="subtitle">
                    {hoje.turnos.map((turno) => turno.cargo).join(" e ")}
                  </Typography>
                  {hoje.turnos.map((turno) => (
                    <Badge
                      key={turno.cargo}
                      variant={turno.tipo === "plantao" ? "neutral" : "info"}
                    >
                      {turno.cargo} {turno.hora}
                      {turno.tipo === "plantao" ? ", plantão" : ""}
                    </Badge>
                  ))}
                </div>
                {hoje.turnos.map((turno) => (
                  <Typography key={turno.cargo} variant="bodySmall" color="muted">
                    {turno.cargo}: {turno.entrega}
                  </Typography>
                ))}
              </>
            ) : (
              <>
                <Typography variant="subtitle">Ninguém trabalha hoje</Typography>
                <Typography variant="bodySmall" color="muted">
                  {hoje.motivoDeFolga ?? "Hoje não tem turno na escala."}
                  {proximo
                    ? ` Próximo dia de trabalho: ${NOME_DO_DIA[proximo.turnos[0]?.diaDaSemana ?? 0] ?? ""}, com ${proximo.turnos.map((turno) => turno.cargo).join(" e ")}.`
                    : ""}
                </Typography>
              </>
            )}
          </div>
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <Typography variant="caption" color="muted">
              Janela de trabalho
            </Typography>
            <Typography variant="body">
              {JANELA.inicio} às {JANELA.limite}
            </Typography>
            <Typography variant="caption" color="muted">
              Horário de Brasília, sem fim de semana nem feriado nacional
            </Typography>
          </div>
        </Card.Body>
      </Card>

      {/* Modo e ordem do fundador: o controle que é só dele. */}
      <Card>
        <Card.Body className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Typography variant="caption" color="muted">
              Modo da companhia
            </Typography>
            {governanca.isLoading ? (
              <Spinner size="sm" />
            ) : (
              <Badge
                variant={modo === "NORMAL" ? "success" : modo === "PAUSA" ? "danger" : "warning"}
              >
                {modo ?? "não foi possível ler"}
              </Badge>
            )}
          </div>
          <Typography variant="bodySmall" color="muted">
            {modo && MODO_EXPLICACAO[modo]
              ? MODO_EXPLICACAO[modo]
              : "O modo governa o quanto a companhia gasta por turno."}{" "}
            Para mudar, edite a linha <code>MODO:</code> no topo de{" "}
            <a
              href={LINKS_DA_DIRETORIA.fundador}
              target="_blank"
              rel="noreferrer"
              className="font-semibold underline"
            >
              empresa/FUNDADOR.md
            </a>
            . Vale a partir do próximo turno.
          </Typography>
          {governanca.data?.ordemDoFundador ? (
            <div className="rounded-md border border-warning/40 bg-warning/10 p-3">
              <Typography variant="caption" className="font-semibold">
                Ordem do fundador em aberto
              </Typography>
              <Typography variant="bodySmall">{governanca.data.ordemDoFundador}</Typography>
              <Typography variant="caption" color="muted">
                O próximo diretor a acordar trata isso como a tarefa do turno, acima do backlog.
              </Typography>
            </div>
          ) : null}
        </Card.Body>
      </Card>

      {/* Escala da semana */}
      <div className="flex flex-col gap-2">
        <Typography variant="subtitle">A semana</Typography>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((dia) => {
            const doDia = ESCALA.filter((turno) => turno.diaDaSemana === dia);
            const ehHoje = hoje.diaDaSemana === dia && hoje.turnos.length > 0;
            return (
              <Card key={dia}>
                <Card.Body className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Typography variant="caption" color="muted">
                      {NOME_DO_DIA[dia]}
                    </Typography>
                    {ehHoje ? <Badge variant="info">hoje</Badge> : null}
                  </div>
                  {doDia.map((turno) => (
                    <div key={turno.cargo} className="flex flex-col">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <Typography variant="subtitle">{turno.cargo}</Typography>
                        <Typography variant="caption" color="muted">
                          {turno.hora}
                          {turno.tipo === "plantao" ? ", plantão" : ""}
                        </Typography>
                      </div>
                      <Typography variant="caption" color="muted">
                        {turno.tipo === "plantao"
                          ? "Só olha o que quebrou na mão do usuário"
                          : CARGO_DESCRICAO[turno.cargo]}
                      </Typography>
                    </div>
                  ))}
                </Card.Body>
              </Card>
            );
          })}
        </div>
        <Typography variant="caption" color="muted">
          Sábado, domingo e feriado nacional a companhia não trabalha: o turno confere a data antes
          de abrir qualquer arquivo e encerra na hora quando cai fora.{" "}
          <a
            href={LINKS_DA_DIRETORIA.calendario}
            target="_blank"
            rel="noreferrer"
            className="font-semibold underline"
          >
            Ver o calendário
          </a>
        </Typography>
      </div>

      {/* Entregas: o que saiu de cada turno */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Typography variant="subtitle">Entregas</Typography>
          {emAberto.length > 0 ? (
            <Typography variant="caption" color="muted">
              {emAberto.length} esperando o seu merge
            </Typography>
          ) : null}
        </div>
        {entregas.isLoading ? (
          <Card>
            <Card.Body className="flex justify-center py-8">
              <Spinner size="md" />
            </Card.Body>
          </Card>
        ) : entregas.isError ? (
          <Card>
            <Card.Body>
              <ErrorState
                message="Não foi possível ler a lista de Pull Requests do GitHub."
                onRetry={() => void entregas.refetch()}
              />
            </Card.Body>
          </Card>
        ) : (entregas.data?.length ?? 0) === 0 ? (
          <Card>
            <Card.Body className="flex flex-col gap-1">
              <Typography variant="body" color="muted">
                Nenhuma entrega ainda.
              </Typography>
              <Typography variant="caption" color="muted">
                Todo turno termina em Pull Request numa branch <code>empresa/&lt;cargo&gt;/</code>.
                Enquanto nenhum turno tiver rodado dentro do horário, esta lista fica vazia.
              </Typography>
            </Card.Body>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {entregas.data?.map((pr) => (
              <Card key={pr.numero}>
                <Card.Body className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="neutral">{pr.cargo}</Badge>
                      <a
                        href={pr.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold underline"
                      >
                        <Typography variant="body">{pr.titulo}</Typography>
                      </a>
                    </div>
                    <Typography variant="caption" color="muted">
                      PR #{pr.numero} · aberto em {dataCurta(pr.criadoEm)}
                    </Typography>
                  </div>
                  <Badge
                    variant={
                      pr.estado === "aberto"
                        ? "warning"
                        : pr.estado === "fundido"
                          ? "success"
                          : "neutral"
                    }
                  >
                    {pr.estado === "aberto"
                      ? "esperando você"
                      : pr.estado === "fundido"
                        ? "fundido"
                        : "fechado"}
                  </Badge>
                </Card.Body>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Log de decisões: a memória da companhia */}
      <div className="flex flex-col gap-2">
        <Typography variant="subtitle">Últimos turnos</Typography>
        {governanca.isLoading ? (
          <Card>
            <Card.Body className="flex justify-center py-8">
              <Spinner size="md" />
            </Card.Body>
          </Card>
        ) : governanca.isError ? (
          <Card>
            <Card.Body>
              <ErrorState
                message="Não foi possível ler o registro de decisões do repositório."
                onRetry={() => void governanca.refetch()}
              />
            </Card.Body>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {governanca.data?.decisoes.slice(0, 4).map((decisao) => (
              <Card key={decisao.titulo}>
                <Card.Body className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="neutral">{decisao.cargo || "diretoria"}</Badge>
                    <Typography variant="caption" color="muted">
                      {decisao.data}
                    </Typography>
                  </div>
                  {decisao.campos.slice(0, 4).map((campo) => (
                    <div key={campo.rotulo} className="flex flex-col">
                      <Typography variant="caption" color="muted">
                        {campo.rotulo}
                      </Typography>
                      <Typography variant="bodySmall">{campo.texto}</Typography>
                    </div>
                  ))}
                </Card.Body>
              </Card>
            ))}
            <Typography variant="caption" color="muted">
              <a
                href={LINKS_DA_DIRETORIA.decisoes}
                target="_blank"
                rel="noreferrer"
                className="font-semibold underline"
              >
                Ver o registro completo
              </a>
            </Typography>
          </div>
        )}
      </div>

      {/* Fila */}
      {governanca.data ? (
        <div className="flex flex-col gap-2">
          <Typography variant="subtitle">A fila</Typography>
          <Card>
            <Card.Body className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {["CEO", "CTO", "CMO", "CFO", "FUNDADOR"].map((cargo) => {
                  const quantos = governanca.data.backlog.filter(
                    (item) => item.cargo === cargo,
                  ).length;
                  if (quantos === 0) return null;
                  return (
                    <Badge key={cargo} variant={cargo === "FUNDADOR" ? "warning" : "neutral"}>
                      {cargo}: {quantos}
                    </Badge>
                  );
                })}
              </div>
              {governanca.data.backlog.some((item) => item.prioridade) ? (
                <div className="flex flex-col gap-1">
                  <Typography variant="caption" color="muted">
                    Prioridade marcada pelo CEO
                  </Typography>
                  {governanca.data.backlog
                    .filter((item) => item.prioridade)
                    .map((item) => (
                      <Typography key={item.texto} variant="bodySmall">
                        {item.cargo}: {item.texto}
                      </Typography>
                    ))}
                </div>
              ) : null}
              {governanca.data.backlog.some((item) => item.doFundador) ? (
                <div className="flex flex-col gap-1">
                  <Typography variant="caption" color="muted">
                    Só você pode fazer
                  </Typography>
                  {governanca.data.backlog
                    .filter((item) => item.doFundador)
                    .map((item) => (
                      <Typography key={item.texto} variant="bodySmall">
                        {item.texto}
                      </Typography>
                    ))}
                </div>
              ) : null}
              <Typography variant="caption" color="muted">
                <a
                  href={LINKS_DA_DIRETORIA.backlog}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold underline"
                >
                  Ver a fila inteira
                </a>
              </Typography>
            </Card.Body>
          </Card>
        </div>
      ) : null}

      {/* Onde ver trabalhando */}
      <Card>
        <Card.Body className="flex flex-col gap-2">
          <Typography variant="subtitle">Ver um turno acontecendo</Typography>
          <Typography variant="bodySmall" color="muted">
            Enquanto um turno roda, ele aparece na lista de sessões do Claude com o nome do cargo.
            Abrir a sessão mostra cada comando que o agente está dando, na hora. Ao terminar, o
            resumo chega no seu e-mail.
          </Typography>
          <div className="flex flex-wrap gap-4">
            <a
              href={LINKS_DA_DIRETORIA.sessoes}
              target="_blank"
              rel="noreferrer"
              className="font-semibold underline"
            >
              Sessões ao vivo
            </a>
            <a
              href={LINKS_DA_DIRETORIA.pulls}
              target="_blank"
              rel="noreferrer"
              className="font-semibold underline"
            >
              Pull Requests
            </a>
            <a
              href={LINKS_DA_DIRETORIA.empresa}
              target="_blank"
              rel="noreferrer"
              className="font-semibold underline"
            >
              As cartas de cargo
            </a>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
